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

const STATUS_FILTERS = [
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
  const [selectedRole, setSelectedRole] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

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

    loadStaff(activeToken, 1, search, selectedRole, selectedStatus);
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

  function handleFilterApply() {
    if (!token) return;
    loadStaff(token, 1, search, selectedRole, selectedStatus);
  }

  async function handleDisableConfirm() {
    if (!token || !memberToDisable) return;
    setActionLoading(true);
    try {
      await deleteStaffMember(token, memberToDisable.id);
      setMemberToDisable(null);
      await loadStaff(token, page, search, selectedRole, selectedStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable staff account.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f1f1f1] text-[#303030]">
      {/* Top Banner / Breadcrumb Bar */}
      <div className="border-b border-[#e1e3e5] bg-white px-6 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#616161]">
              <Link href="/staff" className="hover:underline">Home</Link>
              <span>/</span>
              <span className="font-medium text-[#303030]">Staff Management</span>
            </div>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-[#1a1a1a]">
              Staff & Team Members
            </h1>
            <p className="mt-0.5 text-xs text-[#616161]">
              Manage internal team access, department assignments, and security roles.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/staff/users/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#008060] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#006e52] active:scale-95"
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M10 4v12M4 10h12" strokeLinecap="round" />
              </svg>
              Add Staff Member
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800">
            {error}
          </div>
        )}

        {/* Roles Metric / Overview Cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <div className="rounded-xl border border-[#e1e3e5] bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#616161]">Total Staff</span>
            <p className="mt-1 text-2xl font-bold text-[#1a1a1a]">{total}</p>
          </div>
          <div className="rounded-xl border border-[#e1e3e5] bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#616161]">Pre-built Roles</span>
            <p className="mt-1 text-2xl font-bold text-[#1a1a1a]">{roles.length}</p>
          </div>
          <div className="rounded-xl border border-[#e1e3e5] bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#616161]">Super Admins</span>
            <p className="mt-1 text-2xl font-bold text-[#008060]">
              {roles.find((r) => r.name === "SUPER_ADMIN")?.userCount ?? 1}
            </p>
          </div>
          <div className="rounded-xl border border-[#e1e3e5] bg-white p-4 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#616161]">Specialists</span>
            <p className="mt-1 text-2xl font-bold text-indigo-600">
              {roles.filter((r) => r.name !== "SUPER_ADMIN").reduce((acc, r) => acc + (r.userCount ?? 0), 0)}
            </p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="rounded-t-xl border border-[#e1e3e5] border-b-0 bg-white p-3.5">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <svg
                width="14"
                height="14"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8c9196]"
              >
                <circle cx="8.5" cy="8.5" r="5.5" />
                <path d="m13 13 4 4" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, email, employee code, or title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFilterApply()}
                className="w-full rounded-lg border border-[#c9cccf] bg-[#fdfdfd] py-1.5 pl-9 pr-3 text-xs text-[#303030] placeholder:text-[#8c9196] focus:border-[#008060] focus:bg-white focus:outline-none"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex items-center gap-2">
              <select
                value={selectedRole}
                onChange={(e) => {
                  setSelectedRole(e.target.value);
                  if (token) loadStaff(token, 1, search, e.target.value, selectedStatus);
                }}
                className="rounded-lg border border-[#c9cccf] bg-white px-2.5 py-1.5 text-xs text-[#303030] focus:border-[#008060] focus:outline-none"
              >
                <option value="ALL">All Roles</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name.replace(/_/g, " ")}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  if (token) loadStaff(token, 1, search, selectedRole, e.target.value);
                }}
                className="rounded-lg border border-[#c9cccf] bg-white px-2.5 py-1.5 text-xs text-[#303030] focus:border-[#008060] focus:outline-none"
              >
                {STATUS_FILTERS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleFilterApply}
                className="rounded-lg border border-[#c9cccf] bg-white px-3 py-1.5 text-xs font-semibold text-[#303030] transition hover:bg-[#f6f6f7]"
              >
                Filter
              </button>
            </div>
          </div>
        </div>

        {/* Staff Table */}
        <div className="overflow-x-auto rounded-b-xl border border-[#e1e3e5] bg-white shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#e1e3e5] bg-[#fafbfb] text-[11px] font-semibold uppercase tracking-wider text-[#616161]">
                <th className="px-4 py-3">Staff Member</th>
                <th className="px-4 py-3">Code / ID</th>
                <th className="px-4 py-3">Department & Title</th>
                <th className="px-4 py-3">Assigned Roles</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e1e3e5]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-xs text-[#616161]">
                    <div className="inline-flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#008060] border-t-transparent" />
                      Loading staff accounts...
                    </div>
                  </td>
                </tr>
              ) : staff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-xs text-[#616161]">
                    No staff members match the current filter.
                  </td>
                </tr>
              ) : (
                staff.map((m) => {
                  const isSuper = m.roles.some((r) => r.name === "SUPER_ADMIN");
                  return (
                    <tr key={m.id} className="transition hover:bg-[#f9fafb]">
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/staff/users/${m.id}`}
                          className="group block"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e3e5e7] text-xs font-bold text-[#303030]">
                              {m.firstName.charAt(0)}
                              {m.lastName ? m.lastName.charAt(0) : ""}
                            </div>
                            <div>
                              <p className="font-semibold text-[#1a1a1a] group-hover:text-[#008060]">
                                {m.name}
                              </p>
                              <p className="text-[11px] text-[#616161]">{m.email}</p>
                            </div>
                          </div>
                        </Link>
                      </td>

                      <td className="px-4 py-3.5 font-mono text-[11px] text-[#303030]">
                        {m.employeeCode || "—"}
                      </td>

                      <td className="px-4 py-3.5">
                        <p className="font-medium text-[#303030]">{m.department || "Operations"}</p>
                        <p className="text-[11px] text-[#616161]">{m.jobTitle || "Staff"}</p>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {m.roles.length === 0 ? (
                            <span className="text-[11px] text-[#8c9196]">No role</span>
                          ) : (
                            m.roles.map((r) => (
                              <span
                                key={r.id}
                                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                                  r.name === "SUPER_ADMIN"
                                    ? "bg-purple-100 text-purple-800 border border-purple-200"
                                    : "bg-stone-100 text-stone-800 border border-stone-200"
                                }`}
                              >
                                {r.name.replace(/_/g, " ")}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                            m.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-800"
                              : "bg-stone-100 text-stone-600"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              m.status === "ACTIVE" ? "bg-emerald-600" : "bg-stone-400"
                            }`}
                          />
                          {m.status}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            href={`/staff/users/${m.id}`}
                            className="rounded-md border border-[#c9cccf] bg-white px-2.5 py-1 text-[11px] font-medium text-[#303030] transition hover:bg-[#f6f6f7]"
                          >
                            Edit
                          </Link>
                          {m.status === "ACTIVE" && !isSuper && (
                            <button
                              type="button"
                              onClick={() => setMemberToDisable(m)}
                              className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-[11px] font-medium text-red-700 transition hover:bg-red-50"
                            >
                              Disable
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#e1e3e5] px-4 py-3 text-xs text-[#616161]">
              <span>Page {page} of {totalPages} ({total} total staff)</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => token && loadStaff(token, page - 1, search, selectedRole, selectedStatus)}
                  className="rounded-md border border-[#c9cccf] bg-white px-2.5 py-1 font-medium disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => token && loadStaff(token, page + 1, search, selectedRole, selectedStatus)}
                  className="rounded-md border border-[#c9cccf] bg-white px-2.5 py-1 font-medium disabled:opacity-50"
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
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-[#1a1a1a]">Disable Staff Account</h3>
            <p className="mt-2 text-xs leading-relaxed text-[#616161]">
              Are you sure you want to disable <strong className="text-[#303030]">{memberToDisable.name}</strong> ({memberToDisable.employeeCode})? They will lose access to the staff portal immediately.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMemberToDisable(null)}
                disabled={actionLoading}
                className="rounded-lg border border-[#c9cccf] bg-white px-3 py-1.5 text-xs font-semibold text-[#303030] hover:bg-[#f6f6f7]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDisableConfirm}
                disabled={actionLoading}
                className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-red-700 disabled:opacity-60"
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
