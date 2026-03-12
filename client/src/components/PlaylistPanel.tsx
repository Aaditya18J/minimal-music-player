import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Music2, Play, Volume2, Trash2, Plus, Search,
  ArrowUpDown, ChevronDown, ChevronUp, ListMusic, Layers,
  Check, Edit2
} from "lucide-react";
import type { Track } from "@/hooks/use-audio-player";
import { usePlaylists } from "@/hooks/use-playlists";

type SortField = "name" | "artist" | "album" | "added";
type Tab = "queue" | "playlists";

interface PlaylistPanelProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: Track[];
  currentIndex: number;
  isPlaying: boolean;
  onPlay: (index: number) => void;
  onRemove: (index: number) => void;
  onPlayAll: (firstIndex: number) => void;
}

function fmt(name: string) { return name.replace(/\.[^/.]+$/, ""); }

export function PlaylistPanel({
  isOpen, onClose, playlist, currentIndex, isPlaying, onPlay, onRemove, onPlayAll,
}: PlaylistPanelProps) {
  const [tab, setTab] = useState<Tab>("queue");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("added");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [menuTrackName, setMenuTrackName] = useState<string | null>(null);
  const [expandedPlaylistId, setExpandedPlaylistId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const createInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const {
    playlists, createPlaylist, deletePlaylist, renamePlaylist,
    addTrackToPlaylist, removeTrackFromPlaylist, getMatchingTracks, isTrackInPlaylist,
  } = usePlaylists();

  useEffect(() => {
    if (showCreate) createInputRef.current?.focus();
  }, [showCreate]);

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  // Sorted + filtered queue
  const displayTracks = useMemo(() => {
    const indexed = playlist.map((track, index) => ({ track, index }));
    const filtered = search.trim()
      ? indexed.filter(({ track }) => {
          const q = search.toLowerCase();
          return (track.meta?.title || fmt(track.name)).toLowerCase().includes(q)
            || (track.meta?.artist || "").toLowerCase().includes(q)
            || (track.meta?.album || "").toLowerCase().includes(q);
        })
      : indexed;

    return [...filtered].sort((a, b) => {
      if (sortField === "added") {
        return sortDir === "asc" ? a.index - b.index : b.index - a.index;
      }
      let va = "", vb = "";
      if (sortField === "name") {
        va = a.track.meta?.title || fmt(a.track.name);
        vb = b.track.meta?.title || fmt(b.track.name);
      } else if (sortField === "artist") {
        va = a.track.meta?.artist || "";
        vb = b.track.meta?.artist || "";
      } else if (sortField === "album") {
        va = a.track.meta?.album || "";
        vb = b.track.meta?.album || "";
      }
      const cmp = va.localeCompare(vb);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [playlist, search, sortField, sortDir]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function handleCreatePlaylist() {
    if (!newName.trim()) return;
    createPlaylist(newName.trim());
    setNewName("");
    setShowCreate(false);
  }

  function handleRenameSubmit(id: string) {
    if (editingName.trim()) renamePlaylist(id, editingName.trim());
    setEditingId(null);
    setEditingName("");
  }

  function handlePlayPlaylist(plId: string) {
    const matches = getMatchingTracks(plId, playlist);
    if (matches.length > 0) {
      onPlayAll(matches[0].index);
      onClose();
    }
  }

  const SortBtn = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className={`flex items-center gap-1 text-[10px] uppercase tracking-widest px-2 py-1 rounded transition-colors ${
        sortField === field
          ? "text-white bg-white/10"
          : "text-white/40 hover:text-white/70"
      }`}
    >
      {label}
      {sortField === field && (
        sortDir === "asc" ? <ChevronUp size={10} /> : <ChevronDown size={10} />
      )}
    </button>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            data-testid="playlist-backdrop"
          />

          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="fixed right-0 top-0 h-screen w-full md:w-[420px] bg-[#080808] border-l border-white/10 z-50 flex flex-col overflow-hidden"
            data-testid="playlist-panel"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
              <div className="flex gap-1 bg-white/5 rounded-lg p-1">
                <button
                  onClick={() => setTab("queue")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs uppercase tracking-widest font-medium transition-all ${
                    tab === "queue" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
                  }`}
                  data-testid="tab-queue"
                >
                  <ListMusic size={13} />
                  Queue
                  {playlist.length > 0 && (
                    <span className="font-mono">{playlist.length}</span>
                  )}
                </button>
                <button
                  onClick={() => setTab("playlists")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs uppercase tracking-widest font-medium transition-all ${
                    tab === "playlists" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
                  }`}
                  data-testid="tab-playlists"
                >
                  <Layers size={13} />
                  Playlists
                  {playlists.length > 0 && (
                    <span className="font-mono">{playlists.length}</span>
                  )}
                </button>
              </div>
              <button onClick={onClose} className="hover-glow p-2 text-white/40 ml-2" data-testid="button-close-playlist">
                <X size={18} />
              </button>
            </div>

            {/* ── QUEUE TAB ── */}
            {tab === "queue" && (
              <div className="flex flex-col flex-1 min-h-0">
                {/* Search + Sort */}
                <div className="px-4 pb-3 flex-shrink-0 space-y-2">
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search tracks..."
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-4 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/20"
                      data-testid="input-search-queue"
                    />
                    {search && (
                      <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    <ArrowUpDown size={11} className="text-white/30 mr-1" />
                    <SortBtn field="added" label="Added" />
                    <SortBtn field="name" label="Title" />
                    <SortBtn field="artist" label="Artist" />
                    <SortBtn field="album" label="Album" />
                  </div>
                </div>

                {/* Track List */}
                <div className="flex-1 overflow-y-auto">
                  {displayTracks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-white/20">
                      <Music2 size={36} strokeWidth={0.5} />
                      <p className="text-xs uppercase tracking-widest">
                        {search ? "No matches" : "No tracks loaded"}
                      </p>
                    </div>
                  ) : (
                    <ul className="py-1">
                      {displayTracks.map(({ track, index }) => {
                        const isCurrent = index === currentIndex;
                        const title = track.meta?.title || fmt(track.name);
                        const artist = track.meta?.artist;
                        const isMenuOpen = menuTrackName === track.name;

                        return (
                          <li key={index} className="relative" data-testid={`track-item-${index}`}>
                            <div className={`flex items-center gap-3 px-4 py-2.5 group transition-colors ${
                              isCurrent ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"
                            }`}>
                              {/* Cover art */}
                              <div className="w-9 h-9 flex-shrink-0 rounded overflow-hidden relative cursor-pointer" onClick={() => { onPlay(index); onClose(); }}>
                                {track.meta?.coverArtUrl ? (
                                  <img src={track.meta.coverArtUrl} alt={title} className="w-full h-full object-contain bg-black" />
                                ) : (
                                  <div className="w-full h-full bg-white/5 border border-white/10 flex items-center justify-center">
                                    <span className="text-[10px] text-white/30 font-mono">{index + 1}</span>
                                  </div>
                                )}
                                {isCurrent && (
                                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <Volume2 size={12} className={`text-white ${isPlaying ? "animate-pulse" : ""}`} />
                                  </div>
                                )}
                                {!isCurrent && (
                                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Play size={11} className="text-white ml-0.5" />
                                  </div>
                                )}
                              </div>

                              {/* Title/Artist */}
                              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { onPlay(index); onClose(); }}>
                                <p className={`text-sm truncate font-light ${isCurrent ? "text-white" : "text-white/60 group-hover:text-white/80"}`}>
                                  {title}
                                </p>
                                {artist && (
                                  <p className="text-[11px] text-white/30 truncate mt-0.5">{artist}</p>
                                )}
                              </div>

                              {/* Playing bars */}
                              {isCurrent && (
                                <div className="flex items-end gap-[2px] h-4 flex-shrink-0">
                                  {[5, 9, 7].map((h, i) => (
                                    <div
                                      key={i}
                                      className="w-[3px] bg-white/50 rounded-sm"
                                      style={{
                                        height: isPlaying ? `${h}px` : "3px",
                                        animation: isPlaying ? `pulse ${0.8 + i * 0.2}s ease-in-out infinite alternate` : "none",
                                      }}
                                    />
                                  ))}
                                </div>
                              )}

                              {/* Actions */}
                              <div className={`flex items-center gap-1 flex-shrink-0 transition-opacity ${isCurrent ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                                {/* Add to playlist */}
                                <button
                                  onClick={(e) => { e.stopPropagation(); setMenuTrackName(isMenuOpen ? null : track.name); }}
                                  className="p-1.5 text-white/40 hover:text-white/80 transition-colors rounded hover:bg-white/10"
                                  title="Add to playlist"
                                  data-testid={`button-add-to-playlist-${index}`}
                                >
                                  <Plus size={13} />
                                </button>
                                {/* Remove from queue */}
                                <button
                                  onClick={() => onRemove(index)}
                                  className="p-1.5 text-white/40 hover:text-red-400/70 transition-colors rounded hover:bg-white/10"
                                  title="Remove from queue"
                                  data-testid={`button-remove-${index}`}
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            </div>

                            {/* Add-to-playlist dropdown */}
                            <AnimatePresence>
                              {isMenuOpen && (
                                <motion.div
                                  initial={{ opacity: 0, y: -5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -5 }}
                                  transition={{ duration: 0.15 }}
                                  className="absolute right-4 top-full mt-1 w-56 bg-[#111] border border-white/15 rounded-xl shadow-2xl z-10 overflow-hidden"
                                >
                                  <div className="px-3 py-2 border-b border-white/10">
                                    <p className="text-[10px] uppercase tracking-widest text-white/40">Add to playlist</p>
                                  </div>
                                  {playlists.length === 0 ? (
                                    <div className="px-3 py-3 text-xs text-white/30">No playlists yet</div>
                                  ) : (
                                    <ul>
                                      {playlists.map(pl => {
                                        const inPl = isTrackInPlaylist(pl.id, track.name);
                                        return (
                                          <li key={pl.id}>
                                            <button
                                              onClick={() => {
                                                if (!inPl) addTrackToPlaylist(pl.id, track.name);
                                                setMenuTrackName(null);
                                              }}
                                              className="w-full flex items-center justify-between px-3 py-2.5 text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                                            >
                                              <span className="truncate">{pl.name}</span>
                                              {inPl && <Check size={11} className="text-white/40 flex-shrink-0" />}
                                            </button>
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  )}
                                  <div className="border-t border-white/10">
                                    <button
                                      onClick={() => { setTab("playlists"); setShowCreate(true); setMenuTrackName(null); }}
                                      className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                                    >
                                      <Plus size={11} />
                                      New playlist
                                    </button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* ── PLAYLISTS TAB ── */}
            {tab === "playlists" && (
              <div className="flex flex-col flex-1 min-h-0">
                {/* Create playlist */}
                <div className="px-4 pb-3 flex-shrink-0">
                  {showCreate ? (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="flex gap-2"
                    >
                      <input
                        ref={createInputRef}
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") handleCreatePlaylist();
                          if (e.key === "Escape") { setShowCreate(false); setNewName(""); }
                        }}
                        placeholder="Playlist name..."
                        className="flex-1 bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/25"
                        data-testid="input-playlist-name"
                      />
                      <button
                        onClick={handleCreatePlaylist}
                        className="px-3 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-xs text-white/70 hover:text-white transition-colors"
                      >
                        Create
                      </button>
                      <button
                        onClick={() => { setShowCreate(false); setNewName(""); }}
                        className="p-2 text-white/30 hover:text-white/60 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </motion.div>
                  ) : (
                    <button
                      onClick={() => setShowCreate(true)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 border border-white/10 hover:border-white/20 rounded-lg text-xs uppercase tracking-widest text-white/40 hover:text-white/70 transition-all"
                      data-testid="button-create-playlist"
                    >
                      <Plus size={13} />
                      New Playlist
                    </button>
                  )}
                </div>

                {/* Playlists list */}
                <div className="flex-1 overflow-y-auto px-4 pb-4">
                  {playlists.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-white/20">
                      <Layers size={36} strokeWidth={0.5} />
                      <p className="text-xs uppercase tracking-widest text-center">
                        No playlists yet<br />Create one above
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {playlists.map(pl => {
                        const isExpanded = expandedPlaylistId === pl.id;
                        const matchTracks = getMatchingTracks(pl.id, playlist);
                        const isEditing = editingId === pl.id;

                        return (
                          <li key={pl.id} className="border border-white/10 rounded-xl overflow-hidden">
                            {/* Playlist header */}
                            <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] group">
                              <div
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() => setExpandedPlaylistId(isExpanded ? null : pl.id)}
                              >
                                {isEditing ? (
                                  <input
                                    ref={editInputRef}
                                    value={editingName}
                                    onChange={e => setEditingName(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === "Enter") handleRenameSubmit(pl.id);
                                      if (e.key === "Escape") { setEditingId(null); }
                                    }}
                                    onBlur={() => handleRenameSubmit(pl.id)}
                                    className="bg-transparent border-b border-white/20 text-sm text-white focus:outline-none w-full pb-0.5"
                                    onClick={e => e.stopPropagation()}
                                    data-testid={`input-rename-${pl.id}`}
                                  />
                                ) : (
                                  <p className="text-sm text-white/80 font-light truncate">{pl.name}</p>
                                )}
                                <p className="text-[10px] text-white/30 uppercase tracking-widest mt-0.5">
                                  {pl.trackNames.length} track{pl.trackNames.length !== 1 ? "s" : ""}
                                  {matchTracks.length > 0 && matchTracks.length < pl.trackNames.length && (
                                    <span className="ml-1">· {matchTracks.length} loaded</span>
                                  )}
                                </p>
                              </div>

                              <div className="flex items-center gap-1">
                                {matchTracks.length > 0 && (
                                  <button
                                    onClick={() => handlePlayPlaylist(pl.id)}
                                    className="p-1.5 text-white/40 hover:text-white/80 hover:bg-white/10 rounded transition-colors"
                                    title="Play playlist"
                                    data-testid={`button-play-playlist-${pl.id}`}
                                  >
                                    <Play size={13} />
                                  </button>
                                )}
                                <button
                                  onClick={() => { setEditingId(pl.id); setEditingName(pl.name); }}
                                  className="p-1.5 text-white/40 hover:text-white/80 hover:bg-white/10 rounded transition-colors"
                                  title="Rename"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  onClick={() => deletePlaylist(pl.id)}
                                  className="p-1.5 text-white/40 hover:text-red-400/70 hover:bg-white/10 rounded transition-colors"
                                  title="Delete playlist"
                                  data-testid={`button-delete-playlist-${pl.id}`}
                                >
                                  <Trash2 size={12} />
                                </button>
                                <button
                                  onClick={() => setExpandedPlaylistId(isExpanded ? null : pl.id)}
                                  className="p-1.5 text-white/30 hover:text-white/60 transition-colors"
                                >
                                  {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                </button>
                              </div>
                            </div>

                            {/* Expanded track list */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  {pl.trackNames.length === 0 ? (
                                    <p className="px-4 py-3 text-xs text-white/30 italic">No tracks added yet</p>
                                  ) : (
                                    <ul className="border-t border-white/5">
                                      {pl.trackNames.map((name, i) => {
                                        const match = playlist.find(t => t.name === name);
                                        return (
                                          <li key={i} className="flex items-center gap-3 px-4 py-2 hover:bg-white/[0.03] group/track">
                                            <div className="w-7 h-7 flex-shrink-0 rounded overflow-hidden">
                                              {match?.meta?.coverArtUrl ? (
                                                <img src={match.meta.coverArtUrl} alt={name} className="w-full h-full object-contain bg-black" />
                                              ) : (
                                                <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                                  <Music2 size={10} className="text-white/20" />
                                                </div>
                                              )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <p className={`text-xs truncate ${match ? "text-white/60" : "text-white/25 line-through"}`}>
                                                {match?.meta?.title || fmt(name)}
                                              </p>
                                              {match?.meta?.artist && (
                                                <p className="text-[10px] text-white/25 truncate">{match.meta.artist}</p>
                                              )}
                                            </div>
                                            <button
                                              onClick={() => removeTrackFromPlaylist(pl.id, name)}
                                              className="p-1 text-white/20 hover:text-red-400/60 transition-colors opacity-0 group-hover/track:opacity-100"
                                              title="Remove from playlist"
                                            >
                                              <X size={11} />
                                            </button>
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
