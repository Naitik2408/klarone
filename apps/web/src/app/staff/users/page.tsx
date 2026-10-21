"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  clearStaffAccessToken,
  getStaffAccessToken,
} from "../../../lib/staff-auth-api";
import {
  deleteStaffMember,
  getStaffList,
  getStaffRoles,
  StaffManagementApiError,
} from "../../../lib/staff-management-api";
import type {
  StaffMember,
  StaffRole,
} from "../../../types/staff-management";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Status" },
  { value: "ACTIVE", label: "Active" },
  { value: "DISABLED", label: "Disabled" },
] as const;

export default function StaffUsersListPage() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [roles, setRoles] = useState<StaffRole[]>([]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState("ALL");
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [memberToDisable, setMemberToDisable] = useState<StaffMember | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const activeToken = getStaffAccessToken();
    if (!activeToken) {
      router.replace("/staff/login");
      return;
    }
    setToken(activeToken);

    getStaffRoles(activeToken)
      .then((res) => setRoles(res.roles))
      .catch(() => {});

    loadStaff(activeToken, 1, search, selectedRole, status);
  }, []);

  // Close menus on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-status-filter]")) {
        setStatusMenuOpen(false);
      }
      if (!target.closest("[data-role-filter]")) {
        setRoleMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function loadStaff(
    t: string,
    p: number,
    s: string,
    r: string,
    st: string,
  ) {
    setLoading(true);
    setError("");
    try {
      const res = await getStaffList(t, {
        page: p,
        pageSize: 15,
        search: s || undefined,
        roleId: r !== "ALL" ? Number(r) : undefined,
        status: st !== "ALL" ? st : undefined,
      });

      setStaff(res.items);
      setPage(res.pagination.page);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
    } catch (err) {
      if (err instanceof StaffManagementApiError && err.status === 401) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }
      setError(
        err instanceof Error ? err.message : "Failed to load staff accounts.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && token) {
      loadStaff(token, 1, search, selectedRole, status);
    }
  }

  function selectStatus(nextStatus: string) {
    setStatusMenuOpen(false);
    setStatus(nextStatus);
    if (token) loadStaff(token, 1, search, selectedRole, nextStatus);
  }

  function selectRole(nextRole: string) {
    setRoleMenuOpen(false);
    setSelectedRole(nextRole);
    if (token) loadStaff(token, 1, search, nextRole, status);
  }

  async function handleDisableConfirm() {
    if (!token || !memberToDisable) return;
    setActionLoading(true);
    try {
      await deleteStaffMember(token, memberToDisable.id);
      setMemberToDisable(null);
      await loadStaff(token, page, search, selectedRole, status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable staff account.");
    } finally {
      setActionLoading(false);
    }
  }

  const activeStatusLabel =
    STATUS_OPTIONS.find((s) => s.value === status)?.label ?? "All Status";

  const activeRoleLabel =
    selectedRole === "ALL"
      ? "All Roles"
      : roles.find((r) => String(r.id) === selectedRole)?.name.replace(/_/g, " ") ?? "All Roles";

  return (
    <div className="min-h-screen bg-white text-[13px] text-[#303030]">
      <div className="mx-auto max-w-[1300px] px-6 pt-5 pb-4">
        {/* -------------------- Top Bar / Header -------------------- */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-[#e3e3e3] text-[#303030] shadow-xs">
              <svg
                width="16"
                height="16"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <path d="M13.5 17c.5-2 2.2-3.5 4.5-3.5M2 17c.7-3 3.3-5 6.5-5s5.8 2 6.5 5" strokeLinecap="round" />
                <circle cx="8.5" cy="7" r="3" />
                <circle cx="15.5" cy="8" r="2" />
              </svg>
            </span>
            <h1 className="text-[20px] font-semibold text-[#1a1a1a]">
              Staff Members
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/staff/roles"
              className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d4d4d4] bg-white px-3 text-[13px] font-medium text-[#303030] shadow-xs hover:bg-[#f7f7f7]"
            >
              Roles & Permissions
            </Link>

            <button
              type="button"
              onClick={() => router.push("/staff/users/new")}
              style={{ color: "#ffffff", backgroundColor: "#1a1a1a" }}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-4 text-[13px] font-medium !text-white shadow-sm hover:!bg-[#303030] transition-colors active:!bg-[#000]"
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5">
                <path
                  d="M8 3v10M3 8h10"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              <span className="!text-white" style={{ color: "#ffffff" }}>
                Add staff member
              </span>
            </button>
          </div>
        </div>

        {/* Error Notice */}
        {error ? (
          <div
            className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700"
            role="alert"
          >
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM9 5.75a1 1 0 0 1 2 0v4.5a1 1 0 0 1-2 0v-4.5Zm1 8.5a1.125 1.125 0 1 0 0-2.25 1.125 1.125 0 0 0 0 2.25Z"
                clipRule="evenodd"
              />
            </svg>
            <span>{error}</span>
          </div>
        ) : null}

        {/* Search + filter bar */}
        <div className="flex items-stretch gap-0 rounded-xl border border-neutral-200 bg-white">
          {/* Status Dropdown Filter */}
          <div className="relative" data-status-filter>
            <button
              type="button"
              onClick={() => {
                setStatusMenuOpen((open) => !open);
                setRoleMenuOpen(false);
              }}
              aria-haspopup="listbox"
              aria-expanded={statusMenuOpen}
              className="flex h-full items-center gap-1 border-r border-neutral-200 px-3 text-[13px] text-neutral-700 hover:bg-neutral-50"
            >
              <span className="font-medium">{activeStatusLabel}</span>
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className="h-3.5 w-3.5 text-neutral-500"
                aria-hidden="true"
              >
                <path
                  d="m5 7 3-3 3 3M5 9l3 3 3-3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {statusMenuOpen && (
              <div
                role="listbox"
                className="absolute top-full left-0 z-50 mt-1 w-36 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => selectStatus(opt.value)}
                    className={`flex w-full items-center px-3 py-1.5 text-left text-[13px] hover:bg-neutral-100 ${
                      status === opt.value
                        ? "font-semibold text-neutral-900 bg-neutral-50"
                        : "text-neutral-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Role Dropdown Filter */}
          <div className="relative" data-role-filter>
            <button
              type="button"
              onClick={() => {
                setRoleMenuOpen((open) => !open);
                setStatusMenuOpen(false);
              }}
              aria-haspopup="listbox"
              aria-expanded={roleMenuOpen}
              className="flex h-full items-center gap-1 border-r border-neutral-200 px-3 text-[13px] text-neutral-700 hover:bg-neutral-50"
            >
              <span className="font-medium">{activeRoleLabel}</span>
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className="h-3.5 w-3.5 text-neutral-500"
                aria-hidden="true"
              >
                <path
                  d="m5 7 3-3 3 3M5 9l3 3 3-3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {roleMenuOpen && (
              <div
                role="listbox"
                className="absolute top-full left-0 z-50 mt-1 w-48 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg max-h-60 overflow-y-auto"
              >
                <button
                  type="button"
                  onClick={() => selectRole("ALL")}
                  className={`flex w-full items-center px-3 py-1.5 text-left text-[13px] hover:bg-neutral-100 ${
                    selectedRole === "ALL"
                      ? "font-semibold text-neutral-900 bg-neutral-50"
                      : "text-neutral-700"
                  }`}
                >
                  All Roles
                </button>
                {roles.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => selectRole(String(r.id))}
                    className={`flex w-full items-center px-3 py-1.5 text-left text-[13px] hover:bg-neutral-100 ${
                      selectedRole === String(r.id)
                        ? "font-semibold text-neutral-900 bg-neutral-50"
                        : "text-neutral-700"
                    }`}
                  >
                    {r.name.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search Input */}
          <div className="relative flex-1">
            <svg
              viewBox="0 0 16 16"
              fill="none"
              className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500"
              aria-hidden="true"
            >
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="m10.5 10.5 3 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search by name, email, employee code, or department..."
              className="h-full w-full bg-transparent py-2.5 pr-3 pl-9 text-[13px] text-neutral-800 outline-none placeholder:text-neutral-500"
            />
          </div>

          {/* Refresh Action */}
          <div className="flex items-center gap-2 border-l border-neutral-200 px-3 py-2">
            <button
              type="button"
              onClick={() => token && void loadStaff(token, 1, search, selectedRole, status)}
              disabled={loading}
              aria-label="Refresh"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
            >
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path
                  d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 3v3h-3"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <div className="overflow-x-auto">
            <div className="min-w-[960px]">
              {/* Header row */}
              <div className="grid grid-cols-[minmax(260px,2.5fr)_minmax(120px,1fr)_minmax(180px,1.4fr)_minmax(200px,1.5fr)_minmax(110px,0.9fr)_80px] items-center gap-3 border-b border-neutral-200 bg-[#f7f7f7] px-4 py-2.5 text-[12px] font-medium text-neutral-600">
                <div>Staff Member</div>
                <div>Employee Code</div>
                <div>Department & Title</div>
                <div>Assigned Roles</div>
                <div>Status</div>
                <div className="text-right">Actions</div>
              </div>

              {/* Rows */}
              {loading ? (
                <div className="flex items-center justify-center py-12 text-[13px] text-neutral-500">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin text-neutral-600" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Loading staff members...
                  </div>
                </div>
              ) : staff.length === 0 ? (
                <div className="py-12 text-center text-[13px] text-neutral-500">
                  No staff members match the current filter.
                </div>
              ) : (
                <div className="divide-y divide-neutral-200">
                  {staff.map((m) => {
                    const isSuper = m.roles.some((r) => r.name === "SUPER_ADMIN");
                    return (
                      <div
                        key={m.id}
                        className="grid grid-cols-[minmax(260px,2.5fr)_minmax(120px,1fr)_minmax(180px,1.4fr)_minmax(200px,1.5fr)_minmax(110px,0.9fr)_80px] items-center gap-3 px-4 py-3 hover:bg-[#f7f7f7] transition-colors"
                      >
                        {/* Member */}
                        <div className="min-w-0">
                          <Link
                            href={`/staff/users/${m.id}`}
                            className="font-medium text-neutral-900 hover:underline block truncate"
                          >
                            {m.name}
                          </Link>
                          <span className="text-[12px] text-neutral-500 block truncate">
                            {m.email}
                          </span>
                        </div>

                        {/* Code */}
                        <div className="font-mono text-[12px] text-neutral-700">
                          {m.employeeCode || "—"}
                        </div>

                        {/* Department & Title */}
                        <div className="min-w-0">
                          <span className="font-medium text-neutral-900 block truncate">
                            {m.department || "Operations"}
                          </span>
                          <span className="text-[12px] text-neutral-500 block truncate">
                            {m.jobTitle || "Staff"}
                          </span>
                        </div>

                        {/* Roles */}
                        <div className="flex flex-wrap gap-1">
                          {m.roles.length === 0 ? (
                            <span className="text-[12px] text-neutral-400">No role</span>
                          ) : (
                            m.roles.map((r) => (
                              <span
                                key={r.id}
                                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${
                                  r.name === "SUPER_ADMIN"
                                    ? "bg-purple-50 text-purple-700 border border-purple-200"
                                    : "bg-neutral-100 text-neutral-700 border border-neutral-200"
                                }`}
                              >
                                {r.name.replace(/_/g, " ")}
                              </span>
                            ))
                          )}
                        </div>

                        {/* Status */}
                        <div>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                              m.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "bg-neutral-100 text-neutral-600 border border-neutral-200"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                m.status === "ACTIVE" ? "bg-emerald-600" : "bg-neutral-400"
                              }`}
                            />
                            {m.status}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/staff/users/${m.id}`}
                            className="inline-flex h-7 items-center justify-center rounded-md border border-[#d4d4d4] bg-white px-2.5 text-[12px] font-medium text-neutral-700 shadow-2xs hover:bg-[#f7f7f7]"
                          >
                            Edit
                          </Link>
                          {m.status === "ACTIVE" && !isSuper && (
                            <button
                              type="button"
                              onClick={() => setMemberToDisable(m)}
                              className="inline-flex h-7 items-center justify-center rounded-md border border-red-200 bg-white px-2 text-[12px] font-medium text-red-700 shadow-2xs hover:bg-red-50"
                            >
                              Disable
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-2.5 text-[12px] text-neutral-500">
              <div>
                Showing {staff.length} of {total} staff members
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => token && loadStaff(token, page - 1, search, selectedRole, status)}
                  className="inline-flex h-7 items-center justify-center rounded-md border border-neutral-200 px-2.5 text-[12px] font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="px-2 font-medium text-neutral-800">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => token && loadStaff(token, page + 1, search, selectedRole, status)}
                  className="inline-flex h-7 items-center justify-center rounded-md border border-neutral-200 px-2.5 text-[12px] font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal to Disable Staff */}
      {memberToDisable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-2xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-neutral-200">
            <h3 className="text-base font-semibold text-[#1a1a1a]">Disable Staff Account</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-neutral-600">
              Are you sure you want to disable <strong className="text-neutral-900">{memberToDisable.name}</strong> ({memberToDisable.employeeCode})? They will lose access to the staff portal immediately.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMemberToDisable(null)}
                disabled={actionLoading}
                className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d4d4d4] bg-white px-3 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDisableConfirm}
                disabled={actionLoading}
                className="inline-flex h-8 items-center justify-center rounded-lg bg-red-600 px-3.5 text-[13px] font-medium text-white shadow-xs hover:bg-red-700 disabled:opacity-60"
              >
                {actionLoading ? "Disabling..." : "Disable Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}