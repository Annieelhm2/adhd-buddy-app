import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { TaskList } from "@/components/TaskList";
import { BuddyCharacter, type BuddyMood } from "@/components/BuddyCharacter";
import { Confetti } from "@/components/Confetti";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Zap } from "lucide-react";

const BUDDY_MESSAGES = [
  "You've got this! One step at a time.",
  "Every task you finish is a win!",
  "Focus on progress, not perfection.",
  "Small steps lead to big achievements!",
  "I believe in you! Let's do this!",
  "Remember: done is better than perfect!",
  "You're doing amazing! Keep going!",
];

export default function Tasks() {
  const [confettiActive, setConfettiActive] = useState(false);
  const [buddyMood, setBuddyMood] = useState<BuddyMood>("happy");
  const [buddyMessage, setBuddyMessage] = useState(
    BUDDY_MESSAGES[Math.floor(Math.random() * BUDDY_MESSAGES.length)]
  );

  const { data: allTasks, isLoading, error } = trpc.tasks.list.useQuery();

  const mustDoTasks = (allTasks ?? []).filter((t) => t.listType === "must_do");
  const couldDoTasks = (allTasks ?? []).filter((t) => t.listType === "could_do");

  const handleCelebrate = useCallback(() => {
    setBuddyMood("celebrating");
    setBuddyMessage("Amazing work! You're crushing it!");
    setConfettiActive(true);

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
