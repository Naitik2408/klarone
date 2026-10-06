$ErrorActionPreference = 'Stop'

$root = (Get-Location).Path
$ordersDir = Join-Path $root 'apps\api\src\modules\orders'
$webSrc = Join-Path $root 'apps\web\src'

if (-not (Test-Path $ordersDir)) { throw "Orders module not found: $ordersDir" }
if (-not (Test-Path $webSrc)) { throw "Web source not found: $webSrc" }

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'

function Backup-Once([string]$path) {
  if (Test-Path $path) {
    Copy-Item $path "$path.bak-$timestamp" -Force
    Write-Host "Backup: $path.bak-$timestamp" -ForegroundColor DarkGray
  }
}

function Write-Utf8([string]$path, [string]$content) {
  $dir = Split-Path $path -Parent
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  [System.IO.File]::WriteAllText(
    [System.IO.Path]::GetFullPath($path),
    $content,
    (New-Object System.Text.UTF8Encoding($false))
  )
}

# -----------------------------------------------------------------------------
# API: staff DTO
# -----------------------------------------------------------------------------
$dtoPath = Join-Path $ordersDir 'staff-orders.dto.ts'
if (-not (Test-Path $dtoPath)) {
  Write-Utf8 $dtoPath @'
export interface StaffOrderListParams {
  search?: string;
  status?: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
  page?: number;
  pageSize?: number;
}

export interface UpdateStaffOrderStatusInput {
  status: string;
  notes?: string;
}
'@
}

# -----------------------------------------------------------------------------
# API: staff controller
# -----------------------------------------------------------------------------
$controllerPath = Join-Path $ordersDir 'staff-orders.controller.ts'
if (-not (Test-Path $controllerPath)) {
  Write-Utf8 $controllerPath @'
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";

import { CurrentStaff } from "../staff-auth/decorators/current-staff.decorator";
import { RequirePermission } from "../staff-auth/decorators/require-permission.decorator";
import { StaffPermissionGuard } from "../staff-auth/guards/permission.guard";
import { StaffAuthGuard } from "../staff-auth/guards/staff-auth.guard";
import type { AuthenticatedStaff } from "../staff-auth/staff-auth.types";
import type { UpdateStaffOrderStatusInput } from "./staff-orders.dto";
import { OrdersService } from "./orders.service";

@Controller("staff/orders")
@UseGuards(StaffAuthGuard, StaffPermissionGuard)
export class StaffOrdersController {
  constructor(
    private readonly ordersService: OrdersService,
  ) {}

  @Get()
  @RequirePermission("orders.read")
  async listOrders(
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("paymentStatus") paymentStatus?: string,
    @Query("fulfillmentStatus") fulfillmentStatus?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.ordersService.listStaffOrders({
      search,
      status,
      paymentStatus,
      fulfillmentStatus,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(":orderNumber")
  @RequirePermission("orders.read")
  async getOrder(
    @Param("orderNumber") orderNumber: string,
  ) {
    return this.ordersService.getStaffOrder(orderNumber);
  }

  @Post(":orderNumber/status")
  @RequirePermission("orders.update")
  async updateStatus(
    @Param("orderNumber") orderNumber: string,
    @Body() body: UpdateStaffOrderStatusInput,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    if (!body || typeof body.status !== "string") {
      throw new BadRequestException("Order status is required.");
    }

    return this.ordersService.updateStaffOrderStatus(
      orderNumber,
      body,
      staff.userAccountId,
    );
  }
}
'@
}

# -----------------------------------------------------------------------------
# API: extend existing OrdersService without touching customer methods
# -----------------------------------------------------------------------------
$servicePath = Join-Path $ordersDir 'orders.service.ts'
if (-not (Test-Path $servicePath)) { throw "OrdersService not found: $servicePath" }
$service = Get-Content $servicePath -Raw

if ($service -notmatch 'BadRequestException') {
  $service = $service.Replace(
    'import {
  Injectable,
  NotFoundException,
} from "@nestjs/common";',
    'import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";'
  )
}

if ($service -notmatch 'async listStaffOrders\(') {
  Backup-Once $servicePath
  $methods = @'

  async listStaffOrders(params: {
    search?: string;
    status?: string;
    paymentStatus?: string;
    fulfillmentStatus?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(params.page ?? 1, 1);
    const pageSize = Math.min(
      Math.max(params.pageSize ?? 20, 1),
      100,
    );

    const search = params.search?.trim();
    const status = params.status?.trim().toUpperCase();
    const paymentStatus = params.paymentStatus?.trim().toUpperCase();
    const fulfillmentStatus = params.fulfillmentStatus?.trim().toUpperCase();

    const where = {
      ...(status ? { status } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),
      ...(fulfillmentStatus ? { fulfillmentStatus } : {}),
      ...(search
        ? {
            OR: [
              {
                orderNumber: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                customer: {
                  person: {
                    firstName: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                },
              },
              {
                customer: {
                  person: {
                    lastName: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                },
              },
              {
                customer: {
                  person: {
                    email: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                },
              },
              {
                customer: {
                  person: {
                    phone: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: [
          { createdAt: "desc" },
          { id: "desc" },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          fulfillmentStatus: true,
          totalAmount: true,
          currency: true,
          createdAt: true,
          placedAt: true,
          customer: {
            select: {
              id: true,
              customerCode: true,
              person: {
                select: {
                  firstName: true,
                  middleName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
          _count: {
            select: {
              items: true,
            },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders: orders.map((order) =>
        this.serializeOrder(order),
      ),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getStaffOrder(orderNumber: string) {
    const normalizedOrderNumber = orderNumber.trim();

    if (!normalizedOrderNumber) {
      throw new NotFoundException("Order not found");
    }

    const order = await this.prisma.order.findUnique({
      where: {
        orderNumber: normalizedOrderNumber,
      },
      include: {
        customer: {
          select: {
            id: true,
            customerCode: true,
            person: {
              select: {
                firstName: true,
                middleName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        billingAddress: true,
        shippingAddress: true,
        items: {
          orderBy: { id: "asc" },
          select: {
            id: true,
            productVariantId: true,
            productName: true,
            sku: true,
            quantity: true,
            unitPrice: true,
            discountAmount: true,
            taxAmount: true,
            totalAmount: true,
            productVariant: {
              select: {
                id: true,
                variantName: true,
                ramGb: true,
                storageGb: true,
                operatingSystem: true,
                currency: true,
                product: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    brand: {
                      select: {
                        id: true,
                        name: true,
                        slug: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        payments: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            provider: true,
            providerOrderId: true,
            providerPaymentId: true,
            paymentMethod: true,
            amount: true,
            currency: true,
            status: true,
            paidAt: true,
            createdAt: true,
          },
        },
        statusHistory: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            oldStatus: true,
            newStatus: true,
            notes: true,
            createdAt: true,
            changedBy: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
        shipments: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            carrier: true,
            trackingNumber: true,
            status: true,
            shippedAt: true,
            deliveredAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        refunds: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            paymentId: true,
            amount: true,
            reason: true,
            providerRefundId: true,
            status: true,
            createdAt: true,
            completedAt: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    return {
      order: this.serializeOrder(order),
    };
  }

  async updateStaffOrderStatus(
    orderNumber: string,
    input: {
      status: string;
      notes?: string;
    },
    changedByUserId: bigint,
  ) {
    const normalizedOrderNumber = orderNumber.trim();
    const nextStatus = input.status.trim().toUpperCase();
    const notes = input.notes?.trim() || null;

    if (!normalizedOrderNumber) {
      throw new NotFoundException("Order not found");
    }

    if (!nextStatus) {
      throw new BadRequestException("Order status is required.");
    }

    if (nextStatus.length > 40) {
      throw new BadRequestException("Order status is too long.");
    }

    if (notes && notes.length > 500) {
      throw new BadRequestException("Order notes cannot exceed 500 characters.");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({
        where: { orderNumber: normalizedOrderNumber },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          fulfillmentStatus: true,
          totalAmount: true,
          currency: true,
        },
      });

      if (!current) {
        throw new NotFoundException("Order not found");
      }

      if (current.status === nextStatus) {
        throw new BadRequestException(
          `Order is already ${nextStatus}.`,
        );
      }

      const order = await tx.order.update({
        where: { id: current.id },
        data: {
          status: nextStatus,
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          fulfillmentStatus: true,
          totalAmount: true,
          currency: true,
          updatedAt: true,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: current.id,
          oldStatus: current.status,
          newStatus: nextStatus,
          changedByUserId,
          notes,
        },
      });

      return order;
    });

    return {
      order: this.serializeOrder(updated),
    };
  }
'@

  $marker = '  private serializeOrder('
  if ($service -notmatch [regex]::Escape($marker)) {
    throw "Could not find serializeOrder() insertion point in orders.service.ts"
  }

  $service = $service.Replace($marker, $methods + "`r`n" + $marker)
  Write-Utf8 $servicePath $service
}

# -----------------------------------------------------------------------------
# API: OrdersModule — keep customer controller and add staff controller
# -----------------------------------------------------------------------------
$modulePath = Join-Path $ordersDir 'orders.module.ts'
if (-not (Test-Path $modulePath)) { throw "OrdersModule not found: $modulePath" }
$module = Get-Content $modulePath -Raw
Backup-Once $modulePath

if ($module -notmatch 'StaffOrdersController') {
  $module = $module.Replace(
    'import { OrdersController } from "./orders.controller";',
    "import { OrdersController } from ""./orders.controller"";`r`nimport { StaffOrdersController } from ""./staff-orders.controller"";"
  )
  $module = $module.Replace(
    'controllers: [OrdersController],',
    'controllers: [OrdersController, StaffOrdersController],'
  )
  if ($module -notmatch 'StaffOrdersController') {
    throw "Could not update orders.module.ts controllers list."
  }
  Write-Utf8 $modulePath $module
}

# -----------------------------------------------------------------------------
# WEB: types
# -----------------------------------------------------------------------------
$typesPath = Join-Path $webSrc 'types\staff-orders.ts'
if (-not (Test-Path $typesPath)) {
  Write-Utf8 $typesPath @'
export type StaffOrderCustomer = {
  id: string;
  customerCode: string;
  person: {
    firstName: string;
    middleName: string | null;
    lastName: string;
    email: string | null;
    phone: string | null;
  };
};

export type StaffOrderListItem = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  totalAmount: string;
  currency: string;
  createdAt: string;
  placedAt: string | null;
  customer: StaffOrderCustomer;
  _count: {
    items: number;
  };
};

export type StaffOrderAddress = {
  id: string;
  addressType: string;
  recipientName: string | null;
  phone: string | null;
  addressLine1: string;
  addressLine2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type StaffOrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  subtotal: string;
  discountAmount: string;
  shippingAmount: string;
  taxAmount: string;
  totalAmount: string;
  currency: string;
  billingAddressId: string | null;
  shippingAddressId: string | null;
  placedAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer: StaffOrderCustomer;
  billingAddress: StaffOrderAddress | null;
  shippingAddress: StaffOrderAddress | null;
  items: Array<{
    id: string;
    productVariantId: string | null;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: string;
    discountAmount: string;
    taxAmount: string;
    totalAmount: string;
    productVariant: {
      id: string;
      variantName: string | null;
      ramGb: number | null;
      storageGb: number | null;
      operatingSystem: string | null;
      currency: string;
      product: {
        id: string;
        name: string;
        slug: string;
        brand: {
          id: number;
          name: string;
          slug: string;
        } | null;
      } | null;
    } | null;
  }>;
  payments: Array<{
    id: string;
    provider: string;
    providerOrderId: string | null;
    providerPaymentId: string | null;
    paymentMethod: string | null;
    amount: string;
    currency: string;
    status: string;
    paidAt: string | null;
    createdAt: string;
  }>;
  statusHistory: Array<{
    id: string;
    oldStatus: string | null;
    newStatus: string;
    notes: string | null;
    createdAt: string;
    changedBy: {
      id: string;
      email: string | null;
    } | null;
  }>;
  shipments: Array<{
    id: string;
    carrier: string | null;
    trackingNumber: string | null;
    status: string;
    shippedAt: string | null;
    deliveredAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  refunds: Array<{
    id: string;
    paymentId: string;
    amount: string;
    reason: string | null;
    providerRefundId: string | null;
    status: string;
    createdAt: string;
    completedAt: string | null;
  }>;
};

export type StaffOrdersResponse = {
  orders: StaffOrderListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};
'@
}

# -----------------------------------------------------------------------------
# WEB: API helper
# -----------------------------------------------------------------------------
$apiPath = Join-Path $webSrc 'lib\staff-orders-api.ts'
if (-not (Test-Path $apiPath)) {
  Write-Utf8 $apiPath @'
import type {
  StaffOrderDetail,
  StaffOrdersResponse,
} from "../types/staff-orders";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:3000";

export class StaffOrdersApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "StaffOrdersApiError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  token: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options?.headers ?? {}),
      },
    },
  );

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof body?.message === "string"
        ? body.message
        : "Unable to complete the order request.";

    throw new StaffOrdersApiError(
      message,
      response.status,
    );
  }

  return body as T;
}

export async function getStaffOrders(
  token: string,
  params: {
    search?: string;
    status?: string;
    paymentStatus?: string;
    fulfillmentStatus?: string;
    page?: number;
    pageSize?: number;
  } = {},
) {
  const query = new URLSearchParams();

  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }
  if (params.status) {
    query.set("status", params.status);
  }
  if (params.paymentStatus) {
    query.set("paymentStatus", params.paymentStatus);
  }
  if (params.fulfillmentStatus) {
    query.set("fulfillmentStatus", params.fulfillmentStatus);
  }
  if (params.page) {
    query.set("page", String(params.page));
  }
  if (params.pageSize) {
    query.set("pageSize", String(params.pageSize));
  }

  const suffix = query.toString();
  return request<StaffOrdersResponse>(
    `/staff/orders${suffix ? `?${suffix}` : ""}`,
    token,
  );
}

export async function getStaffOrder(
  token: string,
  orderNumber: string,
) {
  return request<{ order: StaffOrderDetail }>(
    `/staff/orders/${encodeURIComponent(orderNumber)}`,
    token,
  );
}

export async function updateStaffOrderStatus(
  token: string,
  orderNumber: string,
  input: { status: string; notes?: string },
) {
  return request<{ order: StaffOrderDetail }>(
    `/staff/orders/${encodeURIComponent(orderNumber)}/status`,
    token,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}
'@
}

# -----------------------------------------------------------------------------
# WEB: orders list page
# -----------------------------------------------------------------------------
$listDir = Join-Path $webSrc 'app\staff\orders'
$listPath = Join-Path $listDir 'page.tsx'
if (-not (Test-Path $listPath)) {
  Write-Utf8 $listPath @'
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearStaffAccessToken,
  getStaffAccessToken,
} from "../../../lib/staff-auth-api";
import {
  getStaffOrders,
  StaffOrdersApiError,
} from "../../../lib/staff-orders-api";
import type { StaffOrderListItem } from "../../../types/staff-orders";

const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

const PAYMENT_STATUSES = [
  "PENDING",
  "PAID",
  "FAILED",
];

const FULFILLMENT_STATUSES = [
  "UNFULFILLED",
  "PARTIALLY_FULFILLED",
  "FULFILLED",
];

function money(value: string, currency: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function customerName(order: StaffOrderListItem) {
  return [
    order.customer.person.firstName,
    order.customer.person.middleName,
    order.customer.person.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim() || "Unnamed customer";
}

function dateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function badgeClass(value: string) {
  if (["PAID", "DELIVERED", "FULFILLED"].includes(value)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (["FAILED", "CANCELLED"].includes(value)) {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default function StaffOrdersPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [orders, setOrders] = useState<StaffOrderListItem[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [fulfillmentStatus, setFulfillmentStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(activeToken: string, currentPage: number) {
    try {
      setLoading(true);
      setError("");
      const result = await getStaffOrders(activeToken, {
        search,
        status,
        paymentStatus,
        fulfillmentStatus,
        page: currentPage,
        pageSize: 20,
      });
      setOrders(result.orders);
      setTotal(result.pagination.total);
      setTotalPages(Math.max(result.pagination.totalPages, 1));
    } catch (caught) {
      if (caught instanceof StaffOrdersApiError && caught.status === 401) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load orders.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const activeToken = getStaffAccessToken();
    if (!activeToken) {
      router.replace("/staff/login");
      return;
    }
    setToken(activeToken);
    void load(activeToken, 1);
    // Initial auth/load only. Filters are submitted explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  function submitFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setPage(1);
    void load(token, 1);
  }

  function changePage(nextPage: number) {
    if (!token || nextPage < 1 || nextPage > totalPages) return;
    setPage(nextPage);
    void load(token, nextPage);
  }

  function logout() {
    clearStaffAccessToken();
    router.replace("/staff/login");
  }

  return (
    <main className="min-h-screen bg-[#f6f6f3] text-neutral-950">
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-neutral-400">
              KLARONE STAFF
            </p>
            <h1 className="mt-1 text-2xl font-semibold">Orders</h1>
            <p className="mt-1 text-sm text-neutral-500">
              View customer orders and manage their order status.
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {error ? (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <form
          onSubmit={submitFilters}
          className="mb-6 rounded-2xl border border-black/10 bg-white p-5"
        >
          <div className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search order number, name, email or phone"
              className="rounded-xl border border-black/10 px-4 py-3 text-sm outline-none focus:border-black/30"
            />
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-xl border border-black/10 px-3 py-3 text-sm"
            >
              <option value="">All order status</option>
              {ORDER_STATUSES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <select
              value={paymentStatus}
              onChange={(event) => setPaymentStatus(event.target.value)}
              className="rounded-xl border border-black/10 px-3 py-3 text-sm"
            >
              <option value="">All payment status</option>
              {PAYMENT_STATUSES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <select
              value={fulfillmentStatus}
              onChange={(event) => setFulfillmentStatus(event.target.value)}
              className="rounded-xl border border-black/10 px-3 py-3 text-sm"
            >
              <option value="">All fulfillment status</option>
              {FULFILLMENT_STATUSES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-xl bg-black px-5 py-3 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Search
            </button>
          </div>
        </form>

        <div className="mb-4 flex items-center justify-between text-sm text-neutral-500">
          <span>{total} order{total === 1 ? "" : "s"}</span>
          <span>Page {page} of {totalPages}</span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-black/10 bg-neutral-50">
                <tr>
                  <th className="px-5 py-4 font-medium">Order</th>
                  <th className="px-5 py-4 font-medium">Customer</th>
                  <th className="px-5 py-4 font-medium">Items</th>
                  <th className="px-5 py-4 font-medium">Total</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 font-medium">Payment</th>
                  <th className="px-5 py-4 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-neutral-500">Loading orders…</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-neutral-500">No orders found.</td></tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="border-b border-black/5 last:border-b-0 hover:bg-neutral-50">
                      <td className="px-5 py-4">
                        <Link href={`/staff/orders/${encodeURIComponent(order.orderNumber)}`} className="font-semibold hover:underline">
                          {order.orderNumber}
                        </Link>
                        <div className="mt-1 text-xs text-neutral-400">{order.customer.customerCode}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div>{customerName(order)}</div>
                        <div className="mt-1 text-xs text-neutral-400">{order.customer.person.email || order.customer.person.phone || "—"}</div>
                      </td>
                      <td className="px-5 py-4">{order._count.items}</td>
                      <td className="px-5 py-4 font-medium">{money(order.totalAmount, order.currency)}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClass(order.status)}`}>{order.status}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClass(order.paymentStatus)}`}>{order.paymentStatus}</span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-neutral-500">{dateTime(order.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-black/10 px-5 py-4">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => changePage(page - 1)}
              className="rounded-xl border border-black/10 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => changePage(page + 1)}
              className="rounded-xl border border-black/10 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
'@
}

# -----------------------------------------------------------------------------
# WEB: order detail page
# -----------------------------------------------------------------------------
$detailDir = Join-Path $listDir '[orderNumber]'
$detailPath = Join-Path $detailDir 'page.tsx'
if (-not (Test-Path $detailPath)) {
  Write-Utf8 $detailPath @'
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  clearStaffAccessToken,
  getStaffAccessToken,
} from "../../../../lib/staff-auth-api";
import {
  getStaffOrder,
  StaffOrdersApiError,
  updateStaffOrderStatus,
} from "../../../../lib/staff-orders-api";
import type { StaffOrderDetail } from "../../../../types/staff-orders";

const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

function money(value: string, currency: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function fullName(order: StaffOrderDetail) {
  return [
    order.customer.person.firstName,
    order.customer.person.middleName,
    order.customer.person.lastName,
  ].filter(Boolean).join(" ").trim() || "Unnamed customer";
}

function dateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function addressText(address: StaffOrderDetail["shippingAddress"]) {
  if (!address) return "No address saved";
  return [
    address.recipientName,
    address.addressLine1,
    address.addressLine2,
    address.landmark,
    `${address.city}, ${address.state} ${address.postalCode}`,
    address.country,
  ].filter(Boolean).join(", ");
}

export default function StaffOrderDetailPage() {
  const router = useRouter();
  const params = useParams<{ orderNumber: string }>();
  const orderNumber = decodeURIComponent(params.orderNumber);

  const [token, setToken] = useState<string | null>(null);
  const [order, setOrder] = useState<StaffOrderDetail | null>(null);
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load(activeToken: string) {
    try {
      setLoading(true);
      setError("");
      const result = await getStaffOrder(activeToken, orderNumber);
      setOrder(result.order);
      setStatus(result.order.status);
    } catch (caught) {
      if (caught instanceof StaffOrdersApiError && caught.status === 401) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load order.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const activeToken = getStaffAccessToken();
    if (!activeToken) {
      router.replace("/staff/login");
      return;
    }
    setToken(activeToken);
    void load(activeToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, orderNumber]);

  async function saveStatus(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !order) return;

    if (status === order.status) {
      setError("Choose a different order status first.");
      return;
    }

    const confirmed = window.confirm(
      `Change ${order.orderNumber} from ${order.status} to ${status}?`,
    );
    if (!confirmed) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");
      await updateStaffOrderStatus(token, order.orderNumber, {
        status,
        notes,
      });
      await load(token);
      setNotes("");
      setSuccess("Order status updated successfully.");
    } catch (caught) {
      if (caught instanceof StaffOrdersApiError && caught.status === 401) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to update order status.",
      );
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    clearStaffAccessToken();
    router.replace("/staff/login");
  }

  if (loading) {
    return <main className="min-h-screen bg-[#f6f6f3] p-8"><div className="mx-auto max-w-7xl rounded-2xl border border-black/10 bg-white p-8">Loading order…</div></main>;
  }

  if (!order) {
    return <main className="min-h-screen bg-[#f6f6f3] p-8"><div className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-8 text-red-800">{error || "Order not found."}</div></main>;
  }

  return (
    <main className="min-h-screen bg-[#f6f6f3] text-neutral-950">
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-neutral-400">KLARONE STAFF</p>
            <h1 className="mt-1 text-2xl font-semibold">Order {order.orderNumber}</h1>
            <p className="mt-1 text-sm text-neutral-500">Created {dateTime(order.createdAt)}</p>
          </div>
          <div className="flex gap-3">
            <Link href="/staff/orders" className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50">Back to orders</Link>
            <button type="button" onClick={logout} className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50">Logout</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div> : null}
        {success ? <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</div> : null}

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-black/10 bg-white p-6">
              <div className="grid gap-5 sm:grid-cols-3">
                <div><p className="text-xs text-neutral-400">Order status</p><p className="mt-1 font-semibold">{order.status}</p></div>
                <div><p className="text-xs text-neutral-400">Payment</p><p className="mt-1 font-semibold">{order.paymentStatus}</p></div>
                <div><p className="text-xs text-neutral-400">Fulfillment</p><p className="mt-1 font-semibold">{order.fulfillmentStatus}</p></div>
              </div>
            </section>

            <section className="rounded-2xl border border-black/10 bg-white p-6">
              <h2 className="text-lg font-semibold">Customer</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div><p className="text-xs text-neutral-400">Name</p><p className="mt-1">{fullName(order)}</p></div>
                <div><p className="text-xs text-neutral-400">Customer code</p><p className="mt-1">{order.customer.customerCode}</p></div>
                <div><p className="text-xs text-neutral-400">Email</p><p className="mt-1">{order.customer.person.email || "—"}</p></div>
                <div><p className="text-xs text-neutral-400">Phone</p><p className="mt-1">{order.customer.person.phone || "—"}</p></div>
              </div>
              <div className="mt-5 border-t border-black/10 pt-5">
                <p className="text-xs text-neutral-400">Shipping address</p>
                <p className="mt-1 max-w-2xl text-sm leading-6">{addressText(order.shippingAddress)}</p>
              </div>
            </section>

            <section className="rounded-2xl border border-black/10 bg-white p-6">
              <h2 className="text-lg font-semibold">Items</h2>
              <div className="mt-4 divide-y divide-black/10">
                {order.items.map((item) => (
                  <div key={item.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto]">
                    <div>
                      <p className="font-medium">{item.productName}</p>
                      <p className="mt-1 text-xs text-neutral-500">SKU: {item.sku} · Qty: {item.quantity}</p>
                      {item.productVariant?.variantName ? <p className="mt-1 text-xs text-neutral-400">{item.productVariant.variantName}</p> : null}
                    </div>
                    <div className="text-right font-medium">{money(item.totalAmount, item.productVariant?.currency || order.currency)}</div>
                  </div>
                ))}
              </div>
              <div className="mt-5 border-t border-black/10 pt-5 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-neutral-500">Subtotal</span><span>{money(order.subtotal, order.currency)}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Discount</span><span>-{money(order.discountAmount, order.currency)}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Shipping</span><span>{money(order.shippingAmount, order.currency)}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Tax</span><span>{money(order.taxAmount, order.currency)}</span></div>
                <div className="flex justify-between border-t border-black/10 pt-3 text-base font-semibold"><span>Total</span><span>{money(order.totalAmount, order.currency)}</span></div>
              </div>
            </section>

            <section className="rounded-2xl border border-black/10 bg-white p-6">
              <h2 className="text-lg font-semibold">Status history</h2>
              <div className="mt-4 space-y-4">
                {order.statusHistory.map((entry) => (
                  <div key={entry.id} className="border-l-2 border-black/10 pl-4">
                    <p className="font-medium">{entry.oldStatus || "Created"} → {entry.newStatus}</p>
                    <p className="mt-1 text-xs text-neutral-400">{dateTime(entry.createdAt)}{entry.changedBy?.email ? ` · ${entry.changedBy.email}` : ""}</p>
                    {entry.notes ? <p className="mt-2 text-sm text-neutral-600">{entry.notes}</p> : null}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-black/10 bg-white p-6">
              <h2 className="text-lg font-semibold">Update order status</h2>
              <p className="mt-1 text-sm text-neutral-500">This changes the order status and records a status-history entry.</p>
              <form onSubmit={saveStatus} className="mt-5 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">New status</span>
                  <select value={status} onChange={(event) => setStatus(event.target.value)} className="w-full rounded-xl border border-black/10 px-3 py-3 text-sm">
                    {ORDER_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Notes (optional)</span>
                  <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} rows={4} placeholder="Why was the status changed?" className="w-full rounded-xl border border-black/10 px-3 py-3 text-sm outline-none focus:border-black/30" />
                </label>
                <button type="submit" disabled={saving || status === order.status} className="w-full rounded-xl bg-black px-4 py-3 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40">
                  {saving ? "Updating…" : "Update status"}
                </button>
              </form>
            </section>

            <section className="rounded-2xl border border-black/10 bg-white p-6">
              <h2 className="text-lg font-semibold">Payments</h2>
              <div className="mt-4 space-y-4">
                {order.payments.length === 0 ? <p className="text-sm text-neutral-500">No payment records.</p> : order.payments.map((payment) => (
                  <div key={payment.id} className="rounded-xl border border-black/10 p-4 text-sm">
                    <div className="flex justify-between gap-4"><span className="font-medium">{payment.paymentMethod || payment.provider}</span><span className="font-medium">{money(payment.amount, payment.currency)}</span></div>
                    <div className="mt-2 text-xs text-neutral-500">Status: {payment.status}</div>
                    {payment.providerPaymentId ? <div className="mt-1 break-all text-xs text-neutral-400">Payment ID: {payment.providerPaymentId}</div> : null}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-black/10 bg-white p-6">
              <h2 className="text-lg font-semibold">Fulfillment records</h2>
              <div className="mt-4 space-y-3">
                {order.shipments.length === 0 ? <p className="text-sm text-neutral-500">No shipment records yet.</p> : order.shipments.map((shipment) => (
                  <div key={shipment.id} className="rounded-xl border border-black/10 p-4 text-sm">
                    <div className="font-medium">{shipment.carrier || "Shipment"}</div>
                    <div className="mt-1 text-xs text-neutral-500">{shipment.status}</div>
                    {shipment.trackingNumber ? <div className="mt-1 text-xs text-neutral-400">{shipment.trackingNumber}</div> : null}
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
'@
}

Write-Host "" 
Write-Host "Staff Orders V1 files are ready." -ForegroundColor Green
Write-Host "Run the API build next:" -ForegroundColor Cyan
Write-Host "  pnpm --filter api build" -ForegroundColor White
Write-Host "Then, if that passes, run:" -ForegroundColor Cyan
Write-Host "  pnpm --filter web build" -ForegroundColor White
