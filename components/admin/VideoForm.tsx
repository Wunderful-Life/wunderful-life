"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Platform, PortfolioVideo } from "@/lib/videos/types";
import { PLATFORMS } from "@/lib/videos/types";
import { slugify } from "@/lib/videos/slugify";
import {
  isAcceptedVideoFile,
  VIDEO_FILE_ACCEPT,
  videoUploadErrorMessage,
} from "@/lib/videos/upload";
import { videoUploadHelp } from "@/lib/videos/compress-settings";
import { assetDisplayName } from "@/lib/files";
import { toErrorMessage } from "@/lib/errors";
import { readResponseJson } from "@/lib/http/json";
import { AutoResizeTextarea } from "@/components/admin/AutoResizeTextarea";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { FileUploadButton } from "@/components/ui/FileUploadButton";
import { UploadProgressBar } from "@/components/ui/UploadProgressBar";
import {
  appendPreparedUpload,
  idleMediaUpload,
  isMediaBlockingSave,
  isMediaUploadBusy,
  isUploadAborted,
  prepareAndUploadImage,
  prepareAndUploadVideo,
  primePortfolioAudio,
  releasePortfolioAudio,
  useMediaPreview,
  type MediaUploadState,
  type PreparedUpload,
} from "@/lib/videos/client-pipeline";
import { attachHiddenVideo, detachHiddenVideo } from "@/lib/videos/media-dom";

type VideoFormProps = {
  initial?: PortfolioVideo | null;
  embedded?: boolean;
  onSuccess: (video: PortfolioVideo) => void;
  onCancel?: () => void;
  onUploadBusyChange?: (busy: boolean) => void;
};

const inputClass =
  "mt-1 w-full min-w-0 rounded-xl border border-brown/20 bg-white px-3 py-2.5 text-base leading-normal text-brown outline-none focus:border-forest/50";

const emptyForm = {
  title: "",
  brand: "",
  platform: "instagram" as Platform,
  hook: "",
  cta: "",
  durationSec: 0,
  slug: "",
  featured: false,
};

function saveLabel(state: {
  saving: boolean;
  saveMessage: string;
  capturingThumbnail: boolean;
  uploadBusy: boolean;
  saveBlocked: boolean;
  isNew: boolean;
  hasVideo: boolean;
  hasThumbnail: boolean;
}): string {
  if (state.saving) return state.saveMessage;
  if (state.capturingThumbnail) return "Capturing thumbnail…";
  if (state.uploadBusy || state.saveBlocked) return "Waiting for uploads…";
  if (state.isNew && !state.hasVideo) return "Add a video to save";
  if (state.isNew && !state.hasThumbnail) return "Add a thumbnail to save";
  return state.isNew ? "Add video" : "Save video";
}

export function VideoForm({
  initial,
  embedded = false,
  onSuccess,
  onCancel,
  onUploadBusyChange,
}: VideoFormProps) {
  const [form, setForm] = useState(() =>
    initial
      ? {
          title: initial.title,
          brand: initial.brand,
          platform: initial.platform,
          hook: initial.hook,
          cta: initial.cta,
          durationSec: initial.durationSec,
          slug: initial.slug,
          featured: initial.featured,
        }
      : emptyForm,
  );
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoUpload, setVideoUpload] = useState<MediaUploadState>(idleMediaUpload);
  const [thumbnailUpload, setThumbnailUpload] =
    useState<MediaUploadState>(idleMediaUpload);
  const [videoPrepared, setVideoPrepared] = useState<PreparedUpload | null>(null);
  const [thumbnailPrepared, setThumbnailPrepared] =
    useState<PreparedUpload | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("Saving video details…");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [capturingThumbnail, setCapturingThumbnail] = useState(false);
  const [thumbnailHint, setThumbnailHint] = useState<string | null>(null);
  const [videoHint, setVideoHint] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoUploadGenRef = useRef(0);
  const thumbnailUploadGenRef = useRef(0);

  const videoPreviewUrl = useMediaPreview(videoFile, initial?.videoPath);
  const thumbnailPreviewUrl = useMediaPreview(
    thumbnailFile,
    initial?.thumbnailPath,
  );
  const videoBusy = isMediaUploadBusy(videoUpload);
  const videoUploadPreviewUrl =
    thumbnailPreviewUrl ?? (videoBusy ? null : videoPreviewUrl);
  const videoUploadPreviewType = thumbnailPreviewUrl
    ? ("image" as const)
    : ("video" as const);

  const videoName =
    videoFile?.name ??
    (initial?.videoPath ? assetDisplayName(initial.videoPath) : null);
  const thumbnailName =
    thumbnailFile?.name ??
    (initial?.thumbnailPath ? assetDisplayName(initial.thumbnailPath) : null);

  const uploadBusy =
    isMediaUploadBusy(videoUpload) || isMediaUploadBusy(thumbnailUpload);

  useEffect(() => {
    onUploadBusyChange?.(uploadBusy);
  }, [onUploadBusyChange, uploadBusy]);

  useEffect(() => {
    return () => {
      videoUploadGenRef.current += 1;
      thumbnailUploadGenRef.current += 1;
      releasePortfolioAudio();
      onUploadBusyChange?.(false);
    };
  }, [onUploadBusyChange]);

  const readVideoDuration = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    const element = document.createElement("video");
    attachHiddenVideo(element);
    element.preload = "metadata";
    element.src = url;
    const finish = () => {
      detachHiddenVideo(element);
      URL.revokeObjectURL(url);
    };
    element.onloadedmetadata = () => {
      const duration = Math.round(element.duration);
      finish();
      if (duration > 0) {
        setForm((current) => ({ ...current, durationSec: duration }));
      }
    };
    element.onerror = finish;
  }, []);

  const startThumbnailUpload = useCallback(async (file: File) => {
    const generation = ++thumbnailUploadGenRef.current;
    setThumbnailPrepared(null);
    setThumbnailUpload({
      status: "preparing",
      progress: 0,
      message: "Preparing thumbnail…",
      error: null,
    });

    try {
      const prepared = await prepareAndUploadImage({
        file,
        dir: "thumbnails",
        isCurrent: () => generation === thumbnailUploadGenRef.current,
        onProgress: (update) => {
          if (generation !== thumbnailUploadGenRef.current) return;
          setThumbnailUpload({
            status: update.status,
            progress: update.progress ?? 0,
            message:
              update.status === "uploading"
                ? `Uploading thumbnail… ${update.progress ?? 0}%`
                : "Preparing thumbnail…",
            error: null,
          });
        },
      });
      if (generation !== thumbnailUploadGenRef.current) return;
      setThumbnailPrepared(prepared);
      setThumbnailUpload({
        status: "ready",
        progress: 100,
        message:
          prepared.kind === "file"
            ? "Thumbnail ready — will upload when you save"
            : "Thumbnail ready",
        error: null,
      });
    } catch (err) {
      if (isUploadAborted(err) || generation !== thumbnailUploadGenRef.current) {
        return;
      }
      const uploadError = toErrorMessage(err, "Thumbnail upload failed.");
      setThumbnailUpload({
        status: "error",
        progress: 0,
        message: uploadError,
        error: uploadError,
      });
      setError(uploadError);
    }
  }, []);

  const startVideoUpload = useCallback(
    async (file: File) => {
      const generation = ++videoUploadGenRef.current;
      thumbnailUploadGenRef.current += 1;
      setVideoHint(null);
      setThumbnailHint(null);
      setVideoPrepared(null);
      setCapturingThumbnail(true);
      setVideoUpload({
        status: "preparing",
        progress: 0,
        message: "Preparing video…",
        error: null,
      });

      try {
        const result = await prepareAndUploadVideo({
          file,
          profile: "portfolio",
          dir: "videos",
          capture: "thumbnail",
          stillDir: "thumbnails",
          isCurrent: () => generation === videoUploadGenRef.current,
          onNotice: (notice) => {
            if (generation !== videoUploadGenRef.current) return;
            setVideoHint(notice);
          },
          onProgress: (update) => {
            if (generation !== videoUploadGenRef.current) return;
            setVideoUpload({
              status: update.status,
              progress: update.progress ?? 0,
              message: update.message,
              error: null,
            });
          },
        });
        if (generation !== videoUploadGenRef.current) return;

        setVideoFile(result.video.file);
        setVideoPrepared(result.video);
        readVideoDuration(result.video.file);
        setVideoUpload({
          status: "ready",
          progress: 100,
          message:
            result.video.kind === "file"
              ? "Video ready — will upload when you save"
              : "Video ready — fill in details and save",
          error: null,
        });

        if (result.still) {
          setThumbnailFile(result.still.file);
          setThumbnailPrepared(result.still);
          setThumbnailUpload({
            status: "ready",
            progress: 100,
            message:
              result.still.kind === "file"
                ? "Thumbnail ready — will upload when you save"
                : "Thumbnail ready",
            error: null,
          });
        } else {
          setThumbnailHint(
            "Couldn't capture a thumbnail from this video. Upload a PNG, JPEG, or WebP cover to save.",
          );
        }
      } catch (err) {
        if (isUploadAborted(err) || generation !== videoUploadGenRef.current) {
          return;
        }
        const uploadError = toErrorMessage(err, "Video upload failed.");
        setVideoUpload({
          status: "error",
          progress: 0,
          message: uploadError,
          error: uploadError,
        });
        setError(uploadError);
      } finally {
        if (generation === videoUploadGenRef.current) {
          setCapturingThumbnail(false);
        }
      }
    },
    [readVideoDuration],
  );

  const saveBlocked =
    isMediaBlockingSave(videoFile, videoUpload, !initial) ||
    isMediaBlockingSave(thumbnailFile, thumbnailUpload, !initial) ||
    capturingThumbnail;

  const submitLabel = saveLabel({
    saving,
    saveMessage,
    capturingThumbnail,
    uploadBusy,
    saveBlocked,
    isNew: !initial,
    hasVideo: Boolean(videoFile),
    hasThumbnail: Boolean(thumbnailFile),
  });

  const resetMedia = () => {
    setVideoFile(null);
    setThumbnailFile(null);
    setVideoPrepared(null);
    setThumbnailPrepared(null);
    setVideoUpload(idleMediaUpload());
    setThumbnailUpload(idleMediaUpload());
    setThumbnailHint(null);
    setVideoHint(null);
    setCapturingThumbnail(false);
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const save = async () => {
    if (saveBlocked) return;

    setSaving(true);
    setError(null);
    setMessage(null);
    setSaveMessage("Saving video details…");

    const payload = new FormData();
    payload.set("title", form.title);
    payload.set("brand", form.brand);
    payload.set("platform", form.platform);
    payload.set("hook", form.hook);
    payload.set("cta", form.cta);
    payload.set("durationSec", String(form.durationSec));
    payload.set("slug", form.slug || slugify(form.title));
    payload.set("featured", String(form.featured));
    payload.set("tagsPresent", "1");

    try {
      if (videoFile) {
        appendPreparedUpload(payload, videoPrepared, {
          url: "videoUrl",
          file: "video",
        });
      }
      if (thumbnailFile) {
        appendPreparedUpload(payload, thumbnailPrepared, {
          url: "thumbnailUrl",
          file: "thumbnail",
        });
      }

      const url = initial ? `/api/videos/${initial.id}` : "/api/videos";
      const method = initial ? "PATCH" : "POST";
      const response = await fetch(url, { method, body: payload });
      const data = await readResponseJson<{ error?: string } & PortfolioVideo>(
        response,
        { payload: "video" },
      );

      if (!response.ok) {
        throw new Error(data.error ?? "Something went wrong.");
      }

      const saved = data as PortfolioVideo;
      setForm({
        title: saved.title,
        brand: saved.brand,
        platform: saved.platform,
        hook: saved.hook,
        cta: saved.cta,
        durationSec: saved.durationSec,
        slug: saved.slug,
        featured: saved.featured,
      });
      resetMedia();
      setMessage("Saved.");
      onSuccess(saved);
    } catch (err) {
      setError(toErrorMessage(err, "Failed to save video."));
    } finally {
      setSaving(false);
    }
  };

  const mediaProgress = (
    <div className="space-y-3 sm:col-span-2">
      {videoFile && videoUpload.status !== "idle" && (
        <UploadProgressBar
          label="Video"
          message={videoUpload.message}
          progress={videoUpload.progress}
          indeterminate={videoUpload.status === "preparing"}
        />
      )}
      {videoHint && (
        <p className="rounded-xl bg-blush/15 px-3 py-2 text-xs text-brown">
          {videoHint}
        </p>
      )}
      {(capturingThumbnail ||
        (thumbnailFile && thumbnailUpload.status !== "idle")) && (
        <UploadProgressBar
          label="Thumbnail"
          message={
            capturingThumbnail
              ? "Capturing thumbnail from video…"
              : thumbnailUpload.message
          }
          progress={thumbnailUpload.progress}
          indeterminate={
            capturingThumbnail || thumbnailUpload.status === "preparing"
          }
        />
      )}
    </div>
  );

  const fields = (
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      {(
        [
          ["title", "Title"],
          ["brand", "Brand"],
          ["hook", "Hook"],
          ["cta", "CTA"],
          ["slug", "Slug (optional)"],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="block text-sm">
          <span className="text-muted">{label}</span>
          <AutoResizeTextarea
            value={form[key]}
            onChange={(event) =>
              setForm((current) => ({ ...current, [key]: event.target.value }))
            }
            className={inputClass}
            required={key === "title" || key === "brand"}
          />
        </label>
      ))}

      <label className="block text-sm">
        <span className="text-muted">Platform</span>
        <select
          value={form.platform}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              platform: event.target.value as Platform,
            }))
          }
          className={inputClass}
        >
          {PLATFORMS.map((platform) => (
            <option key={platform} value={platform}>
              {platform}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="text-muted">Duration (seconds)</span>
        <input
          type="number"
          min={0}
          value={form.durationSec}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              durationSec: Number(event.target.value),
            }))
          }
          className={inputClass}
        />
      </label>

      <div className="block space-y-2 text-sm sm:col-span-2">
        <span className="text-muted">
          Video file {initial ? "(leave empty to keep current)" : ""}
        </span>
        <FileUploadButton
          className="mt-1"
          kind="video"
          inputRef={videoInputRef}
          accept={VIDEO_FILE_ACCEPT}
          hint={videoUploadHelp("portfolio")}
          selectedName={videoName}
          previewUrl={videoUploadPreviewUrl}
          previewType={videoUploadPreviewType}
          required={!initial && !videoFile}
          buttonLabel={initial?.videoPath ? "Swap video" : "Add a video"}
          disabled={isMediaUploadBusy(videoUpload)}
          onChange={(file) => {
            if (file && !isAcceptedVideoFile(file)) {
              releasePortfolioAudio();
              setVideoFile(null);
              setVideoPrepared(null);
              setVideoUpload(idleMediaUpload());
              setError(videoUploadErrorMessage());
              if (videoInputRef.current) videoInputRef.current.value = "";
              return;
            }
            setError(null);
            setThumbnailHint(null);
            if (file) {
              // Must run in this change event, before the upload awaits.
              primePortfolioAudio(file);
            } else {
              releasePortfolioAudio();
            }
            setVideoFile(file);
            if (file) {
              void startVideoUpload(file);
            } else {
              videoUploadGenRef.current += 1;
              setVideoPrepared(null);
              setVideoUpload(idleMediaUpload());
            }
          }}
          onRemove={
            videoFile
              ? () => {
                  videoUploadGenRef.current += 1;
                  thumbnailUploadGenRef.current += 1;
                  releasePortfolioAudio();
                  resetMedia();
                  setError(null);
                }
              : undefined
          }
        />
        {initial?.videoPath && !videoFile && !isMediaUploadBusy(videoUpload) && (
          <p className="flex max-w-full items-start gap-1.5 rounded-full bg-lavender/35 px-2.5 py-1 text-xs font-medium break-words text-ink">
            <span aria-hidden>🌸</span>
            Live on your site
          </p>
        )}
      </div>

      <div className="block space-y-2 text-sm sm:col-span-2">
        <span className="text-muted">
          Thumbnail {initial ? "(leave empty to keep current)" : ""}
        </span>
        <FileUploadButton
          className="mt-1"
          kind="thumbnail"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          selectedName={thumbnailName}
          previewUrl={thumbnailPreviewUrl}
          previewType="image"
          required={!initial && !thumbnailFile}
          buttonLabel={
            initial?.thumbnailPath ? "Swap thumbnail" : "Add a thumbnail"
          }
          hint="Auto-captured from the first frame — or upload your own PNG, JPEG, or WebP"
          disabled={isMediaUploadBusy(thumbnailUpload)}
          onChange={(file) => {
            thumbnailUploadGenRef.current += 1;
            setCapturingThumbnail(false);
            setThumbnailHint(null);
            setThumbnailFile(file);
            setThumbnailPrepared(null);
            if (file) {
              void startThumbnailUpload(file);
            } else {
              setThumbnailUpload(idleMediaUpload());
            }
          }}
          onRemove={
            thumbnailFile
              ? () => {
                  thumbnailUploadGenRef.current += 1;
                  setThumbnailFile(null);
                  setThumbnailPrepared(null);
                  setThumbnailUpload(idleMediaUpload());
                  setThumbnailHint(null);
                  setCapturingThumbnail(false);
                  setError(null);
                }
              : undefined
          }
        />
        {thumbnailHint && (
          <p className="rounded-xl bg-blush/15 px-3 py-2 text-xs text-brown">
            {thumbnailHint}
          </p>
        )}
        {initial?.thumbnailPath &&
          !thumbnailFile &&
          !isMediaUploadBusy(thumbnailUpload) && (
            <p className="flex max-w-full items-start gap-1.5 rounded-full bg-lavender/35 px-2.5 py-1 text-xs font-medium break-words text-ink">
              <span aria-hidden>🌸</span>
              Live on your site
            </p>
          )}
      </div>

      {mediaProgress}

      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          checked={form.featured}
          onChange={(event) =>
            setForm((current) => ({ ...current, featured: event.target.checked }))
          }
          className="h-4 w-4 rounded border-brown/30"
        />
        <span className="text-muted">Show in carousel</span>
      </label>
    </div>
  );

  const saveFooter = (
    <>
      {error && (
        <p className="mb-2 rounded-xl bg-blush/15 px-4 py-2 text-sm text-brown">
          {error}
        </p>
      )}
      {message && (
        <p className="mb-2 rounded-xl bg-lavender/25 px-4 py-2 text-sm text-ink">
          {message}
        </p>
      )}

      <AnimatedButton
        onClick={() => void save()}
        disabled={saving || uploadBusy || saveBlocked}
        className="w-full shadow-md shadow-forest/15 sm:max-w-xs"
      >
        {submitLabel}
      </AnimatedButton>
    </>
  );

  if (embedded) {
    return (
      <div className="min-w-0 space-y-4">
        {fields}
        <div className="border-t border-brown/10 pt-4">{saveFooter}</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="min-w-0 shrink-0 border-b border-brown/10 px-3 pb-4 sm:px-6">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-lg text-brown">
              {initial ? "Edit video" : "Add video"}
            </h3>
            <p className="mt-1 text-sm text-muted">
              {initial?.title ??
                "Pick a video — we'll grab a thumbnail from the first frame."}
            </p>
          </div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-brown/20 px-3 py-1.5 text-sm text-brown hover:bg-cream"
            >
              Back
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-4 sm:px-6 sm:py-5">
        {fields}
      </div>

      <div className="min-w-0 shrink-0 border-t border-brown/10 bg-paper px-3 py-3 sm:px-6">
        {saveFooter}
      </div>
    </div>
  );
}
