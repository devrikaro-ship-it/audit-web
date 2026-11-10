import ClientLoginForm from "./login-form";

export const dynamic = "force-dynamic";

export default function ClientLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <ClientLoginForm />
    </main>
  );
}

