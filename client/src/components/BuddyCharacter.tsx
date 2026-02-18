import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

export type BuddyMood = "happy" | "celebrating" | "thinking" | "encouraging" | "waving" | "sleeping";

interface BuddyCharacterProps {
  mood?: BuddyMood;
  size?: number;
  message?: string;
  className?: string;
}

const moodEmojis: Record<BuddyMood, string> = {
  happy: "😊",
  celebrating: "🎉",
  thinking: "🤔",
  encouraging: "💪",
  waving: "👋",
  sleeping: "😴",
};

export function BuddyCharacter({
  mood = "happy",
  size = 120,
  message,
  className = "",
}: BuddyCharacterProps) {
  const [currentMood, setCurrentMood] = useState(mood);

  useEffect(() => {
    setCurrentMood(mood);
  }, [mood]);

  const getBodyColor = () => {
    switch (currentMood) {
      case "celebrating": return "#FF8A65";
      case "thinking": return "#7EC8E3";
      case "encouraging": return "#FFB74D";
      case "sleeping": return "#B39DDB";
      case "waving": return "#81C784";
      default: return "#FF8A65";
    }
  };

  const getAnimation = () => {
    switch (currentMood) {
      case "celebrating":
        return {
          animate: { scale: [1, 1.1, 1], rotate: [0, -5, 5, 0] },
          transition: { duration: 0.6, repeat: 2 },
        };
      case "waving":
        return {
          animate: { rotate: [0, 10, -10, 10, 0] },
          transition: { duration: 1, repeat: 1 },
        };
      case "thinking":
        return {
          animate: { y: [0, -3, 0] },
          transition: { duration: 2, repeat: Infinity },
        };
      case "sleeping":
        return {
          animate: { scale: [1, 1.03, 1] },
          transition: { duration: 3, repeat: Infinity },
        };
      default:
        return {
          animate: { y: [0, -6, 0] },
          transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" as const },
        };
    }
  };

  const anim = getAnimation();
  const bodyColor = getBodyColor();

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <motion.div
        {...anim}
        style={{ width: size, height: size }}
        className="relative"
      >
        <svg
          viewBox="0 0 120 120"
          width={size}
          height={size}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Body - rounded blob shape */}
          <motion.ellipse
            cx="60"
            cy="65"
            rx="42"
            ry="45"
            fill={bodyColor}
            initial={false}
            animate={{ fill: bodyColor }}
            transition={{ duration: 0.3 }}
          />
          {/* Lighter belly */}
          <ellipse cx="60" cy="72" rx="28" ry="28" fill="white" opacity="0.3" />

          {/* Eyes */}
          {currentMood === "sleeping" ? (
            <>
              <path d="M42 52 Q47 56 52 52" stroke="#5D4037" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <path d="M68 52 Q73 56 78 52" stroke="#5D4037" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </>
          ) : currentMood === "celebrating" ? (
            <>
              <path d="M42 48 Q47 44 52 48" stroke="#5D4037" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <path d="M68 48 Q73 44 78 48" stroke="#5D4037" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </>
          ) : (
            <>
              <circle cx="45" cy="50" r="5" fill="#5D4037" />
              <circle cx="75" cy="50" r="5" fill="#5D4037" />
              {/* Eye shine */}
              <circle cx="47" cy="48" r="1.8" fill="white" />
              <circle cx="77" cy="48" r="1.8" fill="white" />
            </>
          )}

          {/* Mouth */}
          {currentMood === "celebrating" ? (
            <path d="M45 65 Q60 82 75 65" stroke="#5D4037" strokeWidth="2.5" fill="#FF5252" opacity="0.6" />
          ) : currentMood === "thinking" ? (
            <circle cx="65" cy="68" r="4" fill="#5D4037" opacity="0.5" />
          ) : currentMood === "sleeping" ? (
            <ellipse cx="60" cy="68" rx="6" ry="3" fill="#5D4037" opacity="0.3" />
          ) : (
            <path d="M47 64 Q60 76 73 64" stroke="#5D4037" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          )}

          {/* Blush cheeks */}
          <circle cx="35" cy="60" r="6" fill="#FF8A80" opacity="0.4" />
          <circle cx="85" cy="60" r="6" fill="#FF8A80" opacity="0.4" />

          {/* Arms */}
          {currentMood === "waving" ? (
            <>
              <motion.path
                d="M18 65 Q10 50 20 38"
                stroke={bodyColor}
                strokeWidth="8"
                strokeLinecap="round"
                fill="none"
                animate={{ d: ["M18 65 Q10 50 20 38", "M18 65 Q5 45 15 32", "M18 65 Q10 50 20 38"] }}
                transition={{ duration: 0.5, repeat: 3 }}
              />
              <path d="M102 65 Q110 75 105 85" stroke={bodyColor} strokeWidth="8" strokeLinecap="round" fill="none" />
            </>
          ) : currentMood === "encouraging" ? (
            <>
              <path d="M18 65 Q8 50 18 35" stroke={bodyColor} strokeWidth="8" strokeLinecap="round" fill="none" />
              <path d="M102 65 Q112 50 102 35" stroke={bodyColor} strokeWidth="8" strokeLinecap="round" fill="none" />
            </>
          ) : (
            <>
              <path d="M18 65 Q12 78 18 90" stroke={bodyColor} strokeWidth="8" strokeLinecap="round" fill="none" />
              <path d="M102 65 Q108 78 102 90" stroke={bodyColor} strokeWidth="8" strokeLinecap="round" fill="none" />
            </>
          )}

          {/* Feet */}
          <ellipse cx="45" cy="108" rx="12" ry="6" fill={bodyColor} opacity="0.8" />
          <ellipse cx="75" cy="108" rx="12" ry="6" fill={bodyColor} opacity="0.8" />

          {/* Thinking bubbles */}
          {currentMood === "thinking" && (
            <>
              <motion.circle
                cx="92" cy="30" r="3"
                fill="#90CAF9"
                animate={{ opacity: [0.3, 0.8, 0.3], scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <motion.circle
                cx="100" cy="20" r="4.5"
                fill="#90CAF9"
                animate={{ opacity: [0.4, 0.9, 0.4], scale: [0.9, 1.1, 0.9] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
              />
              <motion.circle
                cx="110" cy="10" r="6"
                fill="#90CAF9"
                animate={{ opacity: [0.5, 1, 0.5], scale: [0.9, 1.15, 0.9] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
              />
            </>
          )}

          {/* Celebration sparkles */}
          {currentMood === "celebrating" && (
            <>
              <motion.text
                x="15" y="25" fontSize="14"
                animate={{ opacity: [0, 1, 0], y: [25, 15, 5] }}
                transition={{ duration: 1, repeat: Infinity }}
              >⭐</motion.text>
              <motion.text
                x="90" y="20" fontSize="12"
                animate={{ opacity: [0, 1, 0], y: [20, 10, 0] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
              >✨</motion.text>
              <motion.text
                x="50" y="15" fontSize="14"
                animate={{ opacity: [0, 1, 0], y: [15, 5, -5] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.6 }}
              >🎉</motion.text>
            </>
          )}

          {/* Zzz for sleeping */}
          {currentMood === "sleeping" && (
            <>
              <motion.text
                x="80" y="35" fontSize="10" fill="#7E57C2"
                animate={{ opacity: [0, 1, 0], y: [35, 25, 15], x: [80, 85, 90] }}
                transition={{ duration: 2, repeat: Infinity }}
              >z</motion.text>
              <motion.text
                x="88" y="25" fontSize="13" fill="#7E57C2"
                animate={{ opacity: [0, 1, 0], y: [25, 15, 5], x: [88, 93, 98] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              >Z</motion.text>
              <motion.text
                x="96" y="15" fontSize="16" fill="#7E57C2"
                animate={{ opacity: [0, 1, 0], y: [15, 5, -5], x: [96, 101, 106] }}
                transition={{ duration: 2, repeat: Infinity, delay: 1 }}
              >Z</motion.text>
            </>
          )}
        </svg>
      </motion.div>

      {/* Speech bubble */}
      <AnimatePresence mode="wait">
        {message && (
          <motion.div
            key={message}
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="relative bg-card text-card-foreground border border-border rounded-2xl px-4 py-2.5 max-w-[280px] text-center text-sm font-medium shadow-md"
          >
            {/* Speech bubble arrow */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-card border-l border-t border-border rotate-45" />
            <span className="relative z-10">{message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
