import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  GripVertical,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Sparkles,
  Wand2,
  CalendarIcon,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { SubtaskItem } from "./SubtaskItem";
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

interface TaskItemProps {
  task: {
    id: number;
    title: string;
    description: string | null;
    listType: "must_do" | "could_do";
    completed: boolean;
    dueDate: number | null;
    subtasks: Array<{
      id: number;
      title: string;
      completed: boolean;
      sortOrder: number;
    }>;
  };
  onComplete: (taskId: number, completed: boolean) => void;
  onCelebrate: () => void;
}

function getDueDateInfo(dueDate: number | null) {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  const diffMs = dueDay.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const dateStr = due.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  if (diffDays < 0) {
    return { label: `Overdue (${dateStr})`, color: "text-red-600", bgColor: "bg-red-50 border-red-200", icon: AlertTriangle, urgency: "overdue" };
  } else if (diffDays === 0) {
    return { label: `Due today`, color: "text-orange-600", bgColor: "bg-orange-50 border-orange-200", icon: Clock, urgency: "today" };
  } else if (diffDays === 1) {
    return { label: `Due tomorrow`, color: "text-amber-600", bgColor: "bg-amber-50 border-amber-200", icon: Clock, urgency: "tomorrow" };
  } else if (diffDays <= 3) {
    return { label: `Due in ${diffDays} days`, color: "text-yellow-600", bgColor: "bg-yellow-50 border-yellow-200", icon: CalendarIcon, urgency: "soon" };
  } else {
    return { label: `Due ${dateStr}`, color: "text-muted-foreground", bgColor: "bg-muted/50 border-border", icon: CalendarIcon, urgency: "later" };
  }
}

export function TaskItem({ task, onComplete, onCelebrate }: TaskItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [newSubtask, setNewSubtask] = useState("");
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const utils = trpc.useUtils();

  const dueDateInfo = useMemo(() => getDueDateInfo(task.dueDate), [task.dueDate]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
    },
  });

  const deleteTask = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      toast.success("Task removed");
    },
  });

  const createSubtask = trpc.subtasks.create.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      setNewSubtask("");
      setShowAddSubtask(false);
      toast.success("Subtask added!");
    },
  });

  const reorderSubtasks = trpc.subtasks.reorder.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
    },
  });

  const breakdownTask = trpc.chat.breakdownTask.useMutation({
    onSuccess: (data) => {
      utils.tasks.list.invalidate();
      toast.success(`ADHD Buddy broke this down into ${data.subtasks.length} steps!`, {
        icon: "✨",
      });
    },
    onError: () => {
      toast.error("Could not break down the task right now. Try again!");
    },
  });

  const handleToggleComplete = () => {
    const newCompleted = !task.completed;
    onComplete(task.id, newCompleted);
    updateTask.mutate({ id: task.id, completed: newCompleted });
    if (newCompleted) {
      onCelebrate();
    }
  };

  const handleSaveEdit = () => {
    if (editTitle.trim()) {
      updateTask.mutate({ id: task.id, title: editTitle.trim() });
      setEditing(false);
    }
  };

  const handleAddSubtask = () => {
    if (newSubtask.trim()) {
      createSubtask.mutate({ taskId: task.id, title: newSubtask.trim() });
    }
  };

  const handleSetDueDate = (date: Date | undefined) => {
    if (date) {
      const d = new Date(date);
      d.setHours(23, 59, 59, 999);
      updateTask.mutate({ id: task.id, dueDate: d.getTime() });
    } else {
      updateTask.mutate({ id: task.id, dueDate: null });
    }
    setDatePickerOpen(false);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleSubtaskDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = task.subtasks.findIndex((s) => s.id === active.id);
    const newIndex = task.subtasks.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...task.subtasks];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    reorderSubtasks.mutate({
      taskId: task.id,
      orderedIds: reordered.map((s) => s.id),
    });
  };

  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
  const totalSubtasks = task.subtasks.length;

  const selectedDate = task.dueDate ? new Date(task.dueDate) : undefined;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className={`group rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md ${
        task.completed ? "opacity-70" : ""
      } ${isDragging ? "z-50 shadow-lg" : ""} ${
        dueDateInfo?.urgency === "overdue" && !task.completed ? "border-red-300" : ""
      } ${dueDateInfo?.urgency === "today" && !task.completed ? "border-orange-300" : ""}`}
    >
      <div className="flex items-start gap-2 sm:gap-2 p-3 sm:p-4">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-1.5 sm:mt-1 text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing shrink-0 touch-none p-1 -ml-1"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-5 w-5 sm:h-4 sm:w-4" />
        </button>

        {/* Checkbox */}
        <Checkbox
          checked={task.completed}
          onCheckedChange={handleToggleComplete}
          className="mt-1.5 sm:mt-1 shrink-0 h-5 w-5 sm:h-4 sm:w-4"
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveEdit();
                  if (e.key === "Escape") setEditing(false);
                }}
                className="h-10 sm:h-8 text-base sm:text-sm"
                autoFocus
              />
              <Button size="icon" variant="ghost" className="h-9 w-9 sm:h-7 sm:w-7 shrink-0" onClick={handleSaveEdit}>
                <Check className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-9 w-9 sm:h-7 sm:w-7 shrink-0" onClick={() => setEditing(false)}>
                <X className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              </Button>
            </div>
          ) : (
            <div>
              {/* Title row */}
              <div className="flex items-start justify-between gap-2">
                <p
                  className={`text-base sm:text-sm font-semibold leading-snug ${
                    task.completed ? "line-through text-muted-foreground" : ""
                  }`}
                >
                  {task.title}
                </p>

                {/* Actions - always visible on mobile, hover on desktop */}
                <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                  {/* Due date picker */}
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className={`h-8 w-8 sm:h-7 sm:w-7 ${task.dueDate ? "text-primary" : ""}`}
                        title="Set due date"
                      >
                        <CalendarIcon className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <div className="p-2">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={handleSetDueDate}
                          initialFocus
                        />
                        {task.dueDate && (
                          <div className="border-t px-3 py-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full text-xs text-muted-foreground"
                              onClick={() => {
                                updateTask.mutate({ id: task.id, dueDate: null });
                                setDatePickerOpen(false);
                              }}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Remove due date
                            </Button>
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 sm:h-7 sm:w-7"
                    onClick={() => {
                      setEditTitle(task.title);
                      setEditing(true);
                    }}
                    title="Edit task"
                  >
                    <Pencil className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 sm:h-7 sm:w-7"
                    onClick={() => breakdownTask.mutate({ taskId: task.id })}
                    disabled={breakdownTask.isPending}
                    title="Ask Buddy to break this down"
                  >
                    <Wand2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 sm:h-7 sm:w-7 text-destructive hover:text-destructive"
                    onClick={() => deleteTask.mutate({ id: task.id })}
                    title="Delete task"
                  >
                    <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Due date badge + subtask count */}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {dueDateInfo && !task.completed && (
                  <span className={`inline-flex items-center gap-1 text-xs sm:text-[11px] font-medium px-2 py-0.5 rounded-md border ${dueDateInfo.bgColor} ${dueDateInfo.color}`}>
                    <dueDateInfo.icon className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                    {dueDateInfo.label}
                  </span>
                )}
                {totalSubtasks > 0 && (
                  <p className="text-sm sm:text-xs text-muted-foreground">
                    {completedSubtasks}/{totalSubtasks} subtasks done
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Expand/collapse for subtasks */}
          {(totalSubtasks > 0 || !task.completed) && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-sm sm:text-xs text-muted-foreground hover:text-foreground mt-2 sm:mt-1.5 transition-colors py-1"
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4 sm:h-3 sm:w-3" />
              ) : (
                <ChevronRight className="h-4 w-4 sm:h-3 sm:w-3" />
              )}
              {totalSubtasks > 0 ? `${totalSubtasks} subtask${totalSubtasks !== 1 ? "s" : ""}` : "Add subtasks"}
            </button>
          )}
        </div>
      </div>

      {/* Subtasks section */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 sm:px-4 pb-3 pl-8 sm:pl-10 space-y-1">
              {totalSubtasks > 0 && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleSubtaskDragEnd}
                >
                  <SortableContext
                    items={task.subtasks.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {task.subtasks.map((subtask) => (
                      <SubtaskItem
                        key={subtask.id}
                        subtask={subtask}
                        taskId={task.id}
                        onCelebrate={onCelebrate}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}

              {/* Add subtask */}
              {showAddSubtask ? (
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddSubtask();
                      if (e.key === "Escape") {
                        setShowAddSubtask(false);
                        setNewSubtask("");
                      }
                    }}
                    placeholder="What's a small step?"
                    className="h-9 sm:h-7 text-sm sm:text-xs"
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 sm:h-7 sm:w-7 shrink-0"
                    onClick={handleAddSubtask}
                    disabled={!newSubtask.trim() || createSubtask.isPending}
                  >
                    <Check className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 sm:h-7 sm:w-7 shrink-0"
                    onClick={() => {
                      setShowAddSubtask(false);
                      setNewSubtask("");
                    }}
                  >
                    <X className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 sm:h-7 text-sm sm:text-xs text-muted-foreground hover:text-foreground mt-1"
                  onClick={() => setShowAddSubtask(true)}
                >
                  <Plus className="h-4 w-4 sm:h-3 sm:w-3 mr-1" />
                  Add subtask
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Breakdown loading indicator */}
      {breakdownTask.isPending && (
        <div className="px-3 sm:px-4 pb-3 pl-8 sm:pl-10">
          <div className="flex items-center gap-2 text-sm sm:text-xs text-primary">
            <Sparkles className="h-4 w-4 sm:h-3.5 sm:w-3.5 animate-spin" />
            <span>Buddy is breaking this down for you...</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
