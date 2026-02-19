import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from "react";

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

interface ActionNudgeContextValue {
  showNudge: boolean;
  nudgeMessage: string;
  dismissNudge: () => void;
  resetNudge: () => void;
}

const ActionNudgeContext = createContext<ActionNudgeContextValue | null>(null);

export function ActionNudgeProvider({ children }: { children: ReactNode }) {
  const [showNudge, setShowNudge] = useState(false);
  const [nudgeMessage, setNudgeMessage] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissedRef = useRef(false);

  useEffect(() => {
    // Start the global timer once when the provider mounts (app load)
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
    // Used when user completes a task — dismiss and prevent future nudges
    setShowNudge(false);
    dismissedRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return (
    <ActionNudgeContext.Provider value={{ showNudge, nudgeMessage, dismissNudge, resetNudge }}>
      {children}
    </ActionNudgeContext.Provider>
  );
}

export function useActionNudge() {
  const ctx = useContext(ActionNudgeContext);
  if (!ctx) {
    throw new Error("useActionNudge must be used within ActionNudgeProvider");
  }
  return ctx;
}
