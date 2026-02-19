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
import { useState } from "react";
import { Plus, Trash2, Play, Zap, Sparkles, X, LayoutTemplate, ListChecks } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const BUDDY_MESSAGES = [
  "Templates save you brainpower! Less deciding, more doing!",
  "Smart move! Templates mean less setup, more action!",
  "Pre-built routines are an ADHD superpower!",
  "Templates = instant structure. Your future self will thank you!",
  "One template can save you hundreds of decisions!",
];

export default function Templates() {
  const utils = trpc.useUtils();
  const { data: templates, isLoading } = trpc.templates.list.useQuery();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newListType, setNewListType] = useState<"must_do" | "could_do">("must_do");
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

  const deleteMutation = trpc.templates.delete.useMutation({
    onSuccess: () => {
      utils.templates.list.invalidate();
      toast.success("Template removed!");
    },
  });

  const useMutation = trpc.templates.useTemplate.useMutation({
    onSuccess: (result) => {
      utils.tasks.list.invalidate();
      toast.success(`Task created with ${result.subtaskCount} subtasks! Go get it done! 🚀`);
    },
    onError: () => {
      toast.error("Couldn't create task from template. Try again!");
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header with buddy */}
      <div className="flex flex-col items-center gap-2 pt-2 pb-4">
        <BuddyCharacter
          mood="happy"
          size={90}
          message={buddyMessage}
        />
      </div>

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
              <DialogTitle className="text-lg font-bold">Create Task Template</DialogTitle>
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
              Create templates for tasks you do regularly — like morning routines, weekly reviews, or project setups!
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
                              {tmpl.subtasks.length} step{tmpl.subtasks.length !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          onClick={() =>
                            useMutation.mutate({ templateId: tmpl.id })
                          }
                          disabled={useMutation.isPending}
                          className="rounded-xl gap-1.5 font-semibold text-xs sm:text-sm px-3 sm:px-4"
                        >
                          <Play className="h-3.5 w-3.5" />
                          Use
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
                                This will permanently remove the "{tmpl.title}" template. Tasks already created from it won't be affected.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  deleteMutation.mutate({ id: tmpl.id })
                                }
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
                            <span className="text-foreground/80">
                              {sub.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
