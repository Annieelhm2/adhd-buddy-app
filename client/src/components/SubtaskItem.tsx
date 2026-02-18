import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GripVertical, Pencil, Trash2, Check, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface SubtaskItemProps {
  subtask: {
    id: number;
    title: string;
    completed: boolean;
  };
  taskId: number;
  onCelebrate: () => void;
}

export function SubtaskItem({ subtask, taskId, onCelebrate }: SubtaskItemProps) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(subtask.title);
  const utils = trpc.useUtils();

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

  const updateSubtask = trpc.subtasks.update.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
    },
  });

  const deleteSubtask = trpc.subtasks.delete.useMutation({
    onSuccess: () => {
      utils.tasks.list.invalidate();
      toast.success("Subtask removed");
    },
  });

  const handleToggle = () => {
    const newCompleted = !subtask.completed;
    updateSubtask.mutate({ id: subtask.id, completed: newCompleted });
    if (newCompleted) {
      onCelebrate();
      toast.success("Nice work on that step!", { icon: "⭐" });
    }
  };

  const handleSaveEdit = () => {
    if (editTitle.trim()) {
      updateSubtask.mutate({ id: subtask.id, title: editTitle.trim() });
      setEditing(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/subtask flex items-center gap-2 py-1 rounded-md hover:bg-muted/50 px-1 ${
        isDragging ? "z-50 bg-card shadow-md" : ""
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="text-muted-foreground/30 hover:text-muted-foreground cursor-grab active:cursor-grabbing shrink-0 touch-none"
        aria-label="Drag to reorder subtask"
      >
        <GripVertical className="h-3 w-3" />
      </button>

      <Checkbox
        checked={subtask.completed}
        onCheckedChange={handleToggle}
        className="shrink-0 h-3.5 w-3.5"
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
            className="h-6 text-xs"
            autoFocus
          />
          <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={handleSaveEdit}>
            <Check className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => setEditing(false)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <span
          className={`text-xs flex-1 ${
            subtask.completed ? "line-through text-muted-foreground" : ""
          }`}
        >
          {subtask.title}
        </span>
      )}

      <div className="flex items-center gap-0.5 opacity-0 group-hover/subtask:opacity-100 transition-opacity shrink-0">
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => {
            setEditTitle(subtask.title);
            setEditing(true);
          }}
          title="Edit subtask"
        >
          <Pencil className="h-2.5 w-2.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-destructive hover:text-destructive"
          onClick={() => deleteSubtask.mutate({ id: subtask.id })}
          title="Delete subtask"
        >
          <Trash2 className="h-2.5 w-2.5" />
        </Button>
      </div>
    </div>
  );
}
