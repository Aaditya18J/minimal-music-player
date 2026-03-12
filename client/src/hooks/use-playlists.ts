import { useState, useEffect, useCallback } from "react";
import type { Track } from "./use-audio-player";

export type SavedPlaylist = {
  id: string;
  name: string;
  trackNames: string[];
  createdAt: number;
};

const KEY = "mplayer_playlists_v1";

function load(): SavedPlaylist[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}

export function usePlaylists() {
  const [playlists, setPlaylists] = useState<SavedPlaylist[]>(load);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(playlists));
  }, [playlists]);

  const createPlaylist = useCallback((name: string): string => {
    const id = `pl_${Date.now()}`;
    setPlaylists(prev => [...prev, {
      id,
      name: name.trim() || "New Playlist",
      trackNames: [],
      createdAt: Date.now(),
    }]);
    return id;
  }, []);

  const deletePlaylist = useCallback((id: string) => {
    setPlaylists(prev => prev.filter(p => p.id !== id));
  }, []);

  const renamePlaylist = useCallback((id: string, name: string) => {
    setPlaylists(prev => prev.map(p =>
      p.id === id ? { ...p, name: name.trim() || p.name } : p
    ));
  }, []);

  const addTrackToPlaylist = useCallback((playlistId: string, trackName: string) => {
    setPlaylists(prev => prev.map(p =>
      p.id === playlistId && !p.trackNames.includes(trackName)
        ? { ...p, trackNames: [...p.trackNames, trackName] }
        : p
    ));
  }, []);

  const removeTrackFromPlaylist = useCallback((playlistId: string, trackName: string) => {
    setPlaylists(prev => prev.map(p =>
      p.id === playlistId
        ? { ...p, trackNames: p.trackNames.filter(n => n !== trackName) }
        : p
    ));
  }, []);

  const getMatchingTracks = useCallback(
    (playlistId: string, allTracks: Track[]): { track: Track; index: number }[] => {
      const pl = playlists.find(p => p.id === playlistId);
      if (!pl) return [];
      return allTracks
        .map((track, index) => ({ track, index }))
        .filter(({ track }) => pl.trackNames.includes(track.name));
    },
    [playlists]
  );

  const isTrackInPlaylist = useCallback(
    (playlistId: string, trackName: string): boolean => {
      const pl = playlists.find(p => p.id === playlistId);
      return pl ? pl.trackNames.includes(trackName) : false;
    },
    [playlists]
  );

  return {
    playlists,
    createPlaylist,
    deletePlaylist,
    renamePlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    getMatchingTracks,
    isTrackInPlaylist,
  };
}
