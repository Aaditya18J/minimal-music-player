import { useState, useRef, useEffect, useCallback } from "react";
import { useAddHistory } from "./use-history";

export function useAudioPlayer() {
  const [playlist, setPlaylist] = useState<File[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const playlistRef = useRef<File[]>([]);
  
  const { mutate: addHistory } = useAddHistory();

  // Initialize audio element once
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / (audio.duration || 1)) * 100);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      handleNext();
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

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
    };
  }, []);

  // Update ref whenever playlist changes
  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  const playTrack = useCallback(async (index: number) => {
    if (!audioRef.current || index < 0 || index >= playlistRef.current.length) return;
    
    const file = playlistRef.current[index];
    
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    
    audioRef.current.src = url;
    
    try {
      await audioRef.current.play();
      setCurrentIndex(index);
      addHistory({ filename: file.name });
      console.log("Playing track:", index, file.name);
    } catch (err) {
      console.error("Playback failed:", err);
    }
  }, [addHistory]);

  const loadFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files);
    
    setPlaylist(prev => {
      const merged = [...prev, ...newFiles];
      // Mark that we should auto-play when files are added
      if (currentIndex === -1 && merged.length > 0) {
        setShouldAutoPlay(true);
      }
      return merged;
    });
  }, [currentIndex]);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    
    if (audioRef.current.paused) {
      if (currentIndex === -1 && playlist.length > 0) {
        playTrack(0);
      } else if (currentIndex !== -1) {
        audioRef.current.play();
      }
    } else {
      audioRef.current.pause();
    }
  }, [currentIndex, playlist.length, playTrack]);

  const handleNext = useCallback(() => {
    if (playlist.length === 0) return;
    const nextIndex = (currentIndex + 1) % playlist.length;
    playTrack(nextIndex);
  }, [currentIndex, playlist.length, playTrack]);

  const handlePrev = useCallback(() => {
    if (playlist.length === 0) return;
    // If playing for more than 3 seconds, restart current track
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    const prevIndex = currentIndex <= 0 ? playlist.length - 1 : currentIndex - 1;
    playTrack(prevIndex);
  }, [currentIndex, playlist.length, playTrack]);

  const seek = useCallback((percentage: number) => {
    if (!audioRef.current || !duration) return;
    const time = (percentage / 100) * duration;
    audioRef.current.currentTime = time;
  }, [duration]);

  const skipForward = useCallback((seconds: number = 10) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.min(
      audioRef.current.currentTime + seconds,
      duration
    );
  }, [duration]);

  const skipBackward = useCallback((seconds: number = 10) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(
      audioRef.current.currentTime - seconds,
      0
    );
  }, [duration]);

  // Handle auto-play when files are added (after playTrack is defined)
  useEffect(() => {
    if (shouldAutoPlay && currentIndex === -1 && playlist.length > 0) {
      playTrack(0);
      setShouldAutoPlay(false);
    }
  }, [shouldAutoPlay, currentIndex, playlist.length, playTrack]);

  return {
    playlist,
    currentTrack: currentIndex >= 0 ? playlist[currentIndex] : null,
    isPlaying,
    progress,
    currentTime,
    duration,
    loadFiles,
    togglePlayPause,
    playNext: handleNext,
    playPrev: handlePrev,
    seek,
    skipForward,
    skipBackward,
    playTrack,
    currentIndex
  };
}
