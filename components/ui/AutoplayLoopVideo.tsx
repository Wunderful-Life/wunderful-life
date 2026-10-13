"use client";

import { useEffect, useRef, useState } from "react";
import {
  containFitForVideo,
  coverFitForVideo,
  stillCanvasSize,
  type MediaIntrinsicSize,
  type VideoObjectFit,
} from "@/lib/videos/cover-fit";

type AutoplayLoopVideoProps = {
  src: string;
  poster?: string;
  className?: string;
  muted?: boolean;
  showMuteToggle?: boolean;
  /** Start loading immediately. Use for above-the-fold hero video. */
  eager?: boolean;
  /** Safari-safe box fit. Cover fills and may crop; contain never crops. */
  fit?: VideoObjectFit;
  onIntrinsicSize?: (size: MediaIntrinsicSize) => void;
  "aria-hidden"?: boolean;
  tabIndex?: number;
};

function shouldLoadDecorativeVideo() {
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  if (!connection) return true;
  if (connection.saveData) return false;
  return connection.effectiveType !== "slow-2g" && connection.effectiveType !== "2g";
}

function scheduleIdle(callback: () => void) {
  if (typeof window.requestIdleCallback === "function") {
    const idleId = window.requestIdleCallback(callback, { timeout: 2200 });
    return () => window.cancelIdleCallback(idleId);
  }
  const timeoutId = window.setTimeout(callback, 800);
  return () => window.clearTimeout(timeoutId);
}

function applyCssObjectFit(video: HTMLVideoElement, fit: VideoObjectFit) {
  video.style.width = "100%";
  video.style.height = "100%";
  video.style.maxWidth = "";
  video.style.maxHeight = "";
  video.style.inset = "0";
  video.style.objectFit = fit;
  video.style.objectPosition = "center";
  video.style.transformOrigin = "center center";
  video.style.transform = "translateZ(0)";
}

function mediaFitForVideo(
  options: Parameters<typeof coverFitForVideo>[0],
  fit: VideoObjectFit,
) {
  switch (fit) {
    case "cover":
      return coverFitForVideo(options);
    case "contain":
      return containFitForVideo(options);
    default: {
      const _exhaustive: never = fit;
      return _exhaustive;
    }
  }
}

/**
 * Fit the box at the clip's real ratio. Sizing the <video> to the
 * container's aspect (then relying on object-fit) stretches on Safari —
 * portrait lifestyle clips become a wide, flattened still.
 */
function fitVideoToDisplaySize(
  video: HTMLVideoElement,
  container: HTMLElement,
  objectFit: VideoObjectFit,
) {
  const width = container.clientWidth;
  const height = container.clientHeight;
  const fit = mediaFitForVideo(
    {
      sourceWidth: video.videoWidth,
      sourceHeight: video.videoHeight,
      containerWidth: width,
      containerHeight: height,
      devicePixelRatio: window.devicePixelRatio || 1,
      // Full-viewport heroes do not need 3x decode; that stalls first paint.
      maxDevicePixelRatio: width * height > 400_000 ? 1.25 : 2,
    },
    objectFit,
  );
  if (!fit) {
    applyCssObjectFit(video, objectFit);
    return;
  }

  video.style.width = `${fit.width}px`;
  video.style.height = `${fit.height}px`;
  video.style.maxWidth = "none";
  video.style.maxHeight = "none";
  video.style.left = `${fit.left}px`;
  video.style.top = `${fit.top}px`;
  video.style.right = "auto";
  video.style.bottom = "auto";
  video.style.objectFit = "fill";
  video.style.objectPosition = "center";
  video.style.transformOrigin = "0 0";
  video.style.transform =
    fit.scale === 1 ? "translateZ(0)" : `scale(${fit.scale}) translateZ(0)`;
}

/** Overlap long enough to hide the decoder seek, short enough to stay a dissolve. */
const LOOP_FADE_MS = 420;

function primeInlineAutoplay(video: HTMLVideoElement, muted: boolean) {
  video.muted = muted;
  video.defaultMuted = muted;
  video.playsInline = true;
  video.autoplay = true;
  if (muted) {
    video.setAttribute("muted", "");
  } else {
    video.removeAttribute("muted");
  }
  video.setAttribute("autoplay", "");
  video.setAttribute("playsinline", "true");
  video.setAttribute("webkit-playsinline", "true");
  video.setAttribute("x-webkit-airplay", "deny");
  video.disablePictureInPicture = true;
}

function primeMutedInline(video: HTMLVideoElement) {
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.autoplay = false;
  video.removeAttribute("autoplay");
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "true");
  video.setAttribute("webkit-playsinline", "true");
  video.disablePictureInPicture = true;
}

function parkAtStart(video: HTMLVideoElement) {
  video.pause();
  try {
    if (video.currentTime > 0.02) video.currentTime = 0;
  } catch {
    // Seek throws if metadata is not ready yet.
  }
}

export function AutoplayLoopVideo({
  src,
  poster,
  className,
  muted: mutedProp = true,
  showMuteToggle = false,
  eager = false,
  fit = "cover",
  onIntrinsicSize,
  "aria-hidden": ariaHidden,
  tabIndex,
}: AutoplayLoopVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const standbyVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inViewRef = useRef(eager);
  const decodeFailedRef = useRef(false);
  const playInFlightRef = useRef(false);
  const frontRef = useRef<0 | 1>(0);
  const handoffLockRef = useRef(false);
  const pendingRevealRef = useRef<0 | 1>(0);
  const handoffTimerRef = useRef<number | null>(null);
  const seamlessFailedRef = useRef(false);
  const [inView, setInView] = useState(eager);
  const [idleReady, setIdleReady] = useState(eager);
  const [muted, setMuted] = useState(mutedProp);
  const [playing, setPlaying] = useState(false);
  const [hasFrame, setHasFrame] = useState(Boolean(poster));
  const [appliedSrc, setAppliedSrc] = useState(src);
  const [appliedPoster, setAppliedPoster] = useState(poster);
  const [standbySrc, setStandbySrc] = useState<string | null>(null);
  const [seamless, setSeamless] = useState(false);
  const [front, setFront] = useState<0 | 1>(0);
  const [reveal, setReveal] = useState<0 | 1 | null>(null);
  const [handoff, setHandoff] = useState(false);
  const activeSrc = (eager || (idleReady && inView)) ? src : null;
  const showCover = !playing;
  const hasPoster = Boolean(poster);

  if (src !== appliedSrc || poster !== appliedPoster) {
    setAppliedSrc(src);
    setAppliedPoster(poster);
    setPlaying(false);
    setHasFrame(Boolean(poster));
    setStandbySrc(null);
    setSeamless(false);
    setFront(0);
    setReveal(null);
    setHandoff(false);
  }

  useEffect(() => {
    frontRef.current = 0;
    handoffLockRef.current = false;
    pendingRevealRef.current = 0;
    seamlessFailedRef.current = false;
    if (handoffTimerRef.current !== null) {
      window.clearTimeout(handoffTimerRef.current);
      handoffTimerRef.current = null;
    }
  }, [src, poster]);

  useEffect(() => {
    decodeFailedRef.current = false;
    playInFlightRef.current = false;
  }, [src, poster]);

  useEffect(() => {
    if (eager) return;
    if (!shouldLoadDecorativeVideo()) return;
    return scheduleIdle(() => setIdleReady(true));
  }, [eager, src]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    // Eager (hero) starts as in-view so play() is not gated on the first
    // IntersectionObserver tick. Safari/Chrome often report "hidden" or wait
    // until a scroll before delivering that callback.
    if (eager) {
      inViewRef.current = true;
    }

    let confirmedVisible = false;
    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries.some((entry) => entry.isIntersecting);
        if (isVisible) {
          confirmedVisible = true;
          inViewRef.current = true;
          setInView(true);
          const video =
            frontRef.current === 0 ? videoRef.current : standbyVideoRef.current;
          if (video && !decodeFailedRef.current) {
            primeInlineAutoplay(video, muted);
            void video.play().catch(() => undefined);
          }
          return;
        }
        if (!confirmedVisible) {
          return;
        }
        inViewRef.current = false;
        setInView(false);
        if (handoffTimerRef.current !== null) {
          window.clearTimeout(handoffTimerRef.current);
          handoffTimerRef.current = null;
        }
        handoffLockRef.current = false;
        setHandoff(false);
        setReveal(null);
        const frontVideo =
          frontRef.current === 0 ? videoRef.current : standbyVideoRef.current;
        for (const video of [videoRef.current, standbyVideoRef.current]) {
          if (!video) continue;
          if (video === frontVideo) {
            video.pause();
          } else {
            parkAtStart(video);
          }
        }
        setPlaying(false);
      },
      {
        rootMargin: eager ? "200px" : "80px",
        threshold: 0,
      },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [eager, muted, src]);

  useEffect(() => {
    const video = frontRef.current === 0 ? videoRef.current : standbyVideoRef.current;
    if (!video || !activeSrc) return;

    primeInlineAutoplay(video, muted);

    const captureFrame = () => {
      if (hasPoster) return;
      const canvas = canvasRef.current;
      const size = stillCanvasSize(
        video.videoWidth,
        video.videoHeight,
        window.devicePixelRatio || 1,
      );
      if (!canvas || !size) return;
      if (canvas.width !== size.width || canvas.height !== size.height) {
        canvas.width = size.width;
        canvas.height = size.height;
      }
      const context = canvas.getContext("2d");
      if (!context) return;
      try {
        context.drawImage(video, 0, 0, size.width, size.height);
        setHasFrame(true);
      } catch {
        // Cross-origin frames can fail; CSS still hides native play chrome.
      }
    };

    const canAttemptPlay = () =>
      inViewRef.current &&
      !decodeFailedRef.current &&
      document.visibilityState !== "hidden";

    const tryPlay = () => {
      if (!canAttemptPlay()) return;
      if (!video.paused || playInFlightRef.current) return;
      primeInlineAutoplay(video, muted);
      playInFlightRef.current = true;
      void video
        .play()
        .then(() => {
          playInFlightRef.current = false;
        })
        .catch(() => {
          playInFlightRef.current = false;
          setPlaying(false);
        });
    };

    const onReady = () => {
      captureFrame();
      tryPlay();
    };

    const onPlaying = () => setPlaying(true);

    const onPause = () => {
      const frontVideo =
        frontRef.current === 0 ? videoRef.current : standbyVideoRef.current;
      if (frontVideo !== video || handoffLockRef.current) return;
      // Native `loop` restarts by pausing and seeking. A second play() here
      // stacks another seek on that one and stretches the gap into a stall.
      const remaining = Number.isFinite(video.duration)
        ? video.duration - video.currentTime
        : Number.POSITIVE_INFINITY;
      const atLoopRestart = video.loop && remaining <= 0.35;
      const nearEnd = seamless && remaining <= 0.25;
      if (video.seeking || atLoopRestart || nearEnd) return;
      captureFrame();
      if (canAttemptPlay()) {
        tryPlay();
        return;
      }
      setPlaying(false);
    };

    const onError = () => {
      decodeFailedRef.current = true;
      playInFlightRef.current = false;
      setPlaying(false);
    };

    tryPlay();
    const playAfterLayout = window.requestAnimationFrame(tryPlay);
    video.addEventListener("canplay", onReady);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", captureFrame);
    video.addEventListener("seeked", captureFrame);
    video.addEventListener("error", onError);
    document.addEventListener("visibilitychange", tryPlay);

    return () => {
      window.cancelAnimationFrame(playAfterLayout);
      video.removeEventListener("canplay", onReady);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", captureFrame);
      video.removeEventListener("seeked", captureFrame);
      video.removeEventListener("error", onError);
      document.removeEventListener("visibilitychange", tryPlay);
    };
  }, [activeSrc, front, hasPoster, muted, seamless]);

  // The understudy uses the same URL, but only after the visible clip has
  // buffer ahead of the playhead. Low fetch priority keeps that second read
  // from competing with first paint or the frames already on screen.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playing || !activeSrc) return;

    let armed = false;
    const arm = () => {
      if (armed || decodeFailedRef.current) return;
      armed = true;
      setStandbySrc(activeSrc);
    };
    const tryArm = () => {
      if (armed) return;
      const buffered =
        video.buffered.length > 0
          ? video.buffered.end(video.buffered.length - 1)
          : 0;
      const duration = video.duration;
      const complete =
        Number.isFinite(duration) && duration > 0 && buffered >= duration - 0.3;
      if (complete || buffered - video.currentTime >= 2) arm();
    };

    tryArm();
    const timeoutId = window.setTimeout(arm, 1500);
    video.addEventListener("progress", tryArm);
    return () => {
      window.clearTimeout(timeoutId);
      video.removeEventListener("progress", tryArm);
    };
  }, [playing, activeSrc]);

  useEffect(() => {
    const video = standbyVideoRef.current;
    if (!video || !standbySrc || seamlessFailedRef.current) return;

    let cancelled = false;
    let primed = false;
    const prime = () => {
      if (cancelled || primed || seamlessFailedRef.current || frontRef.current === 1) {
        return;
      }
      primed = true;
      primeMutedInline(video);
      parkAtStart(video);
      setSeamless(true);
    };

    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) prime();
    video.addEventListener("canplay", prime);
    return () => {
      cancelled = true;
      video.removeEventListener("canplay", prime);
    };
  }, [standbySrc]);

  useEffect(() => {
    if (!seamless) return;
    const video = frontRef.current === 0 ? videoRef.current : standbyVideoRef.current;
    if (!video) return;

    const failHandoff = (outgoing: HTMLVideoElement) => {
      handoffLockRef.current = false;
      seamlessFailedRef.current = true;
      setSeamless(false);
      setHandoff(false);
      setReveal(null);
      outgoing.loop = true;
      if (outgoing.ended || outgoing.paused) {
        try {
          outgoing.currentTime = 0;
        } catch {
          // Metadata can be missing if the element was reset.
        }
        primeInlineAutoplay(outgoing, muted);
        void outgoing.play().catch(() => undefined);
      }
    };

    const startHandoff = () => {
      if (handoffLockRef.current) return;
      if (document.visibilityState === "hidden" || !inViewRef.current) return;
      const from = frontRef.current;
      const incoming = from === 0 ? standbyVideoRef.current : videoRef.current;
      const outgoing = from === 0 ? videoRef.current : standbyVideoRef.current;
      if (!incoming || !outgoing) return;

      handoffLockRef.current = true;
      primeInlineAutoplay(incoming, muted);
      pendingRevealRef.current = from === 0 ? 1 : 0;

      let began = false;
      const begin = () => {
        if (began) return;
        began = true;
        void incoming
          .play()
          .then(() => {
            if (!handoffLockRef.current) {
              incoming.pause();
              return;
            }
            setHandoff(true);
          })
          .catch(() => failHandoff(outgoing));
      };

      // The understudy is parked on frame 0. If a previous pass left it
      // later in the clip, wait for the seek so the dissolve starts on
      // the first frame instead of a mid-clip jump.
      if (incoming.currentTime > 0.05) {
        let seekWait = 0;
        const onSeeked = () => {
          incoming.removeEventListener("seeked", onSeeked);
          window.clearTimeout(seekWait);
          begin();
        };
        seekWait = window.setTimeout(() => {
          incoming.removeEventListener("seeked", onSeeked);
          begin();
        }, 400);
        incoming.addEventListener("seeked", onSeeked);
        try {
          incoming.pause();
          incoming.currentTime = 0;
        } catch {
          incoming.removeEventListener("seeked", onSeeked);
          window.clearTimeout(seekWait);
          begin();
        }
        return;
      }

      begin();
    };

    const onTime = () => {
      if (handoffLockRef.current) return;
      const duration = video.duration;
      const lead = LOOP_FADE_MS / 1000 + 0.12;
      // The pass that just faded in is already ~one fade into the clip.
      // Require it to play past that overlap so a short clip can't immediately
      // hand off again. Clips too short for a gap fall through to `ended`.
      if (!Number.isFinite(duration) || duration <= lead * 2) return;
      if (video.currentTime <= lead) return;
      const remaining = duration - video.currentTime;
      if (remaining <= lead && remaining > 0.04) startHandoff();
    };

    const onEnded = () => {
      if (handoffLockRef.current) return;
      startHandoff();
    };

    video.addEventListener("timeupdate", onTime);
    video.addEventListener("ended", onEnded);
    let frameId = 0;
    if (typeof video.requestVideoFrameCallback === "function") {
      const watchFrames: VideoFrameRequestCallback = () => {
        onTime();
        frameId = video.requestVideoFrameCallback(watchFrames);
      };
      frameId = video.requestVideoFrameCallback(watchFrames);
    }

    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("ended", onEnded);
      if (frameId && typeof video.cancelVideoFrameCallback === "function") {
        video.cancelVideoFrameCallback(frameId);
      }
    };
  }, [seamless, front, activeSrc, muted]);

  useEffect(() => {
    if (!handoff) return;
    const frame = window.requestAnimationFrame(() => {
      if (!handoffLockRef.current) return;
      setReveal(pendingRevealRef.current);
    });
    handoffTimerRef.current = window.setTimeout(() => {
      handoffTimerRef.current = null;
      if (!handoffLockRef.current) return;
      const next = pendingRevealRef.current;
      const outgoing = next === 0 ? standbyVideoRef.current : videoRef.current;
      frontRef.current = next;
      if (outgoing) parkAtStart(outgoing);
      setFront(next);
      setReveal(null);
      setHandoff(false);
      handoffLockRef.current = false;
    }, LOOP_FADE_MS);

    return () => {
      window.cancelAnimationFrame(frame);
      if (handoffTimerRef.current !== null) {
        window.clearTimeout(handoffTimerRef.current);
        handoffTimerRef.current = null;
      }
    };
  }, [handoff]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const apply = () => {
      for (const video of [videoRef.current, standbyVideoRef.current]) {
        if (video) fitVideoToDisplaySize(video, container, fit);
      }
    };
    apply();
    const frame = window.requestAnimationFrame(apply);
    const observer = new ResizeObserver(apply);
    observer.observe(container);
    const videos = [videoRef.current, standbyVideoRef.current];
    for (const video of videos) {
      video?.addEventListener("loadedmetadata", apply);
      video?.addEventListener("loadeddata", apply);
    }
    window.addEventListener("resize", apply);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      for (const video of videos) {
        video?.removeEventListener("loadedmetadata", apply);
        video?.removeEventListener("loadeddata", apply);
      }
      window.removeEventListener("resize", apply);
    };
  }, [activeSrc, standbySrc, fit]);

  useEffect(() => {
    if (!onIntrinsicSize) return;

    let cancelled = false;
    const report = (width: number, height: number) => {
      if (cancelled || width < 2 || height < 2) return;
      onIntrinsicSize({ width, height });
    };

    let videoReported = false;
    const reportFrom = (width: number, height: number, source: "poster" | "video") => {
      if (source === "poster" && videoReported) return;
      if (source === "video") videoReported = true;
      report(width, height);
    };

    if (poster) {
      const image = new Image();
      const reportPoster = () =>
        reportFrom(image.naturalWidth, image.naturalHeight, "poster");
      image.onload = reportPoster;
      image.src = poster;
      if (image.complete) reportPoster();
    }

    const video = videoRef.current;
    const reportVideo = () => {
      if (!video) return;
      reportFrom(video.videoWidth, video.videoHeight, "video");
    };
    video?.addEventListener("loadedmetadata", reportVideo);
    video?.addEventListener("loadeddata", reportVideo);
    reportVideo();

    return () => {
      cancelled = true;
      video?.removeEventListener("loadedmetadata", reportVideo);
      video?.removeEventListener("loadeddata", reportVideo);
    };
  }, [activeSrc, onIntrinsicSize, poster]);

  const clipClass = (index: 0 | 1) => {
    const shown = index === reveal || (index === front && playing);
    return [
      "autoplay-loop-video pointer-events-none absolute inset-0 h-full w-full object-center",
      index === reveal ? "z-[3]" : "z-[1]",
      fit === "contain" ? "object-contain" : "object-cover",
      // iOS Safari will not decode a fully transparent <video>, so keep a
      // sliver of opacity until this layer is the one on screen.
      shown ? "opacity-100" : "opacity-[0.01]",
      handoff ? "is-handoff" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");
  };

  return (
    <div
      ref={containerRef}
      className="autoplay-loop-clip absolute inset-0 h-full w-full overflow-hidden"
      style={{ ["--loop-fade" as string]: `${LOOP_FADE_MS}ms` }}
    >
      {/*
        No crossOrigin. R2 does not send Access-Control-Allow-Origin, and an
        anonymous media request makes Chrome reject a playable MP4. The loop
        dissolve stacks two video elements; it does not read pixels.
      */}
      <video
        ref={videoRef}
        src={activeSrc ?? undefined}
        autoPlay
        muted={muted}
        loop={!seamless}
        playsInline
        preload={eager ? "auto" : "metadata"}
        poster={poster}
        {...{
          fetchPriority: eager ? "high" : "auto",
        }}
        controlsList="nodownload nofullscreen noremoteplayback"
        disablePictureInPicture
        disableRemotePlayback
        tabIndex={tabIndex}
        aria-hidden={ariaHidden}
        className={clipClass(0)}
      />
      <video
        ref={standbyVideoRef}
        src={standbySrc ?? undefined}
        muted={muted}
        loop={!seamless}
        playsInline
        preload={standbySrc ? "auto" : "none"}
        {...{
          fetchPriority: "low",
        }}
        controlsList="nodownload nofullscreen noremoteplayback"
        disablePictureInPicture
        disableRemotePlayback
        aria-hidden
        className={clipClass(1)}
      />
      {poster ? (
        // Native img so this URL matches the layout preload (next/image would rewrite it).
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          aria-hidden
          fetchPriority={eager ? "high" : "auto"}
          className={`pointer-events-none absolute inset-0 z-[4] h-full w-full object-center ${
            fit === "contain" ? "object-contain" : "object-cover"
          } ${showCover ? "opacity-100" : "opacity-0"}`}
        />
      ) : null}
      {!hasPoster ? (
        <canvas
          ref={canvasRef}
          aria-hidden
          className={`pointer-events-none absolute inset-0 z-[4] h-full w-full object-center ${
            fit === "contain" ? "object-contain" : "object-cover"
          } ${showCover && hasFrame ? "opacity-100" : "opacity-0"}`}
        />
      ) : null}
      {showMuteToggle ? (
        <button
          type="button"
          onClick={() => {
            const nextMuted = !muted;
            setMuted(nextMuted);
            const frontVideo =
              frontRef.current === 0 ? videoRef.current : standbyVideoRef.current;
            for (const video of [videoRef.current, standbyVideoRef.current]) {
              if (!video) continue;
              video.muted = nextMuted;
            }
            if (frontVideo) {
              primeInlineAutoplay(frontVideo, nextMuted);
              decodeFailedRef.current = false;
              void frontVideo.play().catch(() => undefined);
            }
          }}
          aria-pressed={!muted}
          className="absolute right-3 bottom-3 z-10 rounded-full border border-white/50 bg-forest-deep/70 px-3 py-1.5 font-label text-[11px] font-semibold tracking-[0.12em] text-paper uppercase backdrop-blur-md transition hover:bg-forest-deep"
        >
          {muted ? "Unmute" : "Mute"}
        </button>
      ) : null}
    </div>
  );
}
