import { useState, useCallback, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { TaskList } from "@/components/TaskList";
import { BuddyCharacter, type BuddyMood } from "@/components/BuddyCharacter";
import { Confetti } from "@/components/Confetti";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Zap, Rocket } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const BUDDY_MESSAGES = [
  "You've got this! One step at a time.",
  "Every task you finish is a win!",
  "Focus on progress, not perfection.",
  "Small steps lead to big achievements!",
  "I believe in you! Let's do this!",
  "Remember: done is better than perfect!",
  "You're doing amazing! Keep going!",
];

const ACTION_NUDGES = [
  "Hey! You've been planning for a bit — pick ONE thing and go do it! I'll be here when you get back! 🚀",
  "Planning is great, but doing is better! Close the app and tackle your top task. You've got this! 💪",
  "Quick reminder: the best time to start is NOW. Go knock out that first step! ⚡",
  "You know what to do — now go make it happen! Come back and tell me how it went! 🌟",
  "Action beats perfection! Pick your smallest task and just START. I believe in you! ✨",
];

export default function Tasks() {
  const [confettiActive, setConfettiActive] = useState(false);
  const [buddyMood, setBuddyMood] = useState<BuddyMood>("happy");
  const [buddyMessage, setBuddyMessage] = useState(
    BUDDY_MESSAGES[Math.floor(Math.random() * BUDDY_MESSAGES.length)]
  );
  const [showActionNudge, setShowActionNudge] = useState(false);
  const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nudgeDismissedRef = useRef(false);

  const { data: allTasks, isLoading, error } = trpc.tasks.list.useQuery();

  const mustDoTasks = (allTasks ?? []).filter((t) => t.listType === "must_do");
  const couldDoTasks = (allTasks ?? []).filter((t) => t.listType === "could_do");

  // Show action nudge after 3 minutes of being on the page
  useEffect(() => {
    nudgeTimerRef.current = setTimeout(() => {
      if (!nudgeDismissedRef.current) {
        setShowActionNudge(true);
      }
    }, 3 * 60 * 1000); // 3 minutes

    return () => {
      if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    };
  }, []);

  const handleDismissNudge = () => {
    setShowActionNudge(false);
    nudgeDismissedRef.current = true;
  };

  const handleCelebrate = useCallback(() => {
    setBuddyMood("celebrating");
    setBuddyMessage("Amazing work! You're crushing it!");
    setConfettiActive(true);
    // Reset nudge timer on task completion
    setShowActionNudge(false);
    nudgeDismissedRef.current = true;

    setTimeout(() => {
      setConfettiActive(false);
    }, 100);

    setTimeout(() => {
      setBuddyMood("happy");
      setBuddyMessage(
        BUDDY_MESSAGES[Math.floor(Math.random() * BUDDY_MESSAGES.length)]
      );
    }, 3000);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6 p-2">
        <div className="flex justify-center">
          <Skeleton className="h-24 w-24 sm:h-32 sm:w-32 rounded-full" />
        </div>
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-semibold">Something went wrong</p>
        <p className="text-base text-muted-foreground mt-2">
          Could not load your tasks. Please try refreshing.
        </p>
      </div>
    );
  }

  const pendingCount = (allTasks ?? []).filter((t) => !t.completed).length;

  return (
    <div className="space-y-6 sm:space-y-8 max-w-3xl mx-auto">
      <Confetti active={confettiActive} />

      {/* Buddy section */}
      <div className="flex justify-center pt-1 sm:pt-2">
        <BuddyCharacter
          mood={buddyMood}
          size={90}
          message={buddyMessage}
        />
      </div>

      {/* Action nudge banner */}
      <AnimatePresence>
        {showActionNudge && pendingCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
              <Rocket className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-orange-800">
                  {ACTION_NUDGES[Math.floor(Math.random() * ACTION_NUDGES.length)]}
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  You have {pendingCount} pending task{pendingCount !== 1 ? "s" : ""}. The app is a tool, not a destination!
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-orange-600 hover:text-orange-800 shrink-0 text-xs"
                onClick={handleDismissNudge}
              >
                Got it!
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Must Do Tasks */}
      <TaskList
        title="Must Do"
        listType="must_do"
        tasks={mustDoTasks}
        onCelebrate={handleCelebrate}
        icon={<Zap className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />}
        accentColor="bg-orange-100"
      />

      {/* Could Do Tasks */}
      <TaskList
        title="Could Do"
        listType="could_do"
        tasks={couldDoTasks}
        onCelebrate={handleCelebrate}
        icon={<span className="text-base sm:text-lg">🌿</span>}
        accentColor="bg-teal-100"
      />
    </div>
  );
}
