const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

const STAFF_TOKEN_KEY = "klarone-staff-access-token";

export class StaffAuthError extends Error {
  status: number;

  constructor(message: string, status: number = 401) {
    super(message);
    this.name = "StaffAuthError";
    this.status = status;
  }
}

export function getStaffAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }

  // Check localStorage first, then fallback to sessionStorage for migration
  return (
    localStorage.getItem(STAFF_TOKEN_KEY) ??
    sessionStorage.getItem(STAFF_TOKEN_KEY)
  );
}

export function setStaffAccessToken(token: string, remember: boolean = true) {
  if (typeof window === "undefined") return;

  if (remember) {
    localStorage.setItem(STAFF_TOKEN_KEY, token);
  }
  // Keep in sessionStorage as well for multi-window consistency
  sessionStorage.setItem(STAFF_TOKEN_KEY, token);
}

export function clearStaffAccessToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STAFF_TOKEN_KEY);
  sessionStorage.removeItem(STAFF_TOKEN_KEY);
}

async function readError(response: Response) {
  try {
    const body = (await response.json()) as {
      message?: string | string[];
    };

    if (Array.isArray(body.message)) {
      return body.message.join(", ");
    }

    return body.message ?? "Staff authentication request failed.";
  } catch {
    return "Staff authentication request failed.";
  }
}

export async function staffLogin(
  email: string,
  password: string,
) {
  // 1. Attempt Better Auth email/password authentication
  try {
    const { authClient } = await import("@/lib/auth-client");
    await authClient.signIn.email({
      email,
      password,
    });
  } catch (err) {
    console.warn("[Better Auth] staff signIn notice:", err);
  }

  // 2. Call backend staff-auth/login to issue RBAC token
  const response = await fetch(
    `${API_BASE_URL}/staff-auth/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    },
  );

  if (!response.ok) {
    throw new StaffAuthError(
      await readError(response),
      response.status,
    );
  }

  return (await response.json()) as {
    accessToken: string;
  };
}

export interface CurrentStaffProfile {
  userAccountId: string;
  staffProfileId: string;
  name: string;
  email: string;
  department: string | null;
  jobTitle: string | null;
  employeeCode: string;
  roles: string[];
  isSuperAdmin: boolean;
  permissions: string[];
}

export async function getCurrentStaffProfile(token: string): Promise<CurrentStaffProfile> {
  const response = await fetch(`${API_BASE_URL}/staff-auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new StaffAuthError(await readError(response), response.status);
  }

  return response.json();
}
