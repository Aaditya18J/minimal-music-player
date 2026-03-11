import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, Plus, Clock, Disc3 } from "lucide-react";
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
      <main className="flex-1 flex flex-col justify-center items-center max-w-4xl mx-auto w-full z-10 mt-12 md:mt-0">
        <AnimatePresence mode="wait">
          {currentTrack ? (
            <motion.div 
              key="player"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="w-full flex flex-col items-center"
            >
              <h1 className="text-4xl md:text-7xl lg:text-8xl font-light tracking-tighter text-center leading-none mb-16 md:mb-24 line-clamp-2 w-full px-4 break-words">
                {formatTitle(currentTrack.name)}
              </h1>

              <div className="flex items-center justify-center gap-12 md:gap-24 mb-16 md:mb-24">
                <button onClick={playPrev} className="hover-glow p-4">
                  <SkipBack size={24} strokeWidth={1.5} />
                </button>
                
                <button 
                  onClick={togglePlayPause} 
                  className="hover-glow p-6 rounded-full border border-white/10 hover:border-white/30 transition-colors"
                >
                  {isPlaying ? (
                    <Pause size={32} strokeWidth={1} />
                  ) : (
                    <Play size={32} strokeWidth={1} className="ml-1" />
                  )}
                </button>
                
                <button onClick={playNext} className="hover-glow p-4">
                  <SkipForward size={24} strokeWidth={1.5} />
                </button>
              </div>

              <div className="w-full max-w-2xl px-4 flex flex-col items-center gap-2">
                <MinimalProgressBar progress={progress} onSeek={seek} />
                <div className="w-full flex justify-between text-xs text-[#666] font-mono tracking-wider">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center text-[#444]"
            >
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="group relative flex flex-col items-center justify-center"
              >
                <div className="w-32 h-32 md:w-48 md:h-48 rounded-full border-[1px] border-[#222] group-hover:border-white/20 flex items-center justify-center transition-all duration-700">
                  <Play size={32} strokeWidth={0.5} className="ml-2 group-hover:text-white transition-colors duration-700" />
                </div>
                <span className="absolute -bottom-12 text-sm tracking-[0.3em] font-light group-hover:text-white/70 transition-colors duration-500">
                  SELECT AUDIO
                </span>
              </button>
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
