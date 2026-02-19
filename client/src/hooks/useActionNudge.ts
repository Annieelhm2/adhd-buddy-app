import { useState, useEffect, useRef, useCallback } from "react";

const ACTION_NUDGES = [
  "Hey! You've been here for a bit — pick ONE thing and go do it! I'll be here when you get back! 🚀",
  "Planning is great, but doing is better! Close the app and tackle your top task. You've got this! 💪",
  "Quick reminder: the best time to start is NOW. Go knock out that first step! ⚡",
  "You know what to do — now go make it happen! Come back and tell me how it went! 🌟",
  "Action beats perfection! Pick your smallest task and just START. I believe in you! ✨",
  "You've spent some quality time planning — now it's time to execute! Go crush it! 🔥",
  "Remember: 5 minutes of doing beats 30 minutes of planning. Go start something! 💫",
];

const NUDGE_DELAY_MS = 3 * 60 * 1000; // 3 minutes

export function useActionNudge() {
  const [showNudge, setShowNudge] = useState(false);
  const [nudgeMessage, setNudgeMessage] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissedRef = useRef(false);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      if (!dismissedRef.current) {
        setNudgeMessage(
          ACTION_NUDGES[Math.floor(Math.random() * ACTION_NUDGES.length)]
        );
        setShowNudge(true);
      }
    }, NUDGE_DELAY_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const dismissNudge = useCallback(() => {
    setShowNudge(false);
    dismissedRef.current = true;
  }, []);

  const resetNudge = useCallback(() => {
    setShowNudge(false);
    dismissedRef.current = true;
  }, []);

  return { showNudge, nudgeMessage, dismissNudge, resetNudge };
}
