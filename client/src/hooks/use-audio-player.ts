import { useState, useRef, useEffect, useCallback } from "react";
import { useAddHistory } from "./use-history";

export type TrackMeta = {
  title?: string;
  artist?: string;
  album?: string;
  year?: number;
  coverArtUrl?: string;
};

export type Track = {
  name: string;
  src: string;
  isObjectUrl: boolean;
  meta?: TrackMeta;
};

export type RepeatMode = "off" | "all" | "one";
export type ScanStatus = "idle" | "scanning" | "success" | "no-bridge" | "failed";
export type ScanType = "android" | "folder" | "none";

declare global {
  interface Window {
    AndroidMusic?: { scanAllMusic: () => string };
    AndroidBridge?: { scanMusic: () => string };
    showDirectoryPicker?: (opts?: { mode?: string }) => Promise<any>;
  }
}

const AUDIO_EXTS = new Set([
  ".mp3", ".flac", ".aac", ".ogg", ".wav", ".m4a",
  ".opus", ".wma", ".mp4", ".webm", ".oga", ".3gp", ".amr",
]);

// Recursively collect audio files from a directory handle
async function collectAudioFiles(dirHandle: any, depth = 0): Promise<File[]> {
  if (depth > 5) return []; // guard against very deep trees
  const files: File[] = [];
  try {
    for await (const [name, handle] of dirHandle.entries()) {
      try {
        if (handle.kind === "file") {
          const ext = name.includes(".")
            ? ("." + name.split(".").pop()).toLowerCase()
            : "";
          if (AUDIO_EXTS.has(ext)) {
            files.push(await handle.getFile());
          }
        } else if (handle.kind === "directory") {
          const sub = await collectAudioFiles(handle, depth + 1);
          files.push(...sub);
        }
      } catch { /* skip unreadable entries */ }
    }
  } catch { /* skip unreadable directories */ }
  return files;
}

// Extract ID3 / metadata from a File
async function extractMetadata(file: File): Promise<TrackMeta | undefined> {
  try {
    const { parseBlob } = await import("music-metadata");
    const meta = await parseBlob(file, { skipCovers: false, duration: false });
    let coverArtUrl: string | undefined;
    const pic = meta.common.picture?.[0];
    if (pic?.data?.length) {
      const blob = new Blob([pic.data], { type: pic.format || "image/jpeg" });
      coverArtUrl = URL.createObjectURL(blob);
    }
    return {
      title: meta.common.title || undefined,
      artist: meta.common.artist || undefined,
      album: meta.common.album || undefined,
      year: meta.common.year || undefined,
      coverArtUrl,
    };
  } catch (e) {
    console.warn("[metadata]", file.name, e);
    return undefined;
  }
}

// Attach metadata to tracks in background, updating playlist as results arrive
function enrichTracksInBackground(
  files: File[],
  insertStart: number,
  setPlaylist: (updater: (prev: Track[]) => Track[]) => void
) {
  files.forEach((file, i) => {
    extractMetadata(file).then(meta => {
      if (!meta) return;
      setPlaylist(prev => {
        const updated = [...prev];
        const idx = insertStart + i;
        if (updated[idx]) {
          if (updated[idx].meta?.coverArtUrl) URL.revokeObjectURL(updated[idx].meta!.coverArtUrl!);
          updated[idx] = { ...updated[idx], meta };
        }
        return updated;
      });
    });
  });
}

export function useAudioPlayer() {
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
  const [shuffleMode, setShuffleMode] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playlistRef = useRef<Track[]>([]);
  const currentIndexRef = useRef(-1);
  const repeatModeRef = useRef<RepeatMode>("off");
  const shuffleModeRef = useRef(false);
  const playTrackRef = useRef<((i: number) => Promise<void>) | null>(null);

  const { mutate: addHistory } = useAddHistory();

  useEffect(() => { playlistRef.current = playlist; }, [playlist]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);
  useEffect(() => { shuffleModeRef.current = shuffleMode; }, [shuffleMode]);

  // Audio element — created once
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    const onTime = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / (audio.duration || 1)) * 100);
    };
    const onMeta = () => setDuration(audio.duration);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.pause(); audio.src = "";
      playlistRef.current.forEach(t => {
        if (t.isObjectUrl) URL.revokeObjectURL(t.src);
        if (t.meta?.coverArtUrl) URL.revokeObjectURL(t.meta.coverArtUrl);
      });
    };
  }, []);

  const playTrackByIndex = useCallback(async (index: number) => {
    if (!audioRef.current || index < 0 || index >= playlistRef.current.length) return;
    const track = playlistRef.current[index];
    audioRef.current.src = track.src;
    try {
      await audioRef.current.play();
      setCurrentIndex(index);
      currentIndexRef.current = index;
      addHistory({ filename: track.name });
    } catch (err) {
      console.error("Playback failed:", err);
    }
  }, [addHistory]);

  useEffect(() => { playTrackRef.current = playTrackByIndex; }, [playTrackByIndex]);

  // Ended handler — uses refs so always fresh
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => {
      const list = playlistRef.current;
      const idx = currentIndexRef.current;
      const repeat = repeatModeRef.current;
      const shuffle = shuffleModeRef.current;
      if (!list.length) return;
      if (repeat === "one") { audio.currentTime = 0; audio.play().catch(() => {}); return; }
      if (shuffle) {
        const pool = list.map((_, i) => i).filter(i => i !== idx);
        if (pool.length) { playTrackRef.current?.(pool[Math.floor(Math.random() * pool.length)]); return; }
        if (repeat === "all") { playTrackRef.current?.(idx); return; }
        return;
      }
      const next = idx + 1;
      if (next < list.length) { playTrackRef.current?.(next); return; }
      if (repeat === "all") { playTrackRef.current?.(0); }
    };
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, [playTrackByIndex]);

  // ── File picker (browser / manual) ──
  const loadFiles = useCallback(async (files: FileList | null) => {
    if (!files || !files.length) return;
    const fileArr = Array.from(files);
    const newTracks: Track[] = fileArr.map(f => ({
      name: f.name, src: URL.createObjectURL(f), isObjectUrl: true,
    }));
    let insertStart = 0;
    setPlaylist(prev => {
      insertStart = prev.length;
      const merged = [...prev, ...newTracks];
      if (currentIndexRef.current === -1 && merged.length) setShouldAutoPlay(true);
      return merged;
    });
    enrichTracksInBackground(fileArr, insertStart, setPlaylist);
  }, []);

  // ── Unified scan: Android → Folder picker → unsupported ──
  const scan = useCallback(async () => {
    // Android bridge
    const bridge = window.AndroidMusic || window.AndroidBridge;
    if (bridge) {
      setScanStatus("scanning");
      try {
        const raw = (bridge as any).scanAllMusic?.() || (bridge as any).scanMusic?.();
        if (!raw) throw new Error("empty");
        const scanned: { name: string; uri: string }[] = JSON.parse(raw);
        if (!scanned.length) throw new Error("empty");
        setPlaylist(scanned.map(item => ({ name: item.name, src: item.uri, isObjectUrl: false })));
        setCurrentIndex(-1);
        setShouldAutoPlay(true);
        setScanStatus("success");
        setTimeout(() => setScanStatus("idle"), 3500);
        return true;
      } catch (err) {
        console.error("Android scan:", err);
        setScanStatus("failed");
        setTimeout(() => setScanStatus("idle"), 3500);
        return false;
      }
    }

    // File System Access API (Windows / Mac / Linux desktop Chrome/Edge)
    if ("showDirectoryPicker" in window) {
      setScanStatus("scanning");
      try {
        const dirHandle = await window.showDirectoryPicker!({ mode: "read" });
        const files = await collectAudioFiles(dirHandle);
        if (!files.length) {
          setScanStatus("failed");
          setTimeout(() => setScanStatus("idle"), 3500);
          return false;
        }
        files.sort((a, b) => a.name.localeCompare(b.name));
        const newTracks: Track[] = files.map(f => ({
          name: f.name, src: URL.createObjectURL(f), isObjectUrl: true,
        }));
        setPlaylist(newTracks);
        setCurrentIndex(-1);
        setShouldAutoPlay(true);
        setScanStatus("success");
        setTimeout(() => setScanStatus("idle"), 3500);
        enrichTracksInBackground(files, 0, setPlaylist);
        return true;
      } catch (err: any) {
        if (err?.name === "AbortError") {
          setScanStatus("idle"); // user cancelled — silent
        } else {
          console.error("Folder scan:", err);
          setScanStatus("failed");
          setTimeout(() => setScanStatus("idle"), 3500);
        }
        return false;
      }
    }

    // Nothing available
    setScanStatus("no-bridge");
    setTimeout(() => setScanStatus("idle"), 3500);
    return false;
  }, []);

  const removeTrackFromQueue = useCallback((index: number) => {
    setPlaylist(prev => {
      const t = prev[index];
      if (t?.isObjectUrl) URL.revokeObjectURL(t.src);
      if (t?.meta?.coverArtUrl) URL.revokeObjectURL(t.meta.coverArtUrl);
      return prev.filter((_, i) => i !== index);
    });
    setCurrentIndex(prev => {
      if (prev === index) { audioRef.current?.pause(); if (audioRef.current) audioRef.current.src = ""; return -1; }
      return prev > index ? prev - 1 : prev;
    });
  }, []);

  // Platform detection
  const isAndroid = typeof window !== "undefined" && !!(window.AndroidMusic || window.AndroidBridge);
  const isFolderScanSupported = typeof window !== "undefined" && "showDirectoryPicker" in window;
  const scanType: ScanType = isAndroid ? "android" : isFolderScanSupported ? "folder" : "none";

  const cycleRepeat = useCallback(() => {
    setRepeatMode(p => p === "off" ? "all" : p === "all" ? "one" : "off");
  }, []);
  const toggleShuffle = useCallback(() => setShuffleMode(p => !p), []);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      if (currentIndexRef.current === -1 && playlistRef.current.length) { playTrackByIndex(0); }
      else if (currentIndexRef.current !== -1) { audioRef.current.play(); }
    } else { audioRef.current.pause(); }
  }, [playTrackByIndex]);

  const handleNext = useCallback(() => {
    const list = playlistRef.current;
    if (!list.length) return;
    if (shuffleModeRef.current) {
      const pool = list.map((_, i) => i).filter(i => i !== currentIndexRef.current);
      if (pool.length) playTrackByIndex(pool[Math.floor(Math.random() * pool.length)]);
      return;
    }
    playTrackByIndex((currentIndexRef.current + 1) % list.length);
  }, [playTrackByIndex]);

  const handlePrev = useCallback(() => {
    const list = playlistRef.current;
    if (!list.length) return;
    if (audioRef.current && audioRef.current.currentTime > 3) { audioRef.current.currentTime = 0; return; }
    const idx = currentIndexRef.current;
    playTrackByIndex(idx <= 0 ? list.length - 1 : idx - 1);
  }, [playTrackByIndex]);

  const seek = useCallback((pct: number) => {
    if (!audioRef.current || !duration) return;
    audioRef.current.currentTime = (pct / 100) * duration;
  }, [duration]);

  const skipForward = useCallback((s = 10) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.min(audioRef.current.currentTime + s, duration);
  }, [duration]);

  const skipBackward = useCallback((s = 10) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(audioRef.current.currentTime - s, 0);
  }, [duration]);

  useEffect(() => {
    if (shouldAutoPlay && currentIndex === -1 && playlist.length) {
      playTrackByIndex(0);
      setShouldAutoPlay(false);
    }
  }, [shouldAutoPlay, currentIndex, playlist.length, playTrackByIndex]);

  return {
    playlist, currentIndex,
    currentTrack: currentIndex >= 0 ? playlist[currentIndex] : null,
    isPlaying, progress, currentTime, duration,
    scanStatus, scanType, isAndroid, isFolderScanSupported,
    repeatMode, shuffleMode,
    loadFiles, scan, removeTrackFromQueue,
    togglePlayPause, playNext: handleNext, playPrev: handlePrev,
    cycleRepeat, toggleShuffle,
    seek, skipForward, skipBackward, playTrack: playTrackByIndex,
  };
}
