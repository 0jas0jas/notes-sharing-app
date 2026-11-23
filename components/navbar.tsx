import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/logout-button";
import { ThemeSwitcher } from "@/components/theme-switcher";

// Shared header shown on every page (rendered once in app/layout.tsx).
// Logged in:  logo → Dashboard, Share, display name, Log out
// Logged out: logo → How it works, Log in, Create account
export function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        {/* Reading the login cookie is dynamic, so it must sit inside Suspense
            (required because cacheComponents is on in next.config.ts). */}
        <Suspense fallback={<Logo href="/" />}>
          <NavContent />
        </Suspense>
      </nav>
    </header>
  );
}

function Logo({ href }: { href: string }) {
  return (
    <Link href={href} className="text-lg font-bold tracking-tight text-primary">
      CourseNotes
    </Link>
  );
}

async function NavContent() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) {
    return (
      <>
        <Logo href="/" />
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            {/* #7 should give the landing page section id="how-it-works" */}
            <Link href="/#how-it-works">How it works</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/auth/login">Log in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/auth/sign-up">Create account</Link>
          </Button>
          <ThemeSwitcher />
        </div>
      </>
    );
  }

  // Display name comes from the profiles row the sign-up trigger creates.
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", claims.sub)
    .maybeSingle();
  const name = profile?.display_name ?? claims.email ?? "Account";

  return (
    <>
      <Logo href="/dashboard" />
      <div className="flex items-center gap-1 sm:gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard">Dashboard</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/share">Share</Link>
        </Button>
        <span className="hidden max-w-40 truncate px-2 text-sm text-muted-foreground md:inline">
          {name}
        </span>
        <LogoutButton />
        <ThemeSwitcher />
      </div>
    </>
  );
}
