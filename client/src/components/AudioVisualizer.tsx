import { motion } from "framer-motion";

interface MinimalProgressBarProps {
  progress: number;
  onSeek: (percentage: number) => void;
}

export function MinimalProgressBar({ progress, onSeek }: MinimalProgressBarProps) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    onSeek(Math.max(0, Math.min(100, percentage)));
  };

  return (
    <div 
      className="w-full h-12 flex items-center cursor-pointer group"
      onClick={handleClick}
    >
      <div className="w-full h-[1px] bg-[#222] relative overflow-hidden transition-all duration-300 group-hover:h-[2px]">
        <motion.div 
          className="absolute top-0 left-0 h-full bg-white"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.1, ease: "linear" }}
        />
      </div>
    </div>
  );
}
