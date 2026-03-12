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

declare global {
  interface Window {
    AndroidMusic?: { scanAllMusic: () => string };
    AndroidBridge?: { scanMusic: () => string };
  }
}

async function extractMetadata(file: File): Promise<TrackMeta | undefined> {
  try {
    const mm = await import("music-metadata-browser");
    const meta = await mm.parseBlob(file, { skipCovers: false });
    let coverArtUrl: string | undefined;
    const pic = meta.common.picture?.[0];
    if (pic) {
      const blob = new Blob([pic.data], { type: pic.format });
      coverArtUrl = URL.createObjectURL(blob);
    }
    return {
      title: meta.common.title,
      artist: meta.common.artist,
      album: meta.common.album,
      year: meta.common.year,
      coverArtUrl,
    };
  } catch {
    return undefined;
  }
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
  const playTrackRef = useRef<((index: number) => Promise<void>) | null>(null);

  const { mutate: addHistory } = useAddHistory();

  // Keep all refs in sync
  useEffect(() => { playlistRef.current = playlist; }, [playlist]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);
  useEffect(() => { shuffleModeRef.current = shuffleMode; }, [shuffleMode]);

  // Initialize audio element once
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / (audio.duration || 1)) * 100);
    };
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.pause();
      audio.src = "";
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

  // Keep playTrackRef current
  useEffect(() => { playTrackRef.current = playTrackByIndex; }, [playTrackByIndex]);

  // Ended handler — separate effect so it can use latest playTrack
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      const list = playlistRef.current;
      const idx = currentIndexRef.current;
      const repeat = repeatModeRef.current;
      const shuffle = shuffleModeRef.current;

      if (list.length === 0) return;

      if (repeat === "one") {
        audio.currentTime = 0;
        audio.play().catch(console.error);
        return;
      }

      if (shuffle) {
        const available = list.map((_, i) => i).filter(i => i !== idx);
        if (available.length > 0) {
          playTrackRef.current?.(available[Math.floor(Math.random() * available.length)]);
        } else if (repeat === "all") {
          playTrackRef.current?.(idx);
        }
        return;
      }

      const next = idx + 1;
      if (next < list.length) {
        playTrackRef.current?.(next);
      } else if (repeat === "all") {
        playTrackRef.current?.(0);
      }
      // repeat === "off" and at end → stop (do nothing)
    };

    audio.addEventListener("ended", handleEnded);
    return () => audio.removeEventListener("ended", handleEnded);
  }, [playTrackByIndex]);

  const loadFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);

    const newTracks: Track[] = fileArray.map(file => ({
      name: file.name,
      src: URL.createObjectURL(file),
      isObjectUrl: true,
    }));

    let insertStart = 0;
    setPlaylist(prev => {
      insertStart = prev.length;
      const merged = [...prev, ...newTracks];
      if (currentIndexRef.current === -1 && merged.length > 0) setShouldAutoPlay(true);
      return merged;
    });

    // Extract metadata in background
    fileArray.forEach((file, i) => {
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
  }, []);

  const removeTrackFromQueue = useCallback((index: number) => {
    setPlaylist(prev => {
      const track = prev[index];
      if (track?.isObjectUrl) URL.revokeObjectURL(track.src);
      if (track?.meta?.coverArtUrl) URL.revokeObjectURL(track.meta.coverArtUrl);
      return prev.filter((_, i) => i !== index);
    });
    setCurrentIndex(prev => {
      if (prev === index) {
        audioRef.current?.pause();
        if (audioRef.current) audioRef.current.src = "";
        return -1;
      }
      return prev > index ? prev - 1 : prev;
    });
  }, []);

  const scanAndroidMusic = useCallback(() => {
    const bridge = window.AndroidMusic || window.AndroidBridge;
    if (!bridge) {
      setScanStatus("no-bridge");
      setTimeout(() => setScanStatus("idle"), 3500);
      return false;
    }
    setScanStatus("scanning");
    try {
      const raw = (bridge as any).scanAllMusic?.() || (bridge as any).scanMusic?.();
      if (!raw) { setScanStatus("failed"); setTimeout(() => setScanStatus("idle"), 3500); return false; }

      const scanned: { name: string; uri: string }[] = JSON.parse(raw);
      if (!scanned.length) { setScanStatus("failed"); setTimeout(() => setScanStatus("idle"), 3500); return false; }

      const newTracks: Track[] = scanned.map(item => ({
        name: item.name, src: item.uri, isObjectUrl: false,
      }));
      setPlaylist(newTracks);
      setCurrentIndex(-1);
      setShouldAutoPlay(true);
      setScanStatus("success");
      setTimeout(() => setScanStatus("idle"), 3500);
      return true;
    } catch (err) {
      console.error("Scan failed:", err);
      setScanStatus("failed");
      setTimeout(() => setScanStatus("idle"), 3500);
      return false;
    }
  }, []);

  const isAndroid = typeof window !== "undefined" &&
    !!(window.AndroidMusic || window.AndroidBridge);

  const cycleRepeat = useCallback(() => {
    setRepeatMode(prev =>
      prev === "off" ? "all" : prev === "all" ? "one" : "off"
    );
  }, []);

  const toggleShuffle = useCallback(() => setShuffleMode(p => !p), []);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      if (currentIndexRef.current === -1 && playlistRef.current.length > 0) {
        playTrackByIndex(0);
      } else if (currentIndexRef.current !== -1) {
        audioRef.current.play();
      }
    } else {
      audioRef.current.pause();
    }
  }, [playTrackByIndex]);

  const handleNext = useCallback(() => {
    const list = playlistRef.current;
    if (list.length === 0) return;
    if (shuffleModeRef.current) {
      const available = list.map((_, i) => i).filter(i => i !== currentIndexRef.current);
      if (available.length > 0) {
        playTrackByIndex(available[Math.floor(Math.random() * available.length)]);
      }
      return;
    }
    playTrackByIndex((currentIndexRef.current + 1) % list.length);
  }, [playTrackByIndex]);

  const handlePrev = useCallback(() => {
    const list = playlistRef.current;
    if (list.length === 0) return;
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
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

  // Auto-play when new tracks loaded
  useEffect(() => {
    if (shouldAutoPlay && currentIndex === -1 && playlist.length > 0) {
      playTrackByIndex(0);
      setShouldAutoPlay(false);
    }
  }, [shouldAutoPlay, currentIndex, playlist.length, playTrackByIndex]);

  return {
    playlist,
    currentTrack: currentIndex >= 0 ? playlist[currentIndex] : null,
    isPlaying,
    progress,
    currentTime,
    duration,
    scanStatus,
    isAndroid,
    repeatMode,
    shuffleMode,
    currentIndex,
    loadFiles,
    scanAndroidMusic,
    removeTrackFromQueue,
    togglePlayPause,
    playNext: handleNext,
    playPrev: handlePrev,
    cycleRepeat,
    toggleShuffle,
    seek,
    skipForward,
    skipBackward,
    playTrack: playTrackByIndex,
  };
}
