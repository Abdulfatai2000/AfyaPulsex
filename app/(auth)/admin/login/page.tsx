import { AdminLoginForm } from "./AdminLoginForm";

export default function AdminLoginPage() {
  return <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
    <section className="w-full max-w-md space-y-6 rounded-xl border bg-white p-6 shadow-sm" aria-labelledby="admin-login-title">
      <div><h1 id="admin-login-title" className="text-2xl font-bold text-[#08214A]">AfyaPulse Admin</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in with your provisioned Admin account.</p></div>
      <AdminLoginForm />
    </section>
  </main>;
}
