import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, Plus, Clock, Disc3, Rewind, FastForward, List } from "lucide-react";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { useHistory } from "@/hooks/use-history";
import { MinimalProgressBar } from "@/components/AudioVisualizer";

function formatTime(seconds: number) {
  if (isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Helper to remove extension for cleaner display
function formatTitle(filename: string) {
  return filename.replace(/\.[^/.]+$/, "");
}

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    currentTrack,
    isPlaying,
    progress,
    currentTime,
    duration,
    loadFiles,
    togglePlayPause,
    playNext,
    playPrev,
    seek,
    skipForward,
    skipBackward,
    playlist,
    currentIndex,
  } = useAudioPlayer();

  const { data: historyItems, isLoading: isHistoryLoading } = useHistory();

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
      />

      {/* Top Header / Actions */}
      <header className="flex justify-between items-center z-10">
        <div className="flex items-center gap-3 opacity-50">
          <Disc3 size={18} className={isPlaying ? "animate-[spin_4s_linear_infinite]" : ""} />
          <span className="text-sm tracking-widest font-medium uppercase">Player</span>
        </div>
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 text-sm uppercase tracking-widest font-medium opacity-50 hover-glow"
        >
          <Plus size={16} />
          <span>Load</span>
        </button>
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
              {/* Cover Art Area */}
              <div className="flex-shrink-0">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  className="w-64 h-64 md:w-80 md:h-80 rounded-lg border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] flex items-center justify-center backdrop-blur-sm hover:border-white/20 transition-colors duration-500"
                >
                  <div className="flex flex-col items-center justify-center gap-6">
                    <motion.div
                      animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
                      transition={{ duration: isPlaying ? 3 : 0.5, repeat: isPlaying ? Infinity : 0, ease: "linear" }}
                    >
                      <Disc3 size={80} strokeWidth={0.5} className="text-white/30" />
                    </motion.div>
                    <div className="text-center">
                      <p className="text-sm text-white/50 uppercase tracking-widest">Now Playing</p>
                      <p className="text-xs text-white/30 uppercase tracking-widest mt-2">Audio File</p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Player Controls & Metadata */}
              <div className="flex-1 w-full md:w-auto flex flex-col gap-8">
                {/* Track Title */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h1 className="text-3xl md:text-5xl font-light tracking-tight leading-tight line-clamp-3 break-words">
                    {formatTitle(currentTrack.name)}
                  </h1>
                </motion.div>

                {/* Metadata */}
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

                {/* Main Controls */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="flex items-center justify-center gap-6 md:gap-8 mt-4"
                >
                  <button 
                    onClick={() => playPrev()} 
                    className="hover-glow p-3 text-white/60"
                    data-testid="button-prev-track"
                  >
                    <SkipBack size={20} strokeWidth={1.5} />
                  </button>

                  <button 
                    onClick={() => skipBackward(10)} 
                    className="hover-glow p-3 text-white/60"
                    data-testid="button-rewind"
                  >
                    <Rewind size={20} strokeWidth={1.5} />
                  </button>
                  
                  <button 
                    onClick={togglePlayPause} 
                    className="hover-glow p-4 rounded-full border border-white/20 hover:border-white/40 transition-colors"
                    data-testid="button-play-pause"
                  >
                    {isPlaying ? (
                      <Pause size={28} strokeWidth={1.2} />
                    ) : (
                      <Play size={28} strokeWidth={1.2} className="ml-1" />
                    )}
                  </button>

                  <button 
                    onClick={() => skipForward(10)} 
                    className="hover-glow p-3 text-white/60"
                    data-testid="button-forward"
                  >
                    <FastForward size={20} strokeWidth={1.5} />
                  </button>

                  <button 
                    onClick={() => playNext()} 
                    className="hover-glow p-3 text-white/60"
                    data-testid="button-next-track"
                  >
                    <SkipForward size={20} strokeWidth={1.5} />
                  </button>
                </motion.div>

                {/* Secondary Controls */}
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
              className="flex flex-col items-center justify-center gap-8"
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
                <span className="absolute -bottom-16 text-sm tracking-[0.3em] font-light text-white/60 group-hover:text-white transition-colors duration-500">
                  LOAD MUSIC
                </span>
              </button>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-center text-white/40 text-sm tracking-widest uppercase mt-8"
              >
                No tracks loaded<br/>Click to select audio files
              </motion.p>
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
                      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' 
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
      
      {/* Subtle background gradient blob for extreme minimal depth */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/[0.01] rounded-full blur-3xl pointer-events-none" />
    </div>
  );
}
