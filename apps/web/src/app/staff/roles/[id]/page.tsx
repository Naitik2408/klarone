"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  clearStaffAccessToken,
  getStaffAccessToken,
} from "../../../../lib/staff-auth-api";
import {
  getStaffPermissions,
  getStaffRole,
  updateStaffRole,
  StaffManagementApiError,
} from "../../../../lib/staff-management-api";
import type {
  StaffRole,
  StaffRolePermission,
} from "../../../../types/staff-management";

export default function EditStaffRolePage() {
  const router = useRouter();
  const params = useParams();
  const roleId = Number(params.id);

  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<StaffRole | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<number>>(
    new Set(),
  );

  const [groupedPermissions, setGroupedPermissions] = useState<
    Record<string, StaffRolePermission[]>
  >({});
  const [allPermissions, setAllPermissions] = useState<StaffRolePermission[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const activeToken = getStaffAccessToken();
    if (!activeToken) {
      router.replace("/staff/login");
      return;
    }
    setToken(activeToken);

    Promise.all([
      getStaffRole(activeToken, roleId),
      getStaffPermissions(activeToken),
    ])
      .then(([roleData, permsData]) => {
        setRole(roleData);
        setName(roleData.name);
        setDescription(roleData.description || "");
        setSelectedPermissionIds(
          new Set(roleData.permissions.map((p) => p.id)),
        );
        setGroupedPermissions(permsData.grouped);
        setAllPermissions(permsData.permissions);
      })
      .catch((err) => {
        if (err instanceof StaffManagementApiError && err.status === 401) {
          clearStaffAccessToken();
          router.replace("/staff/login");
          return;
        }
        setError(
          err instanceof Error ? err.message : "Failed to load role details.",
        );
      })
      .finally(() => setLoading(false));
  }, [roleId]);

  function handlePermissionToggle(perm: StaffRolePermission) {
    setSelectedPermissionIds((prev) => {
      const next = new Set(prev);
      const isChecking = !next.has(perm.id);

      if (isChecking) {
        next.add(perm.id);

        if (perm.action !== "read") {
          const readPerm = allPermissions.find(
            (p) => p.module === perm.module && p.action === "read",
          );
          if (readPerm) {
            next.add(readPerm.id);
          }
        }

        if (perm.code === "orders.drafts.manage") {
          const ordRead = allPermissions.find((p) => p.code === "orders.read");
          const ordCreate = allPermissions.find((p) => p.code === "orders.create");
          if (ordRead) next.add(ordRead.id);
          if (ordCreate) next.add(ordCreate.id);
        }

        if (perm.code === "roles.assign") {
          const rRead = allPermissions.find((p) => p.code === "roles.read");
          if (rRead) next.add(rRead.id);
        }
      } else {
        next.delete(perm.id);

        if (perm.action === "read") {
          allPermissions
            .filter((p) => p.module === perm.module && p.action !== "read")
            .forEach((dep) => next.delete(dep.id));
        }
      }

      return next;
    });
  }

  function handleSelectAllInModule(moduleName: string) {
    const modulePerms = groupedPermissions[moduleName] || [];
    const allSelected = modulePerms.every((p) => selectedPermissionIds.has(p.id));

    setSelectedPermissionIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        modulePerms.forEach((p) => next.delete(p.id));
      } else {
        modulePerms.forEach((p) => next.add(p.id));
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !role) return;

    if (!role.isSystemRole && !name.trim()) {
      setError("Please provide a name for the role.");
      return;
    }

    if (selectedPermissionIds.size === 0) {
      setError("Please select at least one permission for this role.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const updated = await updateStaffRole(token, role.id, {
        name: !role.isSystemRole ? name.trim() : undefined,
        description: description.trim() || undefined,
        permissionIds: Array.from(selectedPermissionIds),
      });

      setRole(updated);
      setSelectedPermissionIds(new Set(updated.permissions.map((p) => p.id)));
      setSuccess("Role permissions saved successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white text-[13px] text-neutral-500">
        Loading role information...
      </div>
    );
  }

  if (!role) {
    return (
      <div className="p-8 text-center text-[13px] text-neutral-600">
        Role not found. <Link href="/staff/roles" className="text-neutral-900 underline">Back to roles</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[13px] text-[#303030]">
      <form onSubmit={handleSubmit}>
        <div className="mx-auto max-w-[1100px] px-6 pt-5 pb-12">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2">
              <Link
                href="/staff/roles"
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-[#e3e3e3] text-[#303030] shadow-xs hover:bg-[#f7f7f7]"
              >
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12.5 15 7.5 10l5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <div>
                <h1 className="text-[20px] font-semibold text-[#1a1a1a]">
                  Edit Role: {role.name.replace(/_/g, " ")}
                </h1>
                {role.isSystemRole && (
                  <span className="inline-flex items-center gap-1 mt-0.5 rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700 border border-purple-200">
                    System Predefined Role (Identifier locked)
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/staff/roles"
                className="inline-flex h-8 items-center justify-center rounded-lg border border-[#d4d4d4] bg-white px-3 text-[13px] font-medium text-[#303030] shadow-xs hover:bg-[#f7f7f7]"
              >
                Back
              </Link>

              <button
                type="submit"
                disabled={saving}
                style={{ color: "#ffffff", backgroundColor: "#1a1a1a" }}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-4 text-[13px] font-medium !text-white shadow-sm hover:!bg-[#303030] transition-colors active:!bg-[#000] disabled:opacity-50"
              >
                {saving ? "Saving changes..." : "Save changes"}
              </button>
            </div>
          </div>

          {/* Success Banner */}
          {success && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-800">
              <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{success}</span>
            </div>
          )}

          {/* Error Notice */}
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
              <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0">
                <path fillRule="evenodd" d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM9 5.75a1 1 0 0 1 2 0v4.5a1 1 0 0 1-2 0v-4.5Zm1 8.5a1.125 1.125 0 1 0 0-2.25 1.125 1.125 0 0 0 0 2.25Z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Role Details */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs mb-6">
            <h2 className="text-[14px] font-semibold text-neutral-900 mb-4">Role Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[12px] font-medium text-neutral-700 mb-1">
                  Role Name
                </label>
                <input
                  type="text"
                  required
                  disabled={role.isSystemRole}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-[13px] outline-none transition ${
                    role.isSystemRole
                      ? "border-neutral-200 bg-neutral-100 text-neutral-500 cursor-not-allowed"
                      : "border-neutral-200 bg-white text-neutral-900 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
                  }`}
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-neutral-700 mb-1">
                  Description / Purpose
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[13px] text-neutral-900 outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
                />
              </div>
            </div>
          </div>

          {/* Section: Permissions Matrix */}
          <div className="rounded-xl border border-neutral-200 bg-white shadow-xs overflow-hidden">
            <div className="border-b border-neutral-200 bg-[#f7f7f7] px-5 py-3 flex items-center justify-between">
              <div>
                <h2 className="text-[14px] font-semibold text-neutral-900">
                  Manage Granular Permissions
                </h2>
                <p className="text-[12px] text-neutral-500 mt-0.5">
                  Assigned: <strong className="text-neutral-900">{selectedPermissionIds.size}</strong> permissions
                </p>
              </div>
            </div>

            <div className="divide-y divide-neutral-200">
              {Object.entries(groupedPermissions).map(([modName, perms]) => {
                const allInModuleSelected = perms.every((p) =>
                  selectedPermissionIds.has(p.id),
                );
                const someInModuleSelected =
                  !allInModuleSelected &&
                  perms.some((p) => selectedPermissionIds.has(p.id));

                return (
                  <div key={modName} className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`mod-${modName}`}
                          checked={allInModuleSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someInModuleSelected;
                          }}
                          onChange={() => handleSelectAllInModule(modName)}
                          className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-200"
                        />
                        <label
                          htmlFor={`mod-${modName}`}
                          className="text-[13px] font-semibold uppercase tracking-wider text-neutral-800 cursor-pointer"
                        >
                          {modName}
                        </label>
                      </div>
                      <span className="text-[11px] text-neutral-400">
                        {perms.length} actions available
                      </span>
                    </div>

                    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 pl-6">
                      {perms.map((p) => {
                        const isChecked = selectedPermissionIds.has(p.id);
                        return (
                          <label
                            key={p.id}
                            className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition ${
                              isChecked
                                ? "bg-neutral-50 border-neutral-300"
                                : "border-neutral-100 hover:border-neutral-200 bg-white"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handlePermissionToggle(p)}
                              className="mt-0.5 h-3.5 w-3.5 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-200"
                            />
                            <div className="min-w-0">
                              <span className="block font-medium text-[12px] text-neutral-900">
                                {p.code}
                              </span>
                              {p.description && (
                                <span className="block text-[11px] text-neutral-500 leading-tight">
                                  {p.description}
                                </span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}