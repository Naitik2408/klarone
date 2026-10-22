"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  clearStaffAccessToken,
  getStaffAccessToken,
} from "../../../../lib/staff-auth-api";
import {
  deleteStaffMember,
  getStaffMember,
  getStaffRoles,
  StaffManagementApiError,
  updateStaffMember,
} from "../../../../lib/staff-management-api";
import type {
  StaffMember,
  StaffRole,
} from "../../../../types/staff-management";

const PRESET_DEPARTMENTS = [
  "Catalogue & Inventory",
  "Fulfillment & Orders",
  "Service & Repairs",
  "Customer Support",
  "Finance & Operations",
  "Administration",
];

export default function StaffMemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const staffId = params.id as string;

  const [token, setToken] = useState<string | null>(null);
  const [member, setMember] = useState<StaffMember | null>(null);
  const [roles, setRoles] = useState<StaffRole[]>([]);

  // Form Fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [department, setDepartment] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [newPassword, setNewPassword] = useState("");
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showDisableModal, setShowDisableModal] = useState(false);

  useEffect(() => {
    const activeToken = getStaffAccessToken();
    if (!activeToken) {
      router.replace("/staff/login");
      return;
    }
    setToken(activeToken);

    Promise.all([
      getStaffMember(activeToken, staffId),
      getStaffRoles(activeToken),
    ])
      .then(([m, r]) => {
        setMember(m);
        setRoles(r.roles);

        // Populate fields
        setFirstName(m.firstName);
        setLastName(m.lastName || "");
        setPhone(m.phone || "");
        setEmployeeCode(m.employeeCode);
        setDepartment(m.department || "Administration");
        setJobTitle(m.jobTitle || "Staff");
        setStatus(m.status);
        setSelectedRoleIds(m.roles.map((ro) => ro.id));
      })
      .catch((err) => {
        if (err instanceof StaffManagementApiError && err.status === 401) {
          clearStaffAccessToken();
          router.replace("/staff/login");
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load staff details.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [staffId]);

  function toggleRole(id: number) {
    setSelectedRoleIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    setSaving(true);
    setError("");
    setSuccessMsg("");

    try {
      const updated = await updateStaffMember(token, staffId, {
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        phone: phone.trim() || undefined,
        employeeCode: employeeCode.trim() || undefined,
        department: department.trim() || undefined,
        jobTitle: jobTitle.trim() || undefined,
        status,
        roleIds: selectedRoleIds,
        password: newPassword.trim() || undefined,
      });

      setMember(updated);
      setNewPassword("");
      setSuccessMsg("Staff member updated successfully.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update staff member.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDisableConfirm() {
    if (!token) return;
    setSaving(true);
    try {
      await deleteStaffMember(token, staffId);
      setShowDisableModal(false);
      setStatus("DISABLED");
      setSuccessMsg("Staff member disabled.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable account.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-[#616161]">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#008060] border-t-transparent" />
        <span className="ml-2">Loading staff profile...</span>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="p-8 text-center text-xs text-[#616161]">
        Staff member not found. <Link href="/staff/users" className="underline">Back to staff list</Link>
      </div>
    );
  }

  const isSuperAdmin = member.roles.some((r) => r.name === "SUPER_ADMIN");

  return (
    <div className="min-h-screen bg-[#f1f1f1] text-[#303030]">
      {/* Top Banner Bar */}
      <div className="border-b border-[#e1e3e5] bg-white px-6 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#616161]">
              <Link href="/staff" className="hover:underline">Home</Link>
              <span>/</span>
              <Link href="/staff/users" className="hover:underline">Staff</Link>
              <span>/</span>
              <span className="font-medium text-[#303030]">{member.name}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-[#1a1a1a]">
                {member.name}
              </h1>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  member.status === "ACTIVE"
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-stone-100 text-stone-600"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    member.status === "ACTIVE" ? "bg-emerald-600" : "bg-stone-400"
                  }`}
                />
                {member.status}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/staff/users"
              className="rounded-lg border border-[#c9cccf] bg-white px-3 py-1.5 text-xs font-semibold text-[#303030] hover:bg-[#f6f6f7]"
            >
              Back
            </Link>
            {member.status === "ACTIVE" && !isSuperAdmin && (
              <button
                type="button"
                onClick={() => setShowDisableModal(true)}
                className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
              >
                Disable
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#008060] px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#006e52] disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Form Body */}
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Card: Basic Identity */}
          <div className="rounded-xl border border-[#e1e3e5] bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#1a1a1a]">Profile Details</h2>
                <p className="mt-0.5 text-xs text-[#616161]">
                  Personal name and contact credentials.
                </p>
              </div>
              <span className="font-mono text-xs text-[#616161]">
                ID: {member.id}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-[#303030]">First Name</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#c9cccf] bg-[#fdfdfd] px-3 py-2 text-xs text-[#303030] focus:border-[#008060] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#303030]">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#c9cccf] bg-[#fdfdfd] px-3 py-2 text-xs text-[#303030] focus:border-[#008060] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#303030]">Login Email</label>
                <input
                  type="email"
                  disabled
                  value={member.email}
                  className="mt-1 w-full rounded-lg border border-[#e1e3e5] bg-[#f6f6f7] px-3 py-2 text-xs text-[#616161] cursor-not-allowed"
                />
                <p className="mt-1 text-[11px] text-[#616161]">
                  Login email is locked for security integrity.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#303030]">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#c9cccf] bg-[#fdfdfd] px-3 py-2 text-xs text-[#303030] focus:border-[#008060] focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Card: Role & Permissions Assignment */}
          <div className="rounded-xl border border-[#e1e3e5] bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#1a1a1a]">Assigned Roles & Privileges</h2>
                <p className="mt-0.5 text-xs text-[#616161]">
                  Determine what actions this staff member can perform in the portal.
                </p>
              </div>
              <span className="text-xs font-semibold text-[#008060]">
                {selectedRoleIds.length} Role(s) Active
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {roles.map((r) => {
                const selected = selectedRoleIds.includes(r.id);
                const isSuper = r.name === "SUPER_ADMIN";
                return (
                  <div
                    key={r.id}
                    onClick={() => toggleRole(r.id)}
                    className={`cursor-pointer rounded-xl border p-3.5 transition ${
                      selected
                        ? isSuper
                          ? "border-purple-300 bg-purple-50/60"
                          : "border-[#008060] bg-emerald-50/40"
                        : "border-[#e1e3e5] bg-[#fafbfb] hover:border-[#c9cccf]"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-[#1a1a1a]">
                          {r.name.replace(/_/g, " ")}
                        </h4>
                        <p className="mt-1 text-[11px] leading-relaxed text-[#616161]">
                          {r.description || "Operational role"}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleRole(r.id)}
                        className="mt-0.5 h-4 w-4 rounded accent-[#008060]"
                      />
                    </div>
                    <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-[#616161]">
                      <span className="rounded bg-white px-1.5 py-0.5 font-medium border border-stone-200">
                        {r.permissions?.length ?? 0} Permissions
                      </span>
                      {isSuper && (
                        <span className="rounded bg-purple-100 px-1.5 py-0.5 font-semibold text-purple-800">
                          Full Platform Access
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Resolved Active Permissions Summary */}
            <div className="mt-5 border-t border-[#e1e3e5] pt-4">
              <span className="text-xs font-semibold text-[#303030]">
                Granted Permissions ({member.permissions.length}):
              </span>
              <div className="mt-2 flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                {member.permissions.map((p) => (
                  <span
                    key={p.code}
                    className="rounded bg-[#f1f2f4] px-2 py-0.5 font-mono text-[10px] text-[#303030]"
                  >
                    {p.code}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Card: Organizational & Security Placement */}
          <div className="rounded-xl border border-[#e1e3e5] bg-white p-5 shadow-2xs">
            <h2 className="text-sm font-bold text-[#1a1a1a]">Organization & Credentials</h2>
            <p className="mt-0.5 text-xs text-[#616161]">
              Department alignment, employee code, account status, and password resets.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-[#303030]">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#c9cccf] bg-[#fdfdfd] px-3 py-2 text-xs text-[#303030] focus:border-[#008060] focus:bg-white focus:outline-none"
                >
                  {PRESET_DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#303030]">Job Title</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#c9cccf] bg-[#fdfdfd] px-3 py-2 text-xs text-[#303030] focus:border-[#008060] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#303030]">Employee Code</label>
                <input
                  type="text"
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
                  className="mt-1 w-full rounded-lg border border-[#c9cccf] bg-[#fdfdfd] px-3 py-2 font-mono text-xs text-[#303030] focus:border-[#008060] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#303030]">Account Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#c9cccf] bg-[#fdfdfd] px-3 py-2 text-xs text-[#303030] focus:border-[#008060] focus:bg-white focus:outline-none"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="DISABLED">DISABLED</option>
                </select>
              </div>

              <div className="sm:col-span-2 border-t border-[#e1e3e5] pt-4">
                <label className="block text-xs font-semibold text-[#303030]">
                  Reset Password <span className="text-[11px] font-normal text-[#616161]">(leave blank to keep unchanged)</span>
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new 8+ character password..."
                  className="mt-1 w-full sm:max-w-md rounded-lg border border-[#c9cccf] bg-[#fdfdfd] px-3 py-2 font-mono text-xs text-[#303030] focus:border-[#008060] focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Confirmation Modal */}
      {showDisableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-2xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-[#1a1a1a]">Disable Staff Account</h3>
            <p className="mt-2 text-xs leading-relaxed text-[#616161]">
              Are you sure you want to disable <strong className="text-[#303030]">{member.name}</strong>? They will be locked out of the staff admin portal immediately.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDisableModal(false)}
                disabled={saving}
                className="rounded-lg border border-[#c9cccf] bg-white px-3 py-1.5 text-xs font-semibold text-[#303030] hover:bg-[#f6f6f7]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDisableConfirm}
                disabled={saving}
                className="rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-red-700 disabled:opacity-60"
              >
                {saving ? "Disabling..." : "Disable Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
