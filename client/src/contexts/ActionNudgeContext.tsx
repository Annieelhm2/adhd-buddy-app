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
  // "idle" = initial, "active" = timer running, "dismissed" = user clicked Got it, "listening" = waiting for activity to restart
  const stateRef = useRef<"idle" | "active" | "dismissed" | "listening">("idle");
  const activityListenerAttached = useRef(false);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    stateRef.current = "active";
    timerRef.current = setTimeout(() => {
      setNudgeMessage(
        ACTION_NUDGES[Math.floor(Math.random() * ACTION_NUDGES.length)]
      );
      setShowNudge(true);
    }, NUDGE_DELAY_MS);
  }, []);

  const onActivity = useCallback(() => {
    // Only restart if we're in "listening" state (after a dismiss)
    if (stateRef.current !== "listening") return;
    // Detach listeners and restart the timer
    removeActivityListeners();
    activityListenerAttached.current = false;
    startTimer();
  }, [startTimer]);

  const attachActivityListeners = useCallback(() => {
    if (activityListenerAttached.current) return;
    activityListenerAttached.current = true;
    // Listen for clicks, typing, touch, and scroll — real user interactions, NOT navigation
    document.addEventListener("click", onActivity, { once: true, capture: true });
    document.addEventListener("keydown", onActivity, { once: true, capture: true });
    document.addEventListener("touchstart", onActivity, { once: true, capture: true });
    document.addEventListener("scroll", onActivity, { once: true, capture: true });
  }, [onActivity]);

  const removeActivityListeners = useCallback(() => {
    document.removeEventListener("click", onActivity, { capture: true } as EventListenerOptions);
    document.removeEventListener("keydown", onActivity, { capture: true } as EventListenerOptions);
    document.removeEventListener("touchstart", onActivity, { capture: true } as EventListenerOptions);
    document.removeEventListener("scroll", onActivity, { capture: true } as EventListenerOptions);
  }, [onActivity]);

  // Start the initial timer on mount
  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      removeActivityListeners();
    };
  }, [startTimer, removeActivityListeners]);

  const dismissNudge = useCallback(() => {
    setShowNudge(false);
    stateRef.current = "listening";
    // After dismiss, wait for real activity (click/type/touch/scroll) to restart the timer
    attachActivityListeners();
  }, [attachActivityListeners]);

  const resetNudge = useCallback(() => {
    // Used when user completes a task — dismiss and prevent future nudges temporarily
    setShowNudge(false);
    stateRef.current = "listening";
    if (timerRef.current) clearTimeout(timerRef.current);
    attachActivityListeners();
  }, [attachActivityListeners]);

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
