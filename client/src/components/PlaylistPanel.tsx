import { motion, AnimatePresence } from "framer-motion";
import { X, Music2, Play, Volume2 } from "lucide-react";
import type { Track } from "@/hooks/use-audio-player";

interface PlaylistPanelProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: Track[];
  currentIndex: number;
  isPlaying: boolean;
  onPlay: (index: number) => void;
}

function formatTitle(filename: string) {
  return filename.replace(/\.[^/.]+$/, "");
}

export function PlaylistPanel({
  isOpen,
  onClose,
  playlist,
  currentIndex,
  isPlaying,
  onPlay,
}: PlaylistPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            data-testid="playlist-backdrop"
          />

          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-screen w-full md:w-96 bg-black/95 backdrop-blur-xl border-l border-white/10 z-50 flex flex-col overflow-hidden"
            data-testid="playlist-panel"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5 flex-shrink-0">
              <div>
                <h2 className="text-xl font-light tracking-tight">Queue</h2>
                <p className="text-xs text-white/40 uppercase tracking-widest mt-1">
                  {playlist.length} track{playlist.length !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                onClick={onClose}
                className="hover-glow p-2 text-white/60"
                data-testid="button-close-playlist"
              >
                <X size={20} />
              </button>
            </div>

            {/* Track List */}
            <div className="flex-1 overflow-y-auto">
              {playlist.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-white/20">
                  <Music2 size={40} strokeWidth={0.5} />
                  <p className="text-xs uppercase tracking-widest">No tracks loaded</p>
                </div>
              ) : (
                <ul className="py-2">
                  {playlist.map((track, index) => {
                    const isCurrent = index === currentIndex;
                    const title = track.meta?.title || formatTitle(track.name);
                    const artist = track.meta?.artist;

                    return (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        data-testid={`track-item-${index}`}
                      >
                        <button
                          onClick={() => onPlay(index)}
                          className={`w-full flex items-center gap-4 px-6 py-3 text-left transition-all duration-200 group ${
                            isCurrent
                              ? "bg-white/5"
                              : "hover:bg-white/[0.03]"
                          }`}
                        >
                          {/* Cover Art / Index */}
                          <div className="flex-shrink-0 w-10 h-10 rounded overflow-hidden relative">
                            {track.meta?.coverArtUrl ? (
                              <img
                                src={track.meta.coverArtUrl}
                                alt={title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-white/5 border border-white/10 flex items-center justify-center">
                                {isCurrent && isPlaying ? (
                                  <Volume2 size={14} className="text-white/60 animate-pulse" />
                                ) : (
                                  <span className="text-[10px] text-white/30 font-mono">
                                    {index + 1}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Play overlay on hover */}
                            {!isCurrent && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Play size={12} className="text-white ml-0.5" />
                              </div>
                            )}

                            {/* Now playing indicator */}
                            {isCurrent && track.meta?.coverArtUrl && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <Volume2 size={14} className={`text-white ${isPlaying ? "animate-pulse" : ""}`} />
                              </div>
                            )}
                          </div>

                          {/* Track Info */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm truncate font-light transition-colors ${
                              isCurrent ? "text-white" : "text-white/60 group-hover:text-white/80"
                            }`}>
                              {title}
                            </p>
                            {artist && (
                              <p className="text-xs text-white/30 truncate mt-0.5">
                                {artist}
                              </p>
                            )}
                          </div>

                          {/* Playing bar indicator */}
                          {isCurrent && (
                            <div className="flex-shrink-0 flex items-end gap-0.5 h-4">
                              {[1, 2, 3].map(bar => (
                                <div
                                  key={bar}
                                  className={`w-0.5 bg-white/60 rounded-full ${
                                    isPlaying
                                      ? `animate-[bounce_${0.6 + bar * 0.15}s_ease-in-out_infinite_alternate]`
                                      : "h-1"
                                  }`}
                                  style={isPlaying ? {
                                    height: `${8 + bar * 4}px`,
                                    animationDelay: `${bar * 0.1}s`,
                                  } : undefined}
                                />
                              ))}
                            </div>
                          )}
                        </button>
                      </motion.li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
