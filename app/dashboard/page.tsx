// Placeholder so logins have somewhere to land. Replaced by the real dashboard in #9.
// Logged-out visitors never reach this page: lib/supabase/proxy.ts redirects them.
import { LogoutButton } from "@/components/logout-button";

export default function DashboardPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground">
        You&apos;re logged in. The real dashboard is coming in #9.
      </p>
      <LogoutButton />
    </main>
  );
}
