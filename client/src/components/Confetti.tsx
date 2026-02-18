import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface ConfettiProps {
  active: boolean;
  duration?: number;
}

const COLORS = ["#FF8A65", "#FFB74D", "#81C784", "#7EC8E3", "#B39DDB", "#FF80AB", "#FFD54F"];
const SHAPES = ["circle", "square", "triangle"];

function ConfettiPiece({ index }: { index: number }) {
  const color = COLORS[index % COLORS.length];
  const shape = SHAPES[index % SHAPES.length];
  const left = Math.random() * 100;
  const delay = Math.random() * 0.5;
  const size = 6 + Math.random() * 8;
  const rotation = Math.random() * 720;

  return (
    <motion.div
      initial={{ y: -20, x: 0, opacity: 1, rotate: 0 }}
      animate={{
        y: window.innerHeight + 50,
        x: (Math.random() - 0.5) * 200,
        opacity: [1, 1, 0],
        rotate: rotation,
      }}
      transition={{
        duration: 2 + Math.random() * 1.5,
        delay,
        ease: "easeIn" as const,
      }}
      style={{
        position: "fixed",
        left: `${left}%`,
        top: -20,
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      {shape === "circle" ? (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            backgroundColor: color,
          }}
        />
      ) : shape === "square" ? (
        <div
          style={{
            width: size,
            height: size,
            backgroundColor: color,
            borderRadius: 2,
          }}
        />
      ) : (
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: `${size / 2}px solid transparent`,
            borderRight: `${size / 2}px solid transparent`,
            borderBottom: `${size}px solid ${color}`,
          }}
        />
      )}
    </motion.div>
  );
}

export function Confetti({ active, duration = 2500 }: ConfettiProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (active) {
      setShow(true);
      const timer = setTimeout(() => setShow(false), duration);
      return () => clearTimeout(timer);
    }
  }, [active, duration]);

  return (
    <AnimatePresence>
      {show && (
        <>
          {Array.from({ length: 30 }).map((_, i) => (
            <ConfettiPiece key={`confetti-${i}-${Date.now()}`} index={i} />
          ))}
        </>
      )}
    </AnimatePresence>
  );
}
