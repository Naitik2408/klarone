"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  clearStaffAccessToken,
  getStaffAccessToken,
} from "../../../lib/staff-auth-api";
import {
  deleteStaffRole,
  getStaffRoles,
  StaffManagementApiError,
} from "../../../lib/staff-management-api";
import type { StaffRole } from "../../../types/staff-management";

export default function StaffRolesListPage() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [roleToDelete, setRoleToDelete] = useState<StaffRole | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const activeToken = getStaffAccessToken();
    if (!activeToken) {
      router.replace("/staff/login");
      return;
    }
    setToken(activeToken);
    loadRoles(activeToken);
  }, []);

  async function loadRoles(t: string) {
    setLoading(true);
    setError("");
    try {
      const res = await getStaffRoles(t);
      setRoles(res.roles);
    } catch (err) {
      if (err instanceof StaffManagementApiError && err.status === 401) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }
      setError(
        err instanceof Error ? err.message : "Failed to load roles and permissions.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!token || !roleToDelete) return;
    setActionLoading(true);
    try {
      await deleteStaffRole(token, roleToDelete.id);
      setRoleToDelete(null);
      await loadRoles(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete role.");
    } finally {
      setActionLoading(false);
    }
  }

  const filteredRoles = roles.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      (r.description && r.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-white text-[13px] text-[#303030]">
      <div className="mx-auto max-w-[1300px] px-6 pt-5 pb-4">
        {/* Top Bar / Header */}
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
                <path d="M10 2a4 4 0 0 0-4 4c0 2 1.5 3.5 3 3.9V13H7v3h2v2h2v-2h2v-3h-2V9.9c1.5-.4 3-1.9 3-3.9a4 4 0 0 0-4-4Z" />
              </svg>
            </span>
            <h1 className="text-[20px] font-semibold text-[#1a1a1a]">
              Roles & Permissions
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/staff/users"
              className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d4d4d4] bg-white px-3 text-[13px] font-medium text-[#303030] shadow-xs hover:bg-[#f7f7f7]"
            >
              Staff Members
            </Link>

            <button
              type="button"
              onClick={() => router.push("/staff/roles/new")}
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
                Create custom role
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

        {/* Search bar */}
        <div className="flex items-stretch gap-0 rounded-xl border border-neutral-200 bg-white">
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
              placeholder="Search roles by title or description..."
              className="h-full w-full bg-transparent py-2.5 pr-3 pl-9 text-[13px] text-neutral-800 outline-none placeholder:text-neutral-500"
            />
          </div>

          <div className="flex items-center gap-2 border-l border-neutral-200 px-3 py-2">
            <button
              type="button"
              onClick={() => token && void loadRoles(token)}
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

        {/* Roles Table */}
        <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <div className="overflow-x-auto">
            <div className="min-w-[960px]">
              {/* Header */}
              <div className="grid grid-cols-[minmax(220px,2fr)_minmax(260px,2.5fr)_minmax(120px,1fr)_minmax(120px,1fr)_100px] items-center gap-3 border-b border-neutral-200 bg-[#f7f7f7] px-4 py-2.5 text-[12px] font-medium text-neutral-600">
                <div>Role Name</div>
                <div>Description & Scope</div>
                <div>Assigned Staff</div>
                <div>System Type</div>
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
                    Loading roles...
                  </div>
                </div>
              ) : filteredRoles.length === 0 ? (
                <div className="py-12 text-center text-[13px] text-neutral-500">
                  No roles match your search.
                </div>
              ) : (
                <div className="divide-y divide-neutral-200">
                  {filteredRoles.map((r) => {
                    return (
                      <div
                        key={r.id}
                        className="grid grid-cols-[minmax(220px,2fr)_minmax(260px,2.5fr)_minmax(120px,1fr)_minmax(120px,1fr)_100px] items-center gap-3 px-4 py-3 hover:bg-[#f7f7f7] transition-colors"
                      >
                        {/* Name */}
                        <div className="min-w-0">
                          <Link
                            href={`/staff/roles/${r.id}`}
                            className="font-medium text-neutral-900 hover:underline block truncate"
                          >
                            {r.name.replace(/_/g, " ")}
                          </Link>
                          <span className="text-[11px] font-mono text-neutral-400 block truncate">
                            {r.name}
                          </span>
                        </div>

                        {/* Description */}
                        <div className="min-w-0">
                          <span className="text-[12px] text-neutral-600 line-clamp-2">
                            {r.description || "No description provided."}
                          </span>
                        </div>

                        {/* Assigned Staff */}
                        <div>
                          <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-700 border border-neutral-200">
                            {r.userCount ?? 0} staff member{r.userCount === 1 ? "" : "s"}
                          </span>
                        </div>

                        {/* System Type */}
                        <div>
                          {r.isSystemRole ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700 border border-purple-200">
                              System Predefined
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200">
                              Custom Role
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/staff/roles/${r.id}`}
                            className="inline-flex h-7 items-center justify-center rounded-md border border-[#d4d4d4] bg-white px-2.5 text-[12px] font-medium text-neutral-700 shadow-2xs hover:bg-[#f7f7f7]"
                          >
                            Edit
                          </Link>
                          {!r.isSystemRole && (
                            <button
                              type="button"
                              onClick={() => setRoleToDelete(r)}
                              className="inline-flex h-7 items-center justify-center rounded-md border border-red-200 bg-white px-2 text-[12px] font-medium text-red-700 shadow-2xs hover:bg-red-50"
                            >
                              Delete
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
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {roleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-2xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-neutral-200">
            <h3 className="text-base font-semibold text-[#1a1a1a]">Delete Custom Role</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-neutral-600">
              Are you sure you want to delete the role <strong className="text-neutral-900">{roleToDelete.name}</strong>?
              {roleToDelete.userCount && roleToDelete.userCount > 0 ? (
                <span className="block mt-2 font-medium text-red-600">
                  Note: This role has {roleToDelete.userCount} active staff member(s) assigned. You must reassign them to another role before deleting.
                </span>
              ) : (
                " This action cannot be undone."
              )}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRoleToDelete(null)}
                disabled={actionLoading}
                className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d4d4d4] bg-white px-3 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={actionLoading || (roleToDelete.userCount ? roleToDelete.userCount > 0 : false)}
                className="inline-flex h-8 items-center justify-center rounded-lg bg-red-600 px-3.5 text-[13px] font-medium text-white shadow-xs hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? "Deleting..." : "Delete Role"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}