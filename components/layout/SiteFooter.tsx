"use client";

import Link from "next/link";
import { AdminUnlockButton } from "@/components/admin/AdminUnlockButton";

export function SiteFooter() {
  return (
    <footer className="glass-footer relative z-40 border-t border-lavender/25 bg-paper/70 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]">
      <div className="mx-auto flex max-w-6xl items-center justify-center px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-ink/60">
          <p>© 2026 Emily Wunder</p>
          <Link href="/privacy" className="underline-offset-2 hover:underline">
            Privacy
          </Link>
          <Link href="/terms" className="underline-offset-2 hover:underline">
            Terms
          </Link>
          <AdminUnlockButton />
        </div>
      </div>
    </footer>
  );
}
