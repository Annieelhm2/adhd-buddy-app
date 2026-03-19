import { useState, useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { GripVertical, Pencil, Trash2, Check, X, CalendarIcon, Clock, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getDueDateInfo } from "./TaskItem";

const SUBTASK_CELEBRATIONS = [
  { message: "Nice work on that step!", icon: "⭐" },
  { message: "One step closer! Keep it up!", icon: "🎯" },
  { message: "You're making real progress!", icon: "💪" },
  { message: "That's the way! Step by step!", icon: "🌟" },
  { message: "Awesome! Another one down!", icon: "🔥" },
  { message: "Look at you go! Crushing it!", icon: "✨" },
  { message: "Small wins add up! Great job!", icon: "🏆" },
  { message: "You did it! On to the next one!", icon: "🚀" },
  { message: "Progress! That's what it's all about!", icon: "💫" },
  { message: "Every step counts — and you just took one!", icon: "👏" },
];

interface NestedSubtask {
  id: number;
  title: string;
  completed: boolean;
  dueDate: number | null;
  parentSubtaskId: number | null;
}

interface NestedSubtaskItemProps {
  subtask: NestedSubtask;
  taskId: number;
  depth?: number;
  onCelebrate: () => void;
}

export function NestedSubtaskItem({ subtask, taskId, depth = 0, onCelebrate }: NestedSubtaskItemProps) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(subtask.title);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState(() => {
    if (subtask.dueDate) {
      const d = new Date(subtask.dueDate);
      if (d.getHours() !== 23 || d.getMinutes() !== 59) {
        return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      }
    }
    return "";
  });
  const [showNestedInput, setShowNestedInput] = useState(false);
  const [nestedTitle, setNestedTitle] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);

  const utils = trpc.useUtils();

  const dueDateInfo = useMemo(() => getDueDateInfo(subtask.dueDate), [subtask.dueDate]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subtask.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Query nested subtasks
  const { data: nestedSubtasks = [] } = trpc.subtasks.getNestedSubtasks.useQuery(
    { parentSubtaskId: subtask.id },
    { enabled: isExpanded }
  );

  const updateSubtask = trpc.subtasks.update.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.subtasks.getNestedSubtasks.invalidate();
    },
  });

  const deleteSubtask = trpc.subtasks.delete.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      utils.subtasks.getNestedSubtasks.invalidate();
      toast.success("Subtask removed");
    },
  });

  const createNestedSubtask = trpc.subtasks.create.useMutation({
    onSuccess: () => {
      utils.subtasks.getNestedSubtasks.invalidate();
      setShowNestedInput(false);
      setNestedTitle("");
      toast.success("Nested subtask added");
    },
  });

  const handleToggle = () => {
    const newCompleted = !subtask.completed;
    updateSubtask.mutate({
      id: subtask.id,
      completed: newCompleted,
      subtaskTitle: newCompleted ? subtask.title : undefined,
    });
    if (newCompleted) {
      onCelebrate();
      const celebration = SUBTASK_CELEBRATIONS[Math.floor(Math.random() * SUBTASK_CELEBRATIONS.length)];
      toast.success(celebration.message, { icon: celebration.icon });
    }
  };

  const handleSaveEdit = () => {
    if (editTitle.trim()) {
      updateSubtask.mutate({ id: subtask.id, title: editTitle.trim() });
      setEditing(false);
    }
  };

  const handleSetDueDate = (date: Date | undefined) => {
    if (date) {
      const d = new Date(date);
      if (selectedTime) {
        const [h, m] = selectedTime.split(":").map(Number);
        d.setHours(h, m, 0, 0);
      } else {
        d.setHours(23, 59, 59, 999);
      }
      updateSubtask.mutate({ id: subtask.id, dueDate: d.getTime() });
    } else {
      updateSubtask.mutate({ id: subtask.id, dueDate: null });
      setSelectedTime("");
    }
  };

  const handleTimeChange = (time: string) => {
    setSelectedTime(time);
    if (subtask.dueDate) {
      const d = new Date(subtask.dueDate);
      if (time) {
        const [h, m] = time.split(":").map(Number);
        d.setHours(h, m, 0, 0);
      } else {
        d.setHours(23, 59, 59, 999);
      }
      updateSubtask.mutate({ id: subtask.id, dueDate: d.getTime() });
    }
  };

  const handleAddNestedSubtask = () => {
    if (nestedTitle.trim()) {
      createNestedSubtask.mutate({
        taskId,
        title: nestedTitle.trim(),
        parentSubtaskId: subtask.id,
      });
    }
  };

  const selectedDate = subtask.dueDate ? new Date(subtask.dueDate) : undefined;
  const paddingLeft = depth * 16; // Increase indentation per depth level

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, paddingLeft: `${paddingLeft}px` }}
      className={`group/subtask flex flex-col rounded-md hover:bg-muted/50 px-1`}
    >
      <div className="flex items-center gap-2 py-1.5 sm:py-1">
        {/* Expand/collapse button for nested subtasks */}
        {nestedSubtasks.length > 0 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-muted-foreground/50 hover:text-muted-foreground shrink-0 p-0.5"
            aria-label={isExpanded ? "Collapse nested subtasks" : "Expand nested subtasks"}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 sm:h-3 sm:w-3" />
            ) : (
              <ChevronRight className="h-4 w-4 sm:h-3 sm:w-3" />
            )}
          </button>
        )}

        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="text-muted-foreground/30 hover:text-muted-foreground cursor-grab active:cursor-grabbing shrink-0 touch-none p-0.5"
          aria-label="Drag to reorder subtask"
        >
          <GripVertical className="h-4 w-4 sm:h-3 sm:w-3" />
        </button>

        <Checkbox
          checked={subtask.completed}
          onCheckedChange={handleToggle}
          className="shrink-0 h-4.5 w-4.5 sm:h-3.5 sm:w-3.5"
        />

        {editing ? (
          <div className="flex items-center gap-1 flex-1">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveEdit();
                if (e.key === "Escape") setEditing(false);
              }}
              className="h-8 sm:h-6 text-sm sm:text-xs"
              autoFocus
            />
            <Button size="icon" variant="ghost" className="h-8 w-8 sm:h-6 sm:w-6 shrink-0" onClick={handleSaveEdit}>
              <Check className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 sm:h-6 sm:w-6 shrink-0" onClick={() => setEditing(false)}>
              <X className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
            </Button>
          </div>
        ) : (
          <span
            className={`text-sm sm:text-xs flex-1 ${
              subtask.completed ? "line-through text-muted-foreground" : ""
            }`}
          >
            {subtask.title}
          </span>
        )}

        <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover/subtask:opacity-100 transition-opacity shrink-0">
          {/* Add nested subtask button */}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 sm:h-6 sm:w-6"
            onClick={() => setShowNestedInput(!showNestedInput)}
            title="Add nested subtask"
          >
            <Plus className="h-3.5 w-3.5 sm:h-2.5 sm:w-2.5" />
          </Button>

          {/* Due date picker */}
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className={`h-8 w-8 sm:h-6 sm:w-6 ${subtask.dueDate ? "text-primary" : ""}`}
                title="Set due date"
              >
                <CalendarIcon className="h-3.5 w-3.5 sm:h-2.5 sm:w-2.5" />
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
                <div className="flex items-center gap-2 px-3 py-2 border-t">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground shrink-0">Time:</span>
                  <Input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    className="h-8 text-sm flex-1"
                  />
                </div>
                {subtask.dueDate && (
                  <div className="border-t px-3 py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-muted-foreground"
                      onClick={() => {
                        updateSubtask.mutate({ id: subtask.id, dueDate: null });
                        setSelectedTime("");
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

          {/* Edit button */}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 sm:h-6 sm:w-6"
            onClick={() => {
              setEditTitle(subtask.title);
              setEditing(true);
            }}
            title="Edit subtask"
          >
            <Pencil className="h-3.5 w-3.5 sm:h-2.5 sm:w-2.5" />
          </Button>

          {/* Delete button */}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 sm:h-6 sm:w-6 text-destructive hover:text-destructive"
            onClick={() => deleteSubtask.mutate({ id: subtask.id })}
            title="Delete subtask"
          >
            <Trash2 className="h-3.5 w-3.5 sm:h-2.5 sm:w-2.5" />
          </Button>
        </div>
      </div>

      {/* Due date badge */}
      {dueDateInfo && !subtask.completed && (
        <div className="pl-10 sm:pl-8 pb-1">
          <span className={`inline-flex items-center gap-1 text-[11px] sm:text-[10px] font-medium px-1.5 py-0.5 rounded border ${dueDateInfo.bgColor} ${dueDateInfo.color}`}>
            <dueDateInfo.icon className="h-3 w-3 sm:h-2.5 sm:w-2.5" />
            {dueDateInfo.label}
          </span>
        </div>
      )}

      {/* Add nested subtask input */}
      {showNestedInput && (
        <div className="pl-10 sm:pl-8 py-2 flex items-center gap-2">
          <Input
            placeholder="Add a nested subtask..."
            value={nestedTitle}
            onChange={(e) => setNestedTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddNestedSubtask();
              if (e.key === "Escape") {
                setShowNestedInput(false);
                setNestedTitle("");
              }
            }}
            className="h-8 sm:h-6 text-sm sm:text-xs flex-1"
            autoFocus
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 sm:h-6 sm:w-6 shrink-0"
            onClick={handleAddNestedSubtask}
            disabled={createNestedSubtask.isPending}
          >
            <Check className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 sm:h-6 sm:w-6 shrink-0"
            onClick={() => {
              setShowNestedInput(false);
              setNestedTitle("");
            }}
          >
            <X className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
          </Button>
        </div>
      )}

      {/* Nested subtasks */}
      {isExpanded && nestedSubtasks.length > 0 && (
        <div className="mt-1">
          {nestedSubtasks.map((nestedSubtask) => (
            <NestedSubtaskItem
              key={nestedSubtask.id}
              subtask={nestedSubtask}
              taskId={taskId}
              depth={depth + 1}
              onCelebrate={onCelebrate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
