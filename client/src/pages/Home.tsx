import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, SkipBack, SkipForward, Plus, Clock,
  Disc3, Rewind, FastForward, Mic2, ScanLine, Loader2, List, CheckCircle, AlertCircle
} from "lucide-react";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { useHistory } from "@/hooks/use-history";
import { useLyrics } from "@/hooks/use-lyrics";
import { MinimalProgressBar } from "@/components/AudioVisualizer";
import { LyricsPanel } from "@/components/LyricsPanel";
import { PlaylistPanel } from "@/components/PlaylistPanel";

function formatTime(seconds: number) {
  if (isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatTitle(filename: string) {
  return filename.replace(/\.[^/.]+$/, "");
}

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);

  const {
    currentTrack,
    isPlaying,
    progress,
    currentTime,
    duration,
    scanStatus,
    isAndroid,
    loadFiles,
    scanAndroidMusic,
    togglePlayPause,
    playNext,
    playPrev,
    seek,
    skipForward,
    skipBackward,
    playlist,
    currentIndex,
    playTrack,
  } = useAudioPlayer();

  const { data: historyItems, isLoading: isHistoryLoading } = useHistory();

  const {
    lyrics,
    updateLyrics,
    clearLyrics,
    isEditingLyrics,
    toggleEditMode,
  } = useLyrics(currentTrack?.name || null);

  const displayTitle = currentTrack?.meta?.title || (currentTrack ? formatTitle(currentTrack.name) : "");
  const displayArtist = currentTrack?.meta?.artist;
  const displayAlbum = currentTrack?.meta?.album;
  const coverArtUrl = currentTrack?.meta?.coverArtUrl;

  const togglePlaylist = () => {
    setIsPlaylistOpen(v => !v);
    if (isLyricsOpen) setIsLyricsOpen(false);
  };

  const toggleLyrics = () => {
    setIsLyricsOpen(v => !v);
    if (isPlaylistOpen) setIsPlaylistOpen(false);
  };

  const scanLabel = scanStatus === "scanning" ? "Scanning..."
    : scanStatus === "success" ? "Found!"
    : scanStatus === "no-bridge" ? "Android only"
    : scanStatus === "failed" ? "Scan failed"
    : "Scan";

  return (
    <div className="min-h-screen w-full flex flex-col bg-black text-white p-6 md:p-12 relative overflow-hidden">

      {/* Hidden File Input */}
      <input
        type="file"
        accept="audio/*"
        multiple
        ref={fileInputRef}
        onChange={(e) => loadFiles(e.target.files)}
        className="hidden"
        data-testid="input-file"
      />

      {/* Scan status toast */}
      <AnimatePresence>
        {scanStatus !== "idle" && scanStatus !== "scanning" && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-5 py-3 rounded-full border border-white/10 bg-black/90 backdrop-blur-lg text-sm"
          >
            {scanStatus === "success" && <CheckCircle size={14} className="text-green-400" />}
            {(scanStatus === "no-bridge" || scanStatus === "failed") && <AlertCircle size={14} className="text-white/50" />}
            <span className={`text-xs uppercase tracking-widest font-light ${
              scanStatus === "success" ? "text-green-400"
              : scanStatus === "no-bridge" ? "text-white/50"
              : "text-red-400/70"
            }`}>
              {scanStatus === "success" && `${playlist.length} tracks loaded`}
              {scanStatus === "no-bridge" && "Auto scan only works in the Android app"}
              {scanStatus === "failed" && "Scan returned no results"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header */}
      <header className="flex justify-between items-center z-10">
        <div className="flex items-center gap-3 opacity-50">
          <Disc3
            size={18}
            className={isPlaying ? "animate-[spin_4s_linear_infinite]" : ""}
          />
          <span className="text-sm tracking-widest font-medium uppercase">Player</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Playlist / Queue button */}
          <button
            onClick={togglePlaylist}
            className={`flex items-center gap-2 text-sm uppercase tracking-widest font-medium hover-glow transition-opacity ${
              isPlaylistOpen ? "opacity-100" : "opacity-50"
            }`}
            data-testid="button-playlist"
          >
            <List size={16} />
            {playlist.length > 0 && (
              <span className="text-xs font-mono">{playlist.length}</span>
            )}
          </button>

          {/* Lyrics button — only shown when track is loaded */}
          {currentTrack && (
            <button
              onClick={toggleLyrics}
              className={`flex items-center gap-2 text-sm uppercase tracking-widest font-medium hover-glow transition-opacity ${
                isLyricsOpen ? "opacity-100" : "opacity-50"
              }`}
              data-testid="button-lyrics"
            >
              <Mic2 size={16} />
              <span className="hidden md:inline">Lyrics</span>
            </button>
          )}

          {/* Auto Scan */}
          <button
            onClick={scanAndroidMusic}
            disabled={scanStatus === "scanning"}
            className="flex items-center gap-2 text-sm uppercase tracking-widest font-medium opacity-50 hover-glow disabled:opacity-20"
            data-testid="button-scan"
            title={isAndroid ? "Scan all music on device" : "Auto-scan (Android app only)"}
          >
            {scanStatus === "scanning" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ScanLine size={16} />
            )}
            <span className="hidden md:inline">{scanLabel}</span>
          </button>

          {/* Load files */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 text-sm uppercase tracking-widest font-medium opacity-50 hover-glow"
            data-testid="button-load"
          >
            <Plus size={16} />
            <span className="hidden md:inline">Load</span>
          </button>
        </div>
      </header>

      {/* Main Player Area */}
      <main className="flex-1 flex flex-col justify-center items-center max-w-5xl mx-auto w-full z-10 mt-12 md:mt-0 px-4">
        <AnimatePresence mode="wait">
          {currentTrack ? (
            <motion.div
              key="player"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="w-full flex flex-col md:flex-row items-center md:items-start gap-12 md:gap-16"
            >
              {/* Cover Art */}
              <div className="flex-shrink-0">
                <motion.div
                  key={coverArtUrl || "no-art"}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="w-64 h-64 md:w-80 md:h-80 rounded-lg border border-white/10 overflow-hidden bg-gradient-to-br from-white/5 to-white/[0.02] flex items-center justify-center backdrop-blur-sm hover:border-white/20 transition-colors duration-500"
                >
                  {coverArtUrl ? (
                    <img
                      src={coverArtUrl}
                      alt={displayTitle}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-6">
                      <motion.div
                        animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
                        transition={{ duration: isPlaying ? 3 : 0.5, repeat: isPlaying ? Infinity : 0, ease: "linear" }}
                      >
                        <Disc3 size={80} strokeWidth={0.5} className="text-white/30" />
                      </motion.div>
                      <div className="text-center">
                        <p className="text-sm text-white/50 uppercase tracking-widest">Now Playing</p>
                        <p className="text-xs text-white/30 uppercase tracking-widest mt-2">
                          {playlist.length} track{playlist.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Controls & Info */}
              <div className="flex-1 w-full md:w-auto flex flex-col gap-8">
                {/* Title + Artist */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h1 className="text-3xl md:text-4xl font-light tracking-tight leading-tight line-clamp-2 break-words">
                    {displayTitle}
                  </h1>
                  {displayArtist && (
                    <p className="text-white/50 mt-2 text-lg font-light tracking-wide">
                      {displayArtist}
                      {displayAlbum && <span className="text-white/30"> — {displayAlbum}</span>}
                    </p>
                  )}
                  {!displayArtist && (
                    <p className="text-white/20 mt-2 text-sm uppercase tracking-widest">Unknown Artist</p>
                  )}
                </motion.div>

                {/* Metadata Grid */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="grid grid-cols-2 gap-6 text-sm"
                >
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Duration</p>
                    <p className="font-mono text-white/70">{formatTime(duration)}</p>
                  </div>
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Position</p>
                    <p className="font-mono text-white/70">{formatTime(currentTime)}</p>
                  </div>
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Track</p>
                    <p className="font-mono text-white/70">{currentIndex + 1} of {playlist.length}</p>
                  </div>
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Status</p>
                    <p className="font-mono text-white/70">{isPlaying ? "Playing" : "Paused"}</p>
                  </div>
                </motion.div>

                {/* Progress Bar */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="w-full flex flex-col items-center gap-3"
                >
                  <MinimalProgressBar progress={progress} onSeek={seek} />
                  <div className="w-full flex justify-between text-xs text-white/40 font-mono tracking-wider">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </motion.div>

                {/* Playback Controls */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="flex items-center justify-center gap-6 md:gap-8 mt-4"
                >
                  <button onClick={() => playPrev()} className="hover-glow p-3 text-white/60" data-testid="button-prev-track">
                    <SkipBack size={20} strokeWidth={1.5} />
                  </button>
                  <button onClick={() => skipBackward(10)} className="hover-glow p-3 text-white/60" data-testid="button-rewind">
                    <Rewind size={20} strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={togglePlayPause}
                    className="hover-glow p-4 rounded-full border border-white/20 hover:border-white/40 transition-colors"
                    data-testid="button-play-pause"
                  >
                    {isPlaying
                      ? <Pause size={28} strokeWidth={1.2} />
                      : <Play size={28} strokeWidth={1.2} className="ml-1" />
                    }
                  </button>
                  <button onClick={() => skipForward(10)} className="hover-glow p-3 text-white/60" data-testid="button-forward">
                    <FastForward size={20} strokeWidth={1.5} />
                  </button>
                  <button onClick={() => playNext()} className="hover-glow p-3 text-white/60" data-testid="button-next-track">
                    <SkipForward size={20} strokeWidth={1.5} />
                  </button>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="flex items-center justify-center gap-4 mt-2 text-xs text-white/40"
                >
                  <span className="font-mono">-10s</span>
                  <span>•</span>
                  <span className="font-mono">+10s</span>
                </motion.div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center justify-center gap-16"
            >
              <button
                onClick={() => fileInputRef.current?.click()}
                className="group relative flex flex-col items-center justify-center"
                data-testid="button-load-music"
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-40 h-40 md:w-56 md:h-56 rounded-xl border border-white/20 group-hover:border-white/40 flex items-center justify-center transition-all duration-700 backdrop-blur-sm bg-white/[0.02]"
                >
                  <Play size={48} strokeWidth={0.5} className="text-white/40 group-hover:text-white/70 transition-colors duration-700" />
                </motion.div>
                <span className="absolute -bottom-10 text-sm tracking-[0.3em] font-light text-white/60 group-hover:text-white transition-colors duration-500">
                  LOAD MUSIC
                </span>
              </button>

              <motion.button
                onClick={scanAndroidMusic}
                disabled={scanStatus === "scanning"}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-3 px-8 py-3 rounded-lg border border-white/10 hover:border-white/25 text-white/40 hover:text-white/70 transition-all text-sm tracking-widest uppercase font-light disabled:opacity-30"
                data-testid="button-scan-empty"
              >
                {scanStatus === "scanning"
                  ? <Loader2 size={16} className="animate-spin" />
                  : <ScanLine size={16} />
                }
                {scanStatus === "scanning" ? "Scanning device..." : "Auto Scan Music"}
              </motion.button>

              {!isAndroid && (
                <p className="text-xs text-white/20 uppercase tracking-widest text-center -mt-8">
                  Auto scan works in the Android app
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* History Footer */}
      <footer className="mt-auto pt-12 md:pt-0 z-10 w-full max-w-4xl mx-auto">
        <div className="border-t border-[#111] pt-8">
          <div className="flex items-center gap-2 mb-6 opacity-30">
            <Clock size={14} />
            <h3 className="text-xs uppercase tracking-widest font-medium">History</h3>
          </div>

          {isHistoryLoading ? (
            <div className="text-xs text-[#333] uppercase tracking-widest animate-pulse">Loading...</div>
          ) : historyItems && historyItems.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {historyItems.slice(0, 3).map((item) => (
                <li key={item.id} className="text-sm font-light text-[#888] flex justify-between group cursor-default">
                  <span className="truncate pr-4 group-hover:text-white transition-colors duration-300">
                    {formatTitle(item.filename)}
                  </span>
                  <span className="text-xs text-[#444] whitespace-nowrap font-mono">
                    {new Date(item.playedAt).toLocaleDateString(undefined, {
                      month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
                    })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[#333] uppercase tracking-widest">No recent plays</p>
          )}
        </div>
      </footer>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/[0.01] rounded-full blur-3xl pointer-events-none" />

      {/* Lyrics Panel */}
      {currentTrack && (
        <LyricsPanel
          isOpen={isLyricsOpen}
          onClose={() => setIsLyricsOpen(false)}
          lyrics={lyrics}
          onUpdateLyrics={updateLyrics}
          onClearLyrics={clearLyrics}
          isEditing={isEditingLyrics}
          onToggleEdit={toggleEditMode}
          trackName={displayTitle}
        />
      )}

      {/* Playlist Panel */}
      <PlaylistPanel
        isOpen={isPlaylistOpen}
        onClose={() => setIsPlaylistOpen(false)}
        playlist={playlist}
        currentIndex={currentIndex}
        isPlaying={isPlaying}
        onPlay={(index) => {
          playTrack(index);
          setIsPlaylistOpen(false);
        }}
      />
    </div>
  );
}
