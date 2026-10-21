"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  clearStaffAccessToken,
  getStaffAccessToken,
} from "../../../../lib/staff-auth-api";
import {
  createStaffMember,
  getStaffRoles,
  StaffManagementApiError,
} from "../../../../lib/staff-management-api";
import type { StaffRole } from "../../../../types/staff-management";

const PRESET_DEPARTMENTS = [
  "Catalogue & Inventory",
  "Fulfillment & Orders",
  "Service & Repairs",
  "Customer Support",
  "Finance & Operations",
  "Administration",
];

export default function NewStaffMemberPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [roles, setRoles] = useState<StaffRole[]>([]);

  // Form Fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [department, setDepartment] = useState("Catalogue & Inventory");
  const [jobTitle, setJobTitle] = useState("Product Specialist");
  const [password, setPassword] = useState("KlaroneStaff@2026");
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const activeToken = getStaffAccessToken();
    if (!activeToken) {
      router.replace("/staff/login");
      return;
    }
    setToken(activeToken);

    getStaffRoles(activeToken)
      .then((res) => {
        setRoles(res.roles);
        // Default to Product Manager or first specialized role
        const defaultRole = res.roles.find((r) => r.name === "PRODUCT_MANAGER");
        if (defaultRole) {
          setSelectedRoleIds([defaultRole.id]);
        }
      })
      .catch(() => {});
  }, []);

  function toggleRole(id: number) {
    setSelectedRoleIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    if (!firstName.trim() || !email.trim()) {
      setError("First Name and Login Email are required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const created = await createStaffMember(token, {
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        employeeCode: employeeCode.trim() || undefined,
        department: department.trim() || undefined,
        jobTitle: jobTitle.trim() || undefined,
        password: password.trim() || undefined,
        roleIds: selectedRoleIds,
        status: "ACTIVE",
      });

      router.push(`/staff/users/${created.id}`);
    } catch (err) {
      if (err instanceof StaffManagementApiError && err.status === 401) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }
      setError(
        err instanceof Error ? err.message : "Failed to create staff member.",
      );
    } finally {
      setLoading(false);
    }
  }

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
              <span className="font-medium text-[#303030]">New Member</span>
            </div>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-[#1a1a1a]">
              Add Staff Member
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/staff/users"
              className="rounded-lg border border-[#c9cccf] bg-white px-3 py-1.5 text-xs font-semibold text-[#303030] hover:bg-[#f6f6f7]"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#008060] px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#006e52] disabled:opacity-60"
            >
              {loading ? "Creating..." : "Save Member"}
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card: Basic Identity */}
          <div className="rounded-xl border border-[#e1e3e5] bg-white p-5 shadow-2xs">
            <h2 className="text-sm font-bold text-[#1a1a1a]">Personal & Contact Details</h2>
            <p className="mt-0.5 text-xs text-[#616161]">
              Basic profile information and staff portal login identity.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-[#303030]">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Rahul"
                  className="mt-1 w-full rounded-lg border border-[#c9cccf] bg-[#fdfdfd] px-3 py-2 text-xs text-[#303030] focus:border-[#008060] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#303030]">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Sen"
                  className="mt-1 w-full rounded-lg border border-[#c9cccf] bg-[#fdfdfd] px-3 py-2 text-xs text-[#303030] focus:border-[#008060] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#303030]">
                  Login Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@klarone.com"
                  className="mt-1 w-full rounded-lg border border-[#c9cccf] bg-[#fdfdfd] px-3 py-2 text-xs text-[#303030] focus:border-[#008060] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#303030]">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="mt-1 w-full rounded-lg border border-[#c9cccf] bg-[#fdfdfd] px-3 py-2 text-xs text-[#303030] focus:border-[#008060] focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Card: Role & Permissions Assignment */}
          <div className="rounded-xl border border-[#e1e3e5] bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#1a1a1a]">Role & Access Permissions</h2>
                <p className="mt-0.5 text-xs text-[#616161]">
                  Select the pre-built roles to grant operational privileges.
                </p>
              </div>
              <span className="text-xs font-semibold text-[#008060]">
                {selectedRoleIds.length} Role(s) Selected
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
                          {r.description || "Operational platform role"}
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
          </div>

          {/* Card: Organizational & Security Placement */}
          <div className="rounded-xl border border-[#e1e3e5] bg-white p-5 shadow-2xs">
            <h2 className="text-sm font-bold text-[#1a1a1a]">Organization & Credentials</h2>
            <p className="mt-0.5 text-xs text-[#616161]">
              Assign department, employee code, and temporary password.
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
                  placeholder="e.g. Catalog Specialist"
                  className="mt-1 w-full rounded-lg border border-[#c9cccf] bg-[#fdfdfd] px-3 py-2 text-xs text-[#303030] focus:border-[#008060] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#303030]">
                  Employee Code <span className="text-[11px] font-normal text-[#616161]">(auto-assigned if empty)</span>
                </label>
                <input
                  type="text"
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())}
                  placeholder="e.g. KLN-STF-1024"
                  className="mt-1 w-full rounded-lg border border-[#c9cccf] bg-[#fdfdfd] px-3 py-2 font-mono text-xs text-[#303030] focus:border-[#008060] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#303030]">
                  Initial Password
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#c9cccf] bg-[#fdfdfd] px-3 py-2 font-mono text-xs text-[#303030] focus:border-[#008060] focus:bg-white focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-[#616161]">
                  Staff member can sign in immediately with this password.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
