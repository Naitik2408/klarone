import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";
import { dashClient } from "@better-auth/infra/client";

const authUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:3000";

export const authClient = createAuthClient({
  baseURL: authUrl,
  basePath: "/api/auth",
  plugins: [emailOTPClient(), dashClient()],
  fetchOptions: {
    credentials: "include",
  },
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;
