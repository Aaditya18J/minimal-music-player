import { useState, useRef, useEffect, useCallback } from "react";
import { useAddHistory } from "./use-history";

// Unified track type that works for both browser files and Android URIs
export type Track = {
  name: string;
  src: string;
  isObjectUrl: boolean; // true = we created it, must revoke on cleanup
};

// Declare the Android bridge types so TypeScript knows about them
declare global {
  interface Window {
    AndroidMusic?: {
      scanAllMusic: () => string; // Returns JSON string of [{name, uri}]
    };
    AndroidBridge?: {
      scanMusic: () => string; // Alternate name Gemini may have used
    };
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
  const [isScanning, setIsScanning] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playlistRef = useRef<Track[]>([]);

  const { mutate: addHistory } = useAddHistory();

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
    const handleEnded = () => {
      // Use ref to avoid stale closure
      const idx = playlistRef.current.findIndex((_, i) => i === currentIndexRef.current);
      const next = (idx + 1) % playlistRef.current.length;
      if (playlistRef.current.length > 0) playTrackByIndex(next);
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
      // Revoke any object URLs we created
      playlistRef.current.forEach(t => { if (t.isObjectUrl) URL.revokeObjectURL(t.src); });
    };
  }, []);

  // Keep refs in sync
  useEffect(() => { playlistRef.current = playlist; }, [playlist]);
  const currentIndexRef = useRef(-1);
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

  // Load files from the browser file picker
  const loadFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newTracks: Track[] = Array.from(files).map(file => ({
      name: file.name,
      src: URL.createObjectURL(file),
      isObjectUrl: true,
    }));
    setPlaylist(prev => {
      const merged = [...prev, ...newTracks];
      if (currentIndex === -1 && merged.length > 0) setShouldAutoPlay(true);
      return merged;
    });
  }, [currentIndex]);

  // Load tracks from Android MediaStore scanner
  const scanAndroidMusic = useCallback(() => {
    // Support both bridge names (AndroidMusic from our code, AndroidBridge from Gemini's)
    const bridge = window.AndroidMusic || window.AndroidBridge;
    if (!bridge) {
      console.warn("No Android bridge found. This feature only works in the Android app.");
      return false;
    }

    setIsScanning(true);
    try {
      const raw = bridge.scanAllMusic?.() || (bridge as any).scanMusic?.();
      if (!raw) { setIsScanning(false); return false; }

      const scanned: { name: string; uri: string }[] = JSON.parse(raw);
      if (!scanned.length) { setIsScanning(false); return false; }

      const newTracks: Track[] = scanned.map(item => ({
        name: item.name,
        src: item.uri, // content:// URI — Android WebView can play these directly
        isObjectUrl: false,
      }));

      setPlaylist(newTracks); // Replace playlist with full device scan
      setCurrentIndex(-1);
      setShouldAutoPlay(true);
      setIsScanning(false);
      return true;
    } catch (err) {
      console.error("Scan failed:", err);
      setIsScanning(false);
      return false;
    }
  }, []);

  // Check if Android bridge is available
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
    const next = (currentIndexRef.current + 1) % playlistRef.current.length;
    playTrackByIndex(next);
  }, [playTrackByIndex]);

  const handlePrev = useCallback(() => {
    if (playlistRef.current.length === 0) return;
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    const idx = currentIndexRef.current;
    const prev = idx <= 0 ? playlistRef.current.length - 1 : idx - 1;
    playTrackByIndex(prev);
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

  // Auto-play when new tracks are loaded
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
    isScanning,
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
