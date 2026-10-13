import { AutoResizeTextarea } from "@/components/admin/AutoResizeTextarea";
import { useAdminView } from "@/components/admin/AdminViewProvider";
import { AboutPhotoEditorCard } from "@/components/admin/site-editor/AboutPhotoEditorCard";
import {
  applyAboutSite,
  withCtaPhoto,
  withCtaShowPhoto,
  withStatsBannerVisible,
  withStatsPhoto,
  withStatsPhotos,
  withStatsShowPhotos,
} from "@/components/admin/site-editor/aboutPhotos";
import { cardClass, inputClass } from "@/components/admin/site-editor/constants";
import { AddRowButton, moveItem, RowControls, uniqueId } from "@/components/admin/site-editor/list";
import { LiveOnSiteNote } from "@/components/admin/site-editor/LiveOnSiteNote";
import { VideoSlotField } from "@/components/admin/site-editor/VideoSlotField";
import type {
  SiteEditorFieldsProps,
  SiteEditorVideoProps,
} from "@/components/admin/site-editor/types";
import { FileUploadButton } from "@/components/ui/FileUploadButton";
import {
  ABOUT_PHOTO_FRAMES,
  MAX_STATS_PHOTOS,
  type HeroIntroServices,
} from "@/lib/site/types";

export function ProfileEditor({
  form,
  setForm,
}: Pick<SiteEditorFieldsProps, "form" | "setForm">) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="font-display text-lg text-brown">Profile</h3>
        <p className="mt-1 text-sm text-muted">
          How Emily appears in the hero and across the site.
        </p>
      </div>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="text-muted">Full name</span>
          <AutoResizeTextarea
            value={form.fullName}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                fullName: event.target.value,
              }))
            }
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">First name</span>
          <AutoResizeTextarea
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Brand</span>
          <AutoResizeTextarea
            value={form.brand}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                brand: event.target.value,
              }))
            }
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-muted">
            Used in the site header, footer, and page titles.
          </span>
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="text-muted">
            Tagline (used for search/social previews — the hero shows the Hero
            subtitle instead)
          </span>
          <AutoResizeTextarea
            value={form.tagline}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                tagline: event.target.value,
              }))
            }
            rows={2}
            className={inputClass}
          />
        </label>
      </div>
    </section>
  );
}

const HERO_SERVICE_LABELS = ["First", "Second", "Third"] as const;

function withHeroService(
  services: HeroIntroServices,
  index: number,
  value: string,
): HeroIntroServices {
  return [
    index === 0 ? value : services[0],
    index === 1 ? value : services[1],
    index === 2 ? value : services[2],
  ];
}

export function HeroEditor({
  form,
  setForm,
  loading,
  uploadPhoto,
  removePhoto,
  videoFiles,
  videoUploads,
  videoPreviewUrls,
  heroVideoInputRef,
  startVideoUpload,
  rejectVideo,
  removeVideo,
  setError,
}: SiteEditorFieldsProps & SiteEditorVideoProps) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="font-display text-lg text-brown">Hero</h3>
        <p className="mt-1 text-sm text-muted">
          The intro at the top of the home page: the three services, her name
          in the bottom left, creator cutout, and the cursive subtitle in the
          forest belt above the video. The background video sits below with no
          overlay. Edit the name under Profile.
        </p>
      </div>

      <div className="max-w-2xl space-y-3 rounded-2xl border border-brown/15 bg-cream/50 p-4">
        <p className="font-label text-xs font-semibold tracking-[0.12em] text-muted uppercase">
          Services at the top
        </p>
        <p className="text-sm text-muted">
          The three offerings shown above the name, separated by pipes. Leave a
          field blank to hide that one. Remember to press &ldquo;Save site
          content&rdquo; after editing.
        </p>
        <div className="grid min-w-0 gap-3 sm:grid-cols-3">
          {form.hero.services.map((service, index) => (
            <label key={HERO_SERVICE_LABELS[index]} className="block text-sm">
              <span className="text-muted">
                {HERO_SERVICE_LABELS[index]} service
              </span>
              <AutoResizeTextarea
                value={service}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    hero: {
                      ...current.hero,
                      services: withHeroService(
                        current.hero.services,
                        index,
                        event.target.value,
                      ),
                    },
                  }))
                }
                className={inputClass}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="max-w-2xl space-y-3 rounded-2xl border border-brown/15 bg-cream/50 p-4">
        <p className="font-label text-xs font-semibold tracking-[0.12em] text-muted uppercase">
          Creator photo
        </p>
        <p className="text-sm text-muted">
          The cutout standing in the intro. A PNG with a transparent background
          is highly suggested so the silhouette and forest belt sit cleanly
          behind the figure. It replaces the photo on the site only after the
          upload finishes. Writing on this page still needs &ldquo;Save site
          content&rdquo;.
        </p>
        <div className="block text-sm">
          <span className="text-muted">Photo</span>
          <FileUploadButton
            className="mt-1"
            kind="photo"
            accept="image/png,image/*"
            hint="PNG with a transparent background is highly suggested"
            buttonLabel="Add creator photo"
            selectedName={form.hero.creatorImagePath}
            previewUrl={form.hero.creatorImagePath}
            disabled={loading}
            onChange={(file) => {
              if (file) void uploadPhoto("creator", file, "heroCreator");
            }}
            onRemove={
              form.hero.creatorImagePath
                ? () => {
                    void removePhoto("creator", "heroCreator");
                  }
                : undefined
            }
          />
          {form.hero.creatorImagePath && (
            <LiveOnSiteNote>Live on your site</LiveOnSiteNote>
          )}
        </div>
      </div>

      <label className="block max-w-2xl text-sm">
        <span className="text-muted">Subtitle (cursive line)</span>
        <AutoResizeTextarea
          value={form.hero.subtitle}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              hero: { ...current.hero, subtitle: event.target.value },
            }))
          }
          rows={3}
          className={inputClass}
        />
        <span className="mt-1 block text-xs text-muted">
          Shown in the green forest belt between the intro and the video.
          Remember to press &ldquo;Save site content&rdquo; after editing the
          subtitle.
        </span>
      </label>

      <div className="max-w-2xl space-y-3 rounded-2xl border border-brown/15 bg-cream/50 p-4">
        <p className="font-label text-xs font-semibold tracking-[0.12em] text-muted uppercase">
          Background video
        </p>
        <p className="text-sm text-muted">
          It replaces the video on the site only after the upload finishes.
          Writing on this page still needs &ldquo;Save site content&rdquo;.
          Use the original 1080p (or higher) file so it stays sharp. The
          soundtrack is kept, and the hero plays it when someone presses play.
          Clips play once and can be up to one minute. On phones, portrait clips
          lengthen the hero so the full frame stays visible. On a wide screen
          they fill the viewport height. Landscape clips always fill the
          viewport height. The picture is never stretched. Without a video,
          the hero shows the plant wallpaper.
        </p>
        <VideoSlotField
          slot="hero"
          videoPath={form.hero.videoPath}
          file={videoFiles.hero}
          previewUrl={videoPreviewUrls.hero}
          state={videoUploads.hero}
          inputRef={heroVideoInputRef}
          disabled={loading}
          onError={setError}
          onSelect={(file) => void startVideoUpload("hero", file)}
          onReject={() => rejectVideo("hero")}
          onRemove={() => void removeVideo("hero")}
        />
      </div>
    </section>
  );
}

export function StatsEditor({
  form,
  setForm,
  loading,
  uploadPhoto,
  removePhoto,
}: SiteEditorFieldsProps) {
  const { setSite, site } = useAdminView();
  const photos = form.statsBanner.photos ?? [];
  const savedPhotoIds = new Set(
    (site.statsBanner.photos ?? []).map((photo) => photo.id),
  );

  return (
    <section className="space-y-4">
      <div>
        <h3 className="font-display text-lg text-brown">Audience reach</h3>
        <p className="mt-1 text-sm text-muted">
          The figures between photography and about. Add as many as you like —
          they spread evenly across the section. Up to six framed photos can
          sit in the same panel.
        </p>
      </div>

      <label className="flex max-w-2xl items-center justify-between gap-4 rounded-2xl border border-brown/15 bg-cream/55 p-4 text-sm">
        <span>
          <span className="block font-semibold text-brown">
            Show the stats section
          </span>
          <span className="mt-1 block text-muted">
            Admin view still previews it while hidden.
          </span>
        </span>
        <input
          type="checkbox"
          checked={form.statsBanner.visible}
          onChange={(event) =>
            applyAboutSite(setForm, setSite, (current) =>
              withStatsBannerVisible(current, event.target.checked),
            )
          }
          className="h-5 w-5 accent-forest"
        />
      </label>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        {form.statsBanner.items.map((stat, index) => (
          <div key={stat.id} className={cardClass}>
            <RowControls
              label="Stat"
              index={index}
              count={form.statsBanner.items.length}
              onMove={(delta) =>
                setForm((current) => ({
                  ...current,
                  statsBanner: {
                    ...current.statsBanner,
                    items: moveItem(current.statsBanner.items, index, delta),
                  },
                }))
              }
              onRemove={() =>
                setForm((current) => ({
                  ...current,
                  statsBanner: {
                    ...current.statsBanner,
                    items: current.statsBanner.items.filter((_, i) => i !== index),
                  },
                }))
              }
            />
            <label className="block text-sm">
              <span className="text-muted">Figure (cursive)</span>
              <AutoResizeTextarea
                value={stat.value}
                onChange={(event) =>
                  setForm((current) => {
                    const items = [...current.statsBanner.items];
                    items[index] = { ...items[index], value: event.target.value };
                    return {
                      ...current,
                      statsBanner: { ...current.statsBanner, items },
                    };
                  })
                }
                placeholder="10k"
                className={inputClass}
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted">Label</span>
              <AutoResizeTextarea
                value={stat.label}
                onChange={(event) =>
                  setForm((current) => {
                    const items = [...current.statsBanner.items];
                    items[index] = { ...items[index], label: event.target.value };
                    return {
                      ...current,
                      statsBanner: { ...current.statsBanner, items },
                    };
                  })
                }
                placeholder="Instagram"
                className={inputClass}
              />
            </label>
          </div>
        ))}
      </div>

      <AddRowButton
        label="Add stat"
        onClick={() =>
          setForm((current) => ({
            ...current,
            statsBanner: {
              ...current.statsBanner,
              items: [
                ...current.statsBanner.items,
                { id: uniqueId("stat"), value: "", label: "" },
              ],
            },
          }))
        }
      />

      <label className="flex max-w-2xl items-center justify-between gap-4 rounded-2xl border border-brown/15 bg-cream/55 p-4 text-sm">
        <span>
          <span className="block font-semibold text-brown">
            Show photos
          </span>
          <span className="mt-1 block text-muted">
            When off, visitors only see the figures. Admin view still
            previews the expanded panel.
          </span>
        </span>
        <input
          type="checkbox"
          checked={form.statsBanner.showPhotos !== false}
          onChange={(event) =>
            applyAboutSite(setForm, setSite, (current) =>
              withStatsShowPhotos(current, event.target.checked),
            )
          }
          className="h-5 w-5 accent-forest"
        />
      </label>

      {photos.length === 0 ? (
        <p className="max-w-2xl text-sm text-muted">
          No photos yet. Add up to {MAX_STATS_PHOTOS} for the expanded panel.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {photos.map((photo, index) => (
            <AboutPhotoEditorCard
              key={photo.id}
              photo={photo}
              heading={`Photo ${index + 1}`}
              leading={
                <RowControls
                  label="Photo"
                  index={index}
                  count={photos.length}
                  onMove={(delta) =>
                    setForm((current) =>
                      withStatsPhotos(
                        current,
                        moveItem(current.statsBanner.photos ?? [], index, delta),
                      ),
                    )
                  }
                  onRemove={() =>
                    setForm((current) =>
                      withStatsPhotos(
                        current,
                        (current.statsBanner.photos ?? []).filter(
                          (_, i) => i !== index,
                        ),
                      ),
                    )
                  }
                />
              }
              loading={loading}
              onCaptionChange={(caption) =>
                applyAboutSite(setForm, setSite, (current) =>
                  withStatsPhoto(current, index, { caption }),
                )
              }
              onShowCaptionChange={(showCaption) =>
                applyAboutSite(setForm, setSite, (current) =>
                  withStatsPhoto(current, index, { showCaption }),
                )
              }
              onFrameChange={(frame) =>
                applyAboutSite(setForm, setSite, (current) =>
                  withStatsPhoto(current, index, { frame }),
                )
              }
              onRotateChange={(rotate) =>
                applyAboutSite(setForm, setSite, (current) =>
                  withStatsPhoto(current, index, { rotate }),
                )
              }
              onUpload={(file) => {
                void uploadPhoto(photo.id, file, "statsPhoto");
              }}
              onRemove={() => {
                void removePhoto(photo.id, "statsPhoto");
              }}
              uploadReady={savedPhotoIds.has(photo.id)}
            />
          ))}
        </div>
      )}

      <AddRowButton
        label={`Add photo (${photos.length} of ${MAX_STATS_PHOTOS})`}
        disabled={photos.length >= MAX_STATS_PHOTOS}
        onClick={() =>
          setForm((current) => {
            const existing = current.statsBanner.photos ?? [];
            if (existing.length >= MAX_STATS_PHOTOS) {
              return current;
            }
            return withStatsPhotos(current, [
              ...existing,
              {
                id: uniqueId("reach"),
                caption: "",
                showCaption: true,
                showShadow: true,
                rotate: 0,
                frame:
                  ABOUT_PHOTO_FRAMES[existing.length % ABOUT_PHOTO_FRAMES.length],
              },
            ]);
          })
        }
      />
    </section>
  );
}

export function CtaEditor({
  form,
  setForm,
  loading,
  uploadPhoto,
  removePhoto,
}: SiteEditorFieldsProps) {
  const { setSite } = useAdminView();

  return (
    <section className="space-y-4">
      <div>
        <h3 className="font-display text-lg text-brown">Contact</h3>
        <p className="mt-1 text-sm text-muted">
          The &ldquo;Let&apos;s work together&rdquo; section at the bottom of
          the home page — headline, message, photo, and links.
        </p>
      </div>
      <label className="block max-w-2xl text-sm">
        <span className="text-muted">Headline (cursive)</span>
        <AutoResizeTextarea
          value={form.closingCta.headline}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              closingCta: {
                ...current.closingCta,
                headline: event.target.value,
              },
            }))
          }
          className={inputClass}
        />
      </label>
      <label className="block max-w-2xl text-sm">
        <span className="text-muted">Message</span>
        <AutoResizeTextarea
          value={form.closingCta.body}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              closingCta: {
                ...current.closingCta,
                body: event.target.value,
              },
            }))
          }
          rows={6}
          className={inputClass}
        />
      </label>

      <label className="flex max-w-2xl items-center justify-between gap-4 rounded-2xl border border-brown/15 bg-cream/55 p-4 text-sm">
        <span>
          <span className="block font-semibold text-brown">
            Show CTA photo
          </span>
          <span className="mt-1 block text-muted">
            When off, the contact copy sits centered on the page.
          </span>
        </span>
        <input
          type="checkbox"
          checked={form.closingCta.showPhoto}
          onChange={(event) =>
            applyAboutSite(setForm, setSite, (current) =>
              withCtaShowPhoto(current, event.target.checked),
            )
          }
          className="h-5 w-5 accent-forest"
        />
      </label>

      <div className="max-w-2xl">
        <AboutPhotoEditorCard
          photo={form.closingCta.photo}
          heading="CTA photo"
          loading={loading}
          onCaptionChange={(caption) =>
            applyAboutSite(setForm, setSite, (current) =>
              withCtaPhoto(current, { caption }),
            )
          }
          onShowCaptionChange={(showCaption) =>
            applyAboutSite(setForm, setSite, (current) =>
              withCtaPhoto(current, { showCaption }),
            )
          }
          onShowShadowChange={(showShadow) =>
            applyAboutSite(setForm, setSite, (current) =>
              withCtaPhoto(current, { showShadow }),
            )
          }
          onFrameChange={(frame) =>
            applyAboutSite(setForm, setSite, (current) =>
              withCtaPhoto(current, { frame }),
            )
          }
          onRotateChange={(rotate) =>
            applyAboutSite(setForm, setSite, (current) =>
              withCtaPhoto(current, { rotate }),
            )
          }
          onUpload={(file) => {
            void uploadPhoto(form.closingCta.photo.id, file, "ctaPhoto");
          }}
          onRemove={() => {
            void removePhoto(form.closingCta.photo.id, "ctaPhoto");
          }}
        />
      </div>

      <div className="grid max-w-2xl gap-4">
        <label className="block text-sm">
          <span className="text-muted">
            Email button text (what visitors see on the pill)
          </span>
          <AutoResizeTextarea
            value={form.closingCta.emailLabel}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                closingCta: {
                  ...current.closingCta,
                  emailLabel: event.target.value,
                },
              }))
            }
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Instagram URL</span>
          <AutoResizeTextarea
            value={form.social.instagram}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                social: {
                  ...current.social,
                  instagram: event.target.value,
                },
              }))
            }
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Email link</span>
          <AutoResizeTextarea
            value={form.social.email}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                social: { ...current.social, email: event.target.value },
              }))
            }
            className={inputClass}
          />
        </label>
      </div>
    </section>
  );
}
