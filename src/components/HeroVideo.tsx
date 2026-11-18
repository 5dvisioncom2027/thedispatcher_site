// (c) The-Dispatcher
import { useRef, useState, useEffect } from "react";
import heroImg from "@/assets/hero-colorist.jpg";
const heroVideoUrl = "/media/hero-colorist.mp4";
const heroVideoHqUrl = "/media/hero-colorist-hq.mp4";

type Props = {
  imageUrl?: string;
  alt: string;
};

export function HeroVideo({ imageUrl, alt }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fsVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [isHover, setIsHover] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Preload metadata so the first hover starts playback instantly.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onReady = () => setVideoReady(true);
    v.addEventListener("loadeddata", onReady);
    v.load();
    return () => v.removeEventListener("loadeddata", onReady);
  }, []);

  // Play / pause based on hover state.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isHover) {
      v.currentTime = 0;
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } else {
      v.pause();
    }
  }, [isHover]);

  const handleEnter = () => setIsHover(true);
  const handleLeave = () => setIsHover(false);

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    const v = videoRef.current;
    if (!el) return;
    const doc = document as Document & {
      webkitExitFullscreen?: () => void;
    };
    const elFs = el as HTMLElement & {
      webkitRequestFullscreen?: () => void;
    };
    const isFs =
      document.fullscreenElement ||
      (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement;
    if (isFs) {
      if (document.exitFullscreen) document.exitFullscreen();
      else doc.webkitExitFullscreen?.();
    } else {
      try {
        if (el.requestFullscreen) await el.requestFullscreen();
        else elFs.webkitRequestFullscreen?.();
      } catch {
        /* ignore */
      }
      setIsFullscreen(true);
      if (v) v.pause();
    }
  };

  // Play HQ video (with sound) once fullscreen layer is mounted with its src.
  useEffect(() => {
    if (!isFullscreen) return;
    const fs = fsVideoRef.current;
    if (!fs) return;
    fs.muted = false;
    fs.currentTime = 0;
    fs.load();
    const tryPlay = () => {
      const p = fs.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };
    tryPlay();
    // Retry once data is buffered in case the first play() raced the load.
    fs.addEventListener("loadeddata", tryPlay);
    fs.addEventListener("canplay", tryPlay);
    return () => {
      fs.removeEventListener("loadeddata", tryPlay);
      fs.removeEventListener("canplay", tryPlay);
    };
  }, [isFullscreen]);

  // Track fullscreen state and restore silent hover preview on exit (e.g. via Esc).
  useEffect(() => {
    const onFsChange = () => {
      const v = videoRef.current;
      const fs = fsVideoRef.current;
      const isFs =
        document.fullscreenElement ||
        (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement;
      if (isFs) {
        setIsFullscreen(true);
      } else {
        setIsFullscreen(false);
        if (fs) fs.pause();
        if (v) v.muted = true;
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onDoubleClick={toggleFullscreen}
    >
      <div className="pointer-events-none absolute -inset-6 rounded-3xl bg-gradient-to-b from-primary/20 via-transparent to-transparent blur-2xl" />
      {/* Static image — always present as poster; fades out once video is playing. */}
      <img
        src={imageUrl || heroImg}
        alt={alt}
        width={1920}
        height={1088}
        className={`h-full w-full object-cover transition-opacity duration-500 ${
          isHover && videoReady ? "opacity-0" : "opacity-100"
        }`}
      />
      {/* Hover video layer */}
      <video
        ref={videoRef}
        src={heroVideoUrl}
        poster={imageUrl || heroImg}
        muted
        loop
        playsInline
        preload="metadata"
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
          isHover && videoReady ? "opacity-100" : "opacity-0"
        }`}
      />
      {/* Fullscreen HQ video layer — with sound, plays once, shown only in fullscreen */}
      <video
        ref={fsVideoRef}
        src={isFullscreen ? heroVideoHqUrl : undefined}
        playsInline
        preload="none"
        className={`absolute inset-0 h-full w-full bg-black object-contain ${
          isFullscreen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      {/* Tech overlay — hidden in fullscreen */}
      <div className={`pointer-events-none absolute inset-0 ${isFullscreen ? "hidden" : ""}`}>
        <div className="absolute left-4 top-4 rounded-md border border-primary/40 bg-background/70 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-primary backdrop-blur">
          CLUSTER · 08 NODES · SYNC OK
        </div>
        <div className="absolute bottom-4 right-4 rounded-md border border-border bg-background/70 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground backdrop-blur">
          RESOLVE 21 · 4320p · HDR ST2084
        </div>
        {/* hover/double-click hint */}
        <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-md border border-primary/40 bg-background/70 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-primary backdrop-blur opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          {isHover ? "▶ live preview" : "hover to play · double-click fullscreen"}
        </div>
      </div>
    </div>
  );
}
