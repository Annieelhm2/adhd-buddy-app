import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, ListChecks, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { TaskItem } from "./TaskItem";

interface TaskListProps {
  title: string;
  listType: "must_do" | "could_do";
  tasks: Array<{
    id: number;
    title: string;
    description: string | null;
    listType: "must_do" | "could_do";
    completed: boolean;
    subtasks: Array<{
      id: number;
      title: string;
      completed: boolean;
      sortOrder: number;
    }>;
  }>;
  onCelebrate: () => void;
  icon: React.ReactNode;
  accentColor: string;
}

export function TaskList({
  title,
  listType,
  tasks,
  onCelebrate,
  icon,
  accentColor,
}: TaskListProps) {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const utils = trpc.useUtils();

  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      setNewTaskTitle("");
      setShowAdd(false);
      toast.success("Task added! You got this!", { icon: "🌟" });
    },
  });

  const reorderTasks = trpc.tasks.reorder.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
    },
  });

  const handleComplete = (taskId: number, completed: boolean) => {
    if (completed) {
      const encouragements = [
        "You did it! Amazing work!",
        "One more thing done! You're on fire!",
        "Look at you go! Keep it up!",
        "That's progress! Be proud of yourself!",
        "Crushed it! What a champion!",
      ];
      const msg = encouragements[Math.floor(Math.random() * encouragements.length)];
      toast.success(msg, { icon: "🎉", duration: 3000 });
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...tasks];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    reorderTasks.mutate({
      listType,
      orderedIds: reordered.map((t) => t.id),
    });
  };

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      createTask.mutate({ title: newTaskTitle.trim(), listType });
    }
  };

  const pendingTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${accentColor}`}>
            {icon}
          </div>
          <h2 className="text-lg font-bold">{title}</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {pendingTasks.length} pending
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={() => setShowAdd(true)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add
        </Button>
      </div>

      {/* Add task input */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 p-3 rounded-xl border bg-card">
              <Input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddTask();
                  if (e.key === "Escape") {
                    setShowAdd(false);
                    setNewTaskTitle("");
                  }
                }}
                placeholder={
                  listType === "must_do"
                    ? "What needs to get done?"
                    : "What would be nice to do?"
                }
                className="text-sm"
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleAddTask}
                disabled={!newTaskTitle.trim() || createTask.isPending}
              >
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowAdd(false);
                  setNewTaskTitle("");
                }}
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task list */}
      {tasks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <ListChecks className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No tasks yet</p>
          <p className="text-xs mt-1">
            {listType === "must_do"
              ? "Add your important tasks here"
              : "Add things you'd like to do when you have time"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Pending tasks with drag-and-drop */}
          {pendingTasks.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={pendingTasks.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {pendingTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onComplete={handleComplete}
                      onCelebrate={onCelebrate}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Completed tasks */}
          {completedTasks.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Completed ({completedTasks.length})
              </p>
              <div className="space-y-1.5">
                {completedTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onComplete={handleComplete}
                    onCelebrate={onCelebrate}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
