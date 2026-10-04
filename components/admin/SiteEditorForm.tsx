"use client";

import { useEffect, useRef } from "react";
import type { PortfolioVideo } from "@/lib/videos/types";
import type { SiteContent } from "@/lib/site/types";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import {
  useAdminView,
  type SiteEditorSection,
} from "@/components/admin/AdminViewProvider";
import { SECTIONS } from "@/components/admin/site-editor/constants";
import { SiteEditorSectionView } from "@/components/admin/site-editor/SiteEditorSectionView";
import { useSiteEditorController } from "@/components/admin/site-editor/useSiteEditorController";
import { RevisionHistory } from "@/components/admin/RevisionHistory";
import {
  siteUpdatedAtFromResponse,
  siteVersionFromResponse,
} from "@/lib/site/response";

type SiteEditorFormProps = {
  onSaved?: (site: SiteContent) => void;
  portfolioVideos?: PortfolioVideo[];
  portfolioVideosLoaded?: boolean;
  onUploadBusyChange?: (busy: boolean) => void;
};

export function SiteEditorForm({
  onSaved,
  portfolioVideos = [],
  portfolioVideosLoaded = false,
  onUploadBusyChange,
}: SiteEditorFormProps) {
  const { location, setEditorSection, siteVersion } = useAdminView();
  const activeSection = location.section;
  const focusedPhotoId =
    location.focus?.kind === "photography-photo" ? location.focus.photoId : null;
  const sectionNavRefs = useRef<
    Partial<Record<SiteEditorSection, HTMLButtonElement | null>>
  >({});
  const photoCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const editor = useSiteEditorController(onSaved);

  useEffect(() => {
    onUploadBusyChange?.(editor.uploadBusy);
  }, [editor.uploadBusy, onUploadBusyChange]);

  useEffect(() => {
    return () => onUploadBusyChange?.(false);
  }, [onUploadBusyChange]);

  useEffect(() => {
    sectionNavRefs.current[activeSection]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== "photography" || !focusedPhotoId) return;

    const frame = window.requestAnimationFrame(() => {
      sectionNavRefs.current.photography?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
      photoCardRefs.current[focusedPhotoId]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeSection, focusedPhotoId]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col md:flex-row">
      <nav
        aria-label="Site content sections"
        className="max-w-full shrink-0 border-b border-brown/10 bg-cream/40 md:w-52 md:max-w-none md:border-r md:border-b-0 lg:w-56"
      >
        <div className="flex max-w-full gap-1 overflow-x-auto overscroll-x-contain px-3 py-2 md:flex-col md:gap-0.5 md:overflow-visible md:px-3 md:py-4">
          {SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setEditorSection(item.id)}
              ref={(element) => {
                sectionNavRefs.current[item.id] = element;
              }}
              className={`shrink-0 rounded-xl px-3 py-2 text-left text-sm font-medium transition md:w-full md:px-3 md:py-2.5 ${
                activeSection === item.id
                  ? "bg-forest text-paper"
                  : "text-ink hover:bg-white/80"
              }`}
            >
              {item.id === "photos"
                ? editor.form.about.galleryHeading.trim() || item.label
                : item.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-4 sm:px-6 sm:py-5">
          <SiteEditorSectionView
            section={activeSection}
            fields={{
              form: editor.form,
              setForm: editor.setForm,
              loading: editor.loading,
              uploadPhoto: editor.uploadPhoto,
              removePhoto: editor.removePhoto,
            }}
            video={{
              videoFiles: editor.videoFiles,
              videoUploads: editor.videoUploads,
              videoPreviewUrls: editor.videoPreviewUrls,
              heroVideoInputRef: editor.heroVideoInputRef,
              startVideoUpload: editor.startVideoUpload,
              rejectVideo: editor.rejectVideo,
              removeVideo: editor.removeVideo,
              setError: editor.setError,
            }}
            work={{ portfolioVideos, portfolioVideosLoaded }}
            photoCardRefs={photoCardRefs}
          />
        </div>

        <div className="min-w-0 shrink-0 border-t border-brown/10 bg-paper px-3 py-3 sm:px-6">
          {editor.error && (
            <p className="mb-2 rounded-xl bg-blush/15 px-4 py-2 text-sm text-brown">
              {editor.error}
            </p>
          )}
          {editor.message && (
            <p className="mb-2 rounded-xl bg-lavender/25 px-4 py-2 text-sm text-ink">
              {editor.message}
            </p>
          )}

          <AnimatedButton
            onClick={() => void editor.save()}
            disabled={editor.loading || editor.uploadBusy}
            className="w-full shadow-md shadow-forest/15 sm:max-w-xs"
          >
            {editor.loading ? "Saving…" : "Save site content"}
          </AnimatedButton>
          <p className="mt-2 max-w-md text-xs text-muted">
            Saves writing and settings. A video or photo is on the site only
            after its upload finishes.
          </p>
          <div className="mt-3 max-h-56 overflow-y-auto">
            <RevisionHistory<SiteContent>
              endpoint="/api/site/revisions"
              currentVersion={siteVersion}
              versionHeader="X-Site-Version"
              confirmLabel={(revision) =>
                `Restore the site to version ${revision.version} from ${new Date(revision.createdAt).toLocaleString()}? Your current save stays in history.`
              }
              emptyHint="History appears after this site is connected to Supabase."
              onRestored={(next, response) => {
                editor.applyRestoredSite(
                  next,
                  siteVersionFromResponse(response),
                  siteUpdatedAtFromResponse(response) ?? undefined,
                );
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
