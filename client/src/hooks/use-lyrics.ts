import { useState, useCallback, useEffect } from "react";

interface LyricsData {
  [filename: string]: string;
}

const STORAGE_KEY = "music_player_lyrics";

export function useLyrics(currentTrackName: string | null) {
  const [lyrics, setLyricsState] = useState<string>("");
  const [isEditingLyrics, setIsEditingLyrics] = useState(false);

  // Load lyrics from localStorage on mount and when track changes
  useEffect(() => {
    if (!currentTrackName) {
      setLyricsState("");
      return;
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    const lyricsData: LyricsData = stored ? JSON.parse(stored) : {};
    setLyricsState(lyricsData[currentTrackName] || "");
  }, [currentTrackName]);

  const updateLyrics = useCallback((newLyrics: string) => {
    if (!currentTrackName) return;

    const stored = localStorage.getItem(STORAGE_KEY);
    const lyricsData: LyricsData = stored ? JSON.parse(stored) : {};

    lyricsData[currentTrackName] = newLyrics;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lyricsData));
    setLyricsState(newLyrics);
  }, [currentTrackName]);

  const clearLyrics = useCallback(() => {
    if (!currentTrackName) return;

    const stored = localStorage.getItem(STORAGE_KEY);
    const lyricsData: LyricsData = stored ? JSON.parse(stored) : {};

    delete lyricsData[currentTrackName];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lyricsData));
    setLyricsState("");
  }, [currentTrackName]);

  const toggleEditMode = useCallback(() => {
    setIsEditingLyrics(prev => !prev);
  }, []);

  return {
    lyrics,
    updateLyrics,
    clearLyrics,
    isEditingLyrics,
    setIsEditingLyrics,
    toggleEditMode,
  };
}
