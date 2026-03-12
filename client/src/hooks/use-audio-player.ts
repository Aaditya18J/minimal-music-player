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

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playlistRef = useRef<Track[]>([]);
  const currentIndexRef = useRef(-1);

  const { mutate: addHistory } = useAddHistory();

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
    const handleEnded = () => {
      if (playlistRef.current.length > 0) {
        const next = (currentIndexRef.current + 1) % playlistRef.current.length;
        playTrackByIndex(next);
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
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

  useEffect(() => { playlistRef.current = playlist; }, [playlist]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);

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
      if (currentIndex === -1 && merged.length > 0) setShouldAutoPlay(true);
      return merged;
    });

    // Extract metadata in background — non-blocking
    fileArray.forEach((file, i) => {
      extractMetadata(file).then(meta => {
        if (!meta) return;
        setPlaylist(prev => {
          const updated = [...prev];
          const idx = insertStart + i;
          if (updated[idx]) {
            // Revoke old cover art if any
            if (updated[idx].meta?.coverArtUrl) {
              URL.revokeObjectURL(updated[idx].meta!.coverArtUrl!);
            }
            updated[idx] = { ...updated[idx], meta };
          }
          return updated;
        });
      });
    });
  }, [currentIndex]);

  const scanAndroidMusic = useCallback(() => {
    const bridge = window.AndroidMusic || window.AndroidBridge;
    if (!bridge) {
      setScanStatus("no-bridge");
      setTimeout(() => setScanStatus("idle"), 3000);
      return false;
    }

    setScanStatus("scanning");
    try {
      const raw = bridge.scanAllMusic?.() || (bridge as any).scanMusic?.();
      if (!raw) { setScanStatus("failed"); setTimeout(() => setScanStatus("idle"), 3000); return false; }

      const scanned: { name: string; uri: string }[] = JSON.parse(raw);
      if (!scanned.length) { setScanStatus("failed"); setTimeout(() => setScanStatus("idle"), 3000); return false; }

      const newTracks: Track[] = scanned.map(item => ({
        name: item.name,
        src: item.uri,
        isObjectUrl: false,
      }));

      setPlaylist(newTracks);
      setCurrentIndex(-1);
      setShouldAutoPlay(true);
      setScanStatus("success");
      setTimeout(() => setScanStatus("idle"), 3000);
      return true;
    } catch (err) {
      console.error("Scan failed:", err);
      setScanStatus("failed");
      setTimeout(() => setScanStatus("idle"), 3000);
      return false;
    }
  }, []);

  const isAndroid = typeof window !== "undefined" &&
    !!(window.AndroidMusic || window.AndroidBridge);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      if (currentIndex === -1 && playlistRef.current.length > 0) {
        playTrackByIndex(0);
      } else if (currentIndex !== -1) {
        audioRef.current.play();
      }
    } else {
      audioRef.current.pause();
    }
  }, [currentIndex, playTrackByIndex]);

  const handleNext = useCallback(() => {
    if (playlistRef.current.length === 0) return;
    playTrackByIndex((currentIndexRef.current + 1) % playlistRef.current.length);
  }, [playTrackByIndex]);

  const handlePrev = useCallback(() => {
    if (playlistRef.current.length === 0) return;
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    const idx = currentIndexRef.current;
    playTrackByIndex(idx <= 0 ? playlistRef.current.length - 1 : idx - 1);
  }, [playTrackByIndex]);

  const seek = useCallback((percentage: number) => {
    if (!audioRef.current || !duration) return;
    audioRef.current.currentTime = (percentage / 100) * duration;
  }, [duration]);

  const skipForward = useCallback((seconds = 10) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.min(audioRef.current.currentTime + seconds, duration);
  }, [duration]);

  const skipBackward = useCallback((seconds = 10) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(audioRef.current.currentTime - seconds, 0);
  }, [duration]);

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
    loadFiles,
    scanAndroidMusic,
    togglePlayPause,
    playNext: handleNext,
    playPrev: handlePrev,
    seek,
    skipForward,
    skipBackward,
    playTrack: playTrackByIndex,
    currentIndex,
  };
}
