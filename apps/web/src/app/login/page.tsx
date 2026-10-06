import { Header } from "@/components/site/header";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <>
      <Header />

      <main className="min-h-[calc(100vh-73px)] bg-neutral-50 px-4 py-12">
        <div className="mx-auto flex max-w-6xl justify-center">
          <LoginForm />
        </div>
      </main>
    </>
  );
}