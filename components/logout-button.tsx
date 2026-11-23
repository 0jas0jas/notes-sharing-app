"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    // Re-render server components (the navbar in the layout) without the session.
    router.refresh();
  };

  return (
    <Button variant="outline" size="sm" onClick={logout}>
      Log out
    </Button>
  );
}
