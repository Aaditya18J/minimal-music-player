import { motion, AnimatePresence } from "framer-motion";
import { X, Edit2, Save, Trash2, Plus } from "lucide-react";

interface LyricsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  lyrics: string;
  onUpdateLyrics: (lyrics: string) => void;
  onClearLyrics: () => void;
  isEditing: boolean;
  onToggleEdit: () => void;
  trackName: string;
}

export function LyricsPanel({
  isOpen,
  onClose,
  lyrics,
  onUpdateLyrics,
  onClearLyrics,
  isEditing,
  onToggleEdit,
  trackName,
}: LyricsPanelProps) {
  const handleSave = () => {
    onToggleEdit();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            data-testid="lyrics-backdrop"
          />

          {/* Lyrics Panel - Spotify Style */}
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-screen w-full md:w-96 bg-black/95 backdrop-blur-xl border-l border-white/10 z-50 flex flex-col overflow-hidden"
            data-testid="lyrics-panel"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5 flex-shrink-0">
              <div>
                <h2 className="text-xl font-light tracking-tight">Lyrics</h2>
                <p className="text-xs text-white/40 uppercase tracking-widest mt-1">
                  {trackName}
                </p>
              </div>
              <button
                onClick={onClose}
                className="hover-glow p-2 text-white/60"
                data-testid="button-close-lyrics"
              >
                <X size={20} />
              </button>
            </div>

            {/* Lyrics Content Area */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col">
              {!isEditing ? (
                // View Mode
                <div className="flex-1 flex flex-col">
                  {lyrics ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap font-light"
                      data-testid="lyrics-display"
                    >
                      {lyrics}
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex-1 flex flex-col items-center justify-center gap-4 text-white/30"
                      data-testid="lyrics-empty"
                    >
                      <Plus size={32} strokeWidth={0.5} />
                      <p className="text-xs uppercase tracking-widest text-center">
                        No lyrics yet<br />Click edit to add
                      </p>
                    </motion.div>
                  )}
                </div>
              ) : (
                // Edit Mode
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex-1 flex flex-col gap-4"
                  data-testid="lyrics-editor"
                >
                  <textarea
                    value={lyrics}
                    onChange={(e) => onUpdateLyrics(e.target.value)}
                    placeholder="Add lyrics here... (line by line)"
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg p-4 text-sm text-white placeholder-white/30 resize-none focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 font-light leading-relaxed"
                    data-testid="textarea-lyrics-input"
                  />
                  <p className="text-xs text-white/40 uppercase tracking-widest">
                    {lyrics.length} characters
                  </p>
                </motion.div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="border-t border-white/5 p-6 flex-shrink-0 flex gap-3 flex-col">
              <button
                onClick={onToggleEdit}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-sm font-light uppercase tracking-widest text-white/70 hover:text-white"
                data-testid="button-toggle-edit"
              >
                {isEditing ? (
                  <>
                    <Save size={16} />
                    Save Lyrics
                  </>
                ) : (
                  <>
                    <Edit2 size={16} />
                    Edit Lyrics
                  </>
                )}
              </button>

              {lyrics && (
                <button
                  onClick={() => {
                    onClearLyrics();
                    if (isEditing) onToggleEdit();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 transition-all text-sm font-light uppercase tracking-widest text-red-400/70 hover:text-red-400"
                  data-testid="button-clear-lyrics"
                >
                  <Trash2 size={16} />
                  Clear Lyrics
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
