import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BuddyCharacter } from "@/components/BuddyCharacter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useState, useCallback } from "react";
import { useActionNudge } from "@/hooks/useActionNudge";
import { ActionNudgeBanner } from "@/components/ActionNudgeBanner";
import {
  Plus,
  Trash2,
  Play,
  Zap,
  Sparkles,
  X,
  LayoutTemplate,
  ListChecks,
  Pencil,
  GripVertical,
  Check,
  Save,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const BUDDY_MESSAGES = [
  "Templates save you brainpower! Less deciding, more doing!",
  "Smart move! Templates mean less setup, more action!",
  "Pre-built routines are an ADHD superpower!",
  "Templates = instant structure. Your future self will thank you!",
  "One template can save you hundreds of decisions!",
];

// ============ Sortable Subtask Row (for edit mode) ============

interface SortableSubtaskRowProps {
  id: string;
  index: number;
  title: string;
  onChange: (value: string) => void;
  onDelete: () => void;
  canDelete: boolean;
}

function SortableSubtaskRow({
  id,
  index,
  title,
  onChange,
  onDelete,
  canDelete,
}: SortableSubtaskRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 ${isDragging ? "z-50" : ""}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing shrink-0 touch-none p-0.5"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="text-xs text-muted-foreground font-mono w-5 text-center shrink-0">
        {index + 1}.
      </span>
      <Input
        value={title}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Step ${index + 1}...`}
        className="rounded-lg h-10 text-sm flex-1"
      />
      {canDelete && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

// ============ Template Card (with inline editing) ============

interface TemplateCardProps {
  tmpl: {
    id: number;
    title: string;
    listType: string;
    subtasks: { id: number; title: string; sortOrder: number }[];
  };
}

function TemplateCard({ tmpl }: TemplateCardProps) {
  const utils = trpc.useUtils();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(tmpl.title);
  const [editListType, setEditListType] = useState(tmpl.listType);
  const [editSubtasks, setEditSubtasks] = useState<
    { localId: string; dbId?: number; title: string }[]
  >([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const startEditing = useCallback(() => {
    setEditTitle(tmpl.title);
    setEditListType(tmpl.listType);
    setEditSubtasks(
      tmpl.subtasks.map((s, i) => ({
        localId: `existing-${s.id}-${i}`,
        dbId: s.id,
        title: s.title,
      }))
    );
    setIsEditing(true);
  }, [tmpl]);

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const updateMutation = trpc.templates.update.useMutation({
    onSuccess: () => {
      utils.templates.list.invalidate();
      setIsEditing(false);
      toast.success("Template updated!");
    },
    onError: () => {
      toast.error("Couldn't update template. Try again!");
    },
  });

  const deleteMutation = trpc.templates.delete.useMutation({
    onSuccess: () => {
      utils.templates.list.invalidate();
      toast.success("Template removed!");
    },
  });

  const useMutation = trpc.templates.useTemplate.useMutation({
    onSuccess: (result) => {
      utils.tasks.list.invalidate();
      toast.success(
        `Task created with ${result.subtaskCount} subtasks! Go get it done! 🚀`
      );
    },
    onError: () => {
      toast.error("Couldn't create task from template. Try again!");
    },
  });

  const handleSave = () => {
    if (!editTitle.trim()) {
      toast.error("Template needs a name!");
      return;
    }
    const validSubtasks = editSubtasks
      .filter((s) => s.title.trim())
      .map((s) => ({ id: s.dbId, title: s.title.trim() }));

    updateMutation.mutate({
      id: tmpl.id,
      title: editTitle.trim(),
      listType: editListType as "must_do" | "could_do",
      subtasks: validSubtasks,
    });
  };

  const handleAddEditSubtask = () => {
    setEditSubtasks([
      ...editSubtasks,
      { localId: `new-${Date.now()}-${Math.random()}`, title: "" },
    ]);
  };

  const handleEditSubtaskChange = (localId: string, value: string) => {
    setEditSubtasks(
      editSubtasks.map((s) => (s.localId === localId ? { ...s, title: value } : s))
    );
  };

  const handleDeleteEditSubtask = (localId: string) => {
    setEditSubtasks(editSubtasks.filter((s) => s.localId !== localId));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = editSubtasks.findIndex((s) => s.localId === active.id);
    const newIndex = editSubtasks.findIndex((s) => s.localId === over.id);
    setEditSubtasks(arrayMove(editSubtasks, oldIndex, newIndex));
  };

  if (isEditing) {
    return (
      <Card className="rounded-2xl border-2 border-primary/30 shadow-md">
        <CardHeader className="pb-3 px-4 sm:px-6 pt-4 sm:pt-5">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-semibold text-sm">Template Name</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="rounded-xl h-11 text-base font-semibold"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-sm">Default List</Label>
              <Select
                value={editListType}
                onValueChange={setEditListType}
              >
                <SelectTrigger className="rounded-xl h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="must_do">
                    <span className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-orange-500" /> Must Do
                    </span>
                  </SelectItem>
                  <SelectItem value="could_do">
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-teal-500" /> Could Do
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ListChecks className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  Steps (drag to reorder):
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddEditSubtask}
                className="text-primary gap-1 text-sm"
              >
                <Plus className="h-3.5 w-3.5" /> Add Step
              </Button>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={editSubtasks.map((s) => s.localId)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  <AnimatePresence>
                    {editSubtasks.map((sub, i) => (
                      <motion.div
                        key={sub.localId}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <SortableSubtaskRow
                          id={sub.localId}
                          index={i}
                          title={sub.title}
                          onChange={(v) =>
                            handleEditSubtaskChange(sub.localId, v)
                          }
                          onDelete={() =>
                            handleDeleteEditSubtask(sub.localId)
                          }
                          canDelete={editSubtasks.length > 0}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </SortableContext>
            </DndContext>

            {editSubtasks.length === 0 && (
              <p className="text-xs text-muted-foreground italic text-center py-2">
                No steps yet. Add some to break down this task!
              </p>
            )}

            <div className="flex items-center gap-2 pt-3 border-t">
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="rounded-xl font-semibold gap-2 flex-1"
              >
                <Save className="h-4 w-4" />
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                variant="outline"
                onClick={cancelEditing}
                className="rounded-xl"
              >
                Cancel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base sm:text-lg font-bold truncate">
              {tmpl.title}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1.5">
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                  tmpl.listType === "must_do"
                    ? "bg-orange-100 text-orange-700"
                    : "bg-teal-100 text-teal-700"
                }`}
              >
                {tmpl.listType === "must_do" ? (
                  <Zap className="h-3 w-3" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                {tmpl.listType === "must_do" ? "Must Do" : "Could Do"}
              </span>
              {tmpl.subtasks.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {tmpl.subtasks.length} step
                  {tmpl.subtasks.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              onClick={() => useMutation.mutate({ templateId: tmpl.id })}
              disabled={useMutation.isPending}
              className="rounded-xl gap-1.5 font-semibold text-xs sm:text-sm px-3 sm:px-4"
            >
              <Play className="h-3.5 w-3.5" />
              Use
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={startEditing}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
              title="Edit template"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete template?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove the &ldquo;{tmpl.title}&rdquo;
                    template. Tasks already created from it won&apos;t be
                    affected.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate({ id: tmpl.id })}
                    className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      {tmpl.subtasks.length > 0 && (
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-5 pt-1">
          <div className="flex items-center gap-1.5 mb-2">
            <ListChecks className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              Steps:
            </span>
          </div>
          <div className="space-y-1.5">
            {tmpl.subtasks.map((sub, i) => (
              <div
                key={sub.id}
                className="flex items-center gap-2 text-sm"
              >
                <span className="text-xs text-muted-foreground font-mono w-4 text-center shrink-0">
                  {i + 1}.
                </span>
                <span className="text-foreground/80">{sub.title}</span>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ============ Main Templates Page ============

export default function Templates() {
  const utils = trpc.useUtils();
  const { data: templates, isLoading } = trpc.templates.list.useQuery();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newListType, setNewListType] = useState<"must_do" | "could_do">(
    "must_do"
  );
  const [newSubtasks, setNewSubtasks] = useState<string[]>([""]);

  const createMutation = trpc.templates.create.useMutation({
    onSuccess: () => {
      utils.templates.list.invalidate();
      setNewTitle("");
      setNewListType("must_do");
      setNewSubtasks([""]);
      setIsCreateOpen(false);
      toast.success("Template saved! Ready to use anytime! 🎯");
    },
    onError: () => {
      toast.error("Couldn't save template. Try again!");
    },
  });

  const handleAddSubtask = () => {
    setNewSubtasks([...newSubtasks, ""]);
  };

  const handleRemoveSubtask = (index: number) => {
    setNewSubtasks(newSubtasks.filter((_, i) => i !== index));
  };

  const handleSubtaskChange = (index: number, value: string) => {
    const updated = [...newSubtasks];
    updated[index] = value;
    setNewSubtasks(updated);
  };

  const handleCreate = () => {
    if (!newTitle.trim()) {
      toast.error("Give your template a name!");
      return;
    }
    const validSubtasks = newSubtasks.filter((s) => s.trim());
    createMutation.mutate({
      title: newTitle.trim(),
      listType: newListType,
      subtaskTitles: validSubtasks,
    });
  };

  const buddyMessage =
    BUDDY_MESSAGES[Math.floor(Math.random() * BUDDY_MESSAGES.length)];

  const { showNudge, nudgeMessage, dismissNudge } = useActionNudge();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header with buddy */}
      <div className="flex flex-col items-center gap-2 pt-2 pb-4">
        <BuddyCharacter mood="happy" size={90} message={buddyMessage} />
      </div>

      {/* Action nudge */}
      <ActionNudgeBanner
        show={showNudge}
        message={nudgeMessage}
        onDismiss={dismissNudge}
        contextLine="Templates are set up — now go tackle your tasks! The app is a tool, not a destination!"
      />

      {/* Title + Create button */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <LayoutTemplate className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Task Templates
          </h1>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl font-semibold gap-2 text-sm sm:text-base px-4 sm:px-5 py-2 sm:py-2.5">
              <Plus className="h-4 w-4" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                Create Task Template
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5 py-2">
              <div className="space-y-2">
                <Label htmlFor="tmpl-title" className="font-semibold text-sm">
                  Template Name
                </Label>
                <Input
                  id="tmpl-title"
                  placeholder="e.g., Morning Routine, Weekly Review..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="rounded-xl h-11 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-sm">Default List</Label>
                <Select
                  value={newListType}
                  onValueChange={(v) =>
                    setNewListType(v as "must_do" | "could_do")
                  }
                >
                  <SelectTrigger className="rounded-xl h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="must_do">
                      <span className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-orange-500" /> Must Do
                      </span>
                    </SelectItem>
                    <SelectItem value="could_do">
                      <span className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-teal-500" /> Could Do
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-sm">Subtasks</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAddSubtask}
                    className="text-primary gap-1 text-sm"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Step
                  </Button>
                </div>
                <div className="space-y-2">
                  <AnimatePresence>
                    {newSubtasks.map((sub, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-2"
                      >
                        <span className="text-xs text-muted-foreground font-mono w-5 text-center shrink-0">
                          {i + 1}.
                        </span>
                        <Input
                          placeholder={`Step ${i + 1}...`}
                          value={sub}
                          onChange={(e) =>
                            handleSubtaskChange(i, e.target.value)
                          }
                          className="rounded-lg h-10 text-sm flex-1"
                        />
                        {newSubtasks.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveSubtask(i)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                {newSubtasks.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">
                    No subtasks yet. Add steps to break down this task!
                  </p>
                )}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <DialogClose asChild>
                <Button variant="outline" className="rounded-xl">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="rounded-xl font-semibold gap-2"
              >
                {createMutation.isPending ? "Saving..." : "Save Template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates list */}
      {isLoading ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <div className="h-8 w-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading templates...</p>
        </div>
      ) : !templates || templates.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <LayoutTemplate className="h-12 w-12 text-muted-foreground/40" />
          <div>
            <p className="font-semibold text-base text-muted-foreground">
              No templates yet
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1 max-w-xs mx-auto">
              Create templates for tasks you do regularly — like morning
              routines, weekly reviews, or project setups!
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {templates.map((tmpl) => (
              <motion.div
                key={tmpl.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <TemplateCard tmpl={tmpl} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
