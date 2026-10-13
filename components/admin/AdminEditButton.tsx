"use client";

import {
  useAdminView,
  type SiteEditorSection,
} from "@/components/admin/AdminViewProvider";

type AdminEditButtonProps = {
  label: string;
  /** `light` reads on dark forest washes, `dark` on the light washes. */
  tone?: "dark" | "light";
  className?: string;
} & (
  | { section: SiteEditorSection; target?: "site" }
  | { target: "portfolio"; section?: never }
);

const TONE_CLASS = {
  dark: "border-forest/30 bg-paper/85 text-forest hover:bg-paper",
  light: "border-paper/40 bg-forest-deep/70 text-paper hover:bg-forest-deep",
} as const;

/** Small "edit this section" pill that only appears in admin view. */
export function AdminEditButton({
  label,
  tone = "dark",
  className = "",
  ...targetProps
}: AdminEditButtonProps) {
  const { viewMode, openSiteEditor, openPortfolioEditor } = useAdminView();
  if (viewMode !== "admin") return null;

  const handleClick = () => {
    if (targetProps.target === "portfolio") {
      openPortfolioEditor();
      return;
    }
    openSiteEditor(targetProps.section);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`absolute top-4 right-4 z-40 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-label text-[11px] font-semibold tracking-[0.12em] uppercase shadow-sm backdrop-blur-md transition ${TONE_CLASS[tone]} ${className}`}
    >
      <span aria-hidden>✎</span>
      {label}
    </button>
  );
}
