import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { BuddyCharacter } from "@/components/BuddyCharacter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Brain,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  ArrowRightCircle,
  Zap,
  Leaf,
  MoreVertical,
  Palette,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useActionNudge } from "@/hooks/useActionNudge";
import { ActionNudgeBanner } from "@/components/ActionNudgeBanner";

const COLOR_OPTIONS = [
  { value: "default", label: "Default", bg: "bg-card", border: "border-border" },
  { value: "yellow", label: "Yellow", bg: "bg-yellow-50", border: "border-yellow-200" },
  { value: "blue", label: "Blue", bg: "bg-blue-50", border: "border-blue-200" },
  { value: "green", label: "Green", bg: "bg-green-50", border: "border-green-200" },
  { value: "pink", label: "Pink", bg: "bg-pink-50", border: "border-pink-200" },
  { value: "purple", label: "Purple", bg: "bg-purple-50", border: "border-purple-200" },
  { value: "orange", label: "Orange", bg: "bg-orange-50", border: "border-orange-200" },
];

function getColorClasses(color: string | null) {
  const found = COLOR_OPTIONS.find((c) => c.value === color);
  return found ?? COLOR_OPTIONS[0];
}

const BUDDY_MESSAGES = [
  "Let it all out! No need to organize yet.",
  "Just dump your thoughts here — we'll sort them later!",
  "Your brain has great ideas. Let's capture them!",
  "No pressure, just write whatever comes to mind.",
  "Think of this as your mental scratch pad!",
];

export default function BrainDump() {
  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: dumps, isLoading } = trpc.brainDump.list.useQuery();
  const utils = trpc.useUtils();

  const createDump = trpc.brainDump.create.useMutation({
    onSuccess: () => {
      utils.brainDump.list.invalidate();
      setNewContent("");
      toast.success("Thought captured!", { icon: "🧠" });
      textareaRef.current?.focus();
    },
  });

  const updateDump = trpc.brainDump.update.useMutation({
    onSuccess: () => {
      utils.brainDump.list.invalidate();
      setEditingId(null);
      setEditContent("");
    },
  });

  const deleteDump = trpc.brainDump.delete.useMutation({
    onSuccess: () => {
      utils.brainDump.list.invalidate();
      toast.success("Thought removed");
    },
  });

  const convertToTask = trpc.brainDump.convertToTask.useMutation({
    onSuccess: (_, variables) => {
      utils.brainDump.list.invalidate();
      utils.tasks.list.invalidate();
      const listLabel = variables.listType === "must_do" ? "Must Do" : "Could Do";
      toast.success(`Moved to ${listLabel} tasks!`, { icon: "✨" });
    },
  });

  const handleAdd = () => {
    if (newContent.trim()) {
      createDump.mutate({ content: newContent.trim() });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleSaveEdit = (id: number) => {
    if (editContent.trim()) {
      updateDump.mutate({ id, content: editContent.trim() });
    }
  };

  const [buddyMessage] = useState(
    () => BUDDY_MESSAGES[Math.floor(Math.random() * BUDDY_MESSAGES.length)]
  );

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="flex justify-center">
          <Skeleton className="h-20 w-20 rounded-full" />
        </div>
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    );
  }

  const { showNudge, nudgeMessage, dismissNudge } = useActionNudge();

  return (
    <div className="space-y-6 sm:space-y-8 max-w-3xl mx-auto">
      {/* Buddy section */}
      <div className="flex justify-center pt-1 sm:pt-2">
        <BuddyCharacter mood="thinking" size={80} message={buddyMessage} />
      </div>

      {/* Action nudge */}
      <ActionNudgeBanner
        show={showNudge}
        message={nudgeMessage}
        onDismiss={dismissNudge}
        contextLine="Brain dump is great for capturing ideas — now pick one and go make it happen!"
      />

      {/* Quick capture input */}
      <div className="bg-card border rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-purple-100">
            <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold">Brain Dump</h2>
        </div>
        <Textarea
          ref={textareaRef}
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What's on your mind? Just dump it here..."
          className="min-h-[80px] text-base sm:text-sm resize-none border-dashed"
          rows={3}
        />
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs sm:text-[11px] text-muted-foreground">
            Press Ctrl+Enter to save
          </p>
          <Button
            size="sm"
            className="h-9 sm:h-8 px-4 text-sm sm:text-xs"
            onClick={handleAdd}
            disabled={!newContent.trim() || createDump.isPending}
          >
            <Plus className="h-4 w-4 sm:h-3.5 sm:w-3.5 mr-1" />
            Capture
          </Button>
        </div>
      </div>

      {/* Dumps list */}
      {(!dumps || dumps.length === 0) ? (
        <div className="text-center py-10 text-muted-foreground">
          <Sparkles className="h-12 w-12 sm:h-10 sm:w-10 mx-auto mb-3 opacity-30" />
          <p className="text-base sm:text-sm font-medium">Your brain dump is empty</p>
          <p className="text-sm sm:text-xs mt-1">
            Start typing above to capture your thoughts, ideas, or anything on your mind
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AnimatePresence mode="popLayout">
            {dumps.map((dump) => {
              const colorClasses = getColorClasses(dump.color);
              const isEditing = editingId === dump.id;

              return (
                <motion.div
                  key={dump.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className={`group rounded-xl border p-4 shadow-sm transition-all hover:shadow-md ${colorClasses.bg} ${colorClasses.border}`}
                >
                  {isEditing ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            handleSaveEdit(dump.id);
                          }
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="min-h-[60px] text-base sm:text-sm resize-none"
                        autoFocus
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-sm sm:text-xs"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="h-3.5 w-3.5 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 text-sm sm:text-xs"
                          onClick={() => handleSaveEdit(dump.id)}
                          disabled={!editContent.trim() || updateDump.isPending}
                        >
                          <Check className="h-3.5 w-3.5 mr-1" />
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-base sm:text-sm whitespace-pre-wrap leading-relaxed flex-1">
                          {dump.content}
                        </p>

                        {/* Actions menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 sm:h-7 sm:w-7 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingId(dump.id);
                                setEditContent(dump.content);
                              }}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>

                            {/* Color submenu */}
                            <DropdownMenuSeparator />
                            <div className="px-2 py-1.5">
                              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                <Palette className="h-3 w-3" /> Color
                              </p>
                              <div className="flex gap-1.5 flex-wrap">
                                {COLOR_OPTIONS.map((c) => (
                                  <button
                                    key={c.value}
                                    onClick={() =>
                                      updateDump.mutate({
                                        id: dump.id,
                                        color: c.value,
                                      })
                                    }
                                    className={`h-6 w-6 rounded-full border-2 transition-all ${c.bg} ${
                                      dump.color === c.value
                                        ? "border-primary ring-2 ring-primary/20"
                                        : "border-border hover:border-primary/50"
                                    }`}
                                    title={c.label}
                                  />
                                ))}
                              </div>
                            </div>

                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                convertToTask.mutate({
                                  id: dump.id,
                                  listType: "must_do",
                                })
                              }
                            >
                              <Zap className="h-4 w-4 mr-2 text-orange-600" />
                              Move to Must Do
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                convertToTask.mutate({
                                  id: dump.id,
                                  listType: "could_do",
                                })
                              }
                            >
                              <Leaf className="h-4 w-4 mr-2 text-teal-600" />
                              Move to Could Do
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => deleteDump.mutate({ id: dump.id })}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Timestamp */}
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(dump.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
