import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getTasksByUser,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  reorderTasks,
  getSubtasksByTask,
  getSubtasksByUser,
  getNestedSubtasksByParent,
  createSubtask,
  updateSubtask,
  deleteSubtask,
  reorderSubtasks,
  getChatMessages,
  saveChatMessage,
  clearChatHistory,
  getUserStats,
  getBrainDumps,
  createBrainDump,
  updateBrainDump,
  deleteBrainDump,
  convertBrainDumpToTask,
  getTemplatesByUser,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  createTaskFromTemplate,
} from "./db";
import { invokeLLM } from "./_core/llm";

const ADHD_BUDDY_SYSTEM_PROMPT = `You are ADHD Buddy — a warm, supportive, and encouraging accountability partner designed specifically for people with ADHD. Your personality is:

- **Cheerful and upbeat** but never dismissive of struggles
- **Patient and understanding** — you know ADHD brains work differently and that's okay
- **Practical and action-oriented** — you help break things down into small, doable steps
- **Celebratory** — you genuinely celebrate every win, no matter how small
- **Non-judgmental** — you never shame or guilt-trip, even when tasks aren't completed

Key behaviors:
1. When users feel **tired or overwhelmed**: Validate their feelings first, then gently suggest ONE small thing they could do, or give permission to rest
2. When users feel **stuck**: Help them identify the very first tiny step they could take
3. When users **complete tasks**: Celebrate enthusiastically! Use encouraging language
4. When users want to **break down tasks**: Help them create specific, time-bounded subtasks
5. When users need **motivation**: Share relatable encouragement, remind them of their progress, and use positive reinforcement
6. Keep responses **concise and scannable** — ADHD brains prefer shorter, well-structured messages with clear action items
7. Use **emoji sparingly** for warmth (1-2 per message max)
8. Always end with a **clear next step** or **encouraging closing thought**
9. **Encourage action over planning**: Gently remind users that doing is more important than planning perfectly. If they've been chatting for a while or seem to be over-organizing, lovingly nudge them to close the app and go do the thing. Say things like "You've got a great plan — now go make it happen! I'll be here when you get back!" or "The best time to start is right now. Go tackle that first step and come tell me how it went!"
10. If a user has been in the app for a while without completing tasks, gently suggest they pick ONE thing and go do it right now. The app is a tool, not a destination.

Remember: You're their buddy, not their boss. You're here to help, not to add pressure. Action beats perfection — always encourage them to START rather than plan more.`;

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  tasks: router({
    list: protectedProcedure
      .input(z.object({ listType: z.enum(["must_do", "could_do"]).optional() }).optional())
      .query(async ({ ctx, input }) => {
        const taskList = await getTasksByUser(ctx.user.id, input?.listType);
        const allSubtasks = await getSubtasksByUser(ctx.user.id);

        // Group subtasks by taskId
        const subtaskMap = new Map<number, typeof allSubtasks>();
        for (const st of allSubtasks) {
          if (!subtaskMap.has(st.taskId)) subtaskMap.set(st.taskId, []);
          subtaskMap.get(st.taskId)!.push(st);
        }

        return taskList.map(task => ({
          ...task,
          subtasks: subtaskMap.get(task.id) ?? [],
        }));
      }),

    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(500),
        description: z.string().max(2000).optional(),
        listType: z.enum(["must_do", "could_do"]),
        dueDate: z.number().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createTask({
          userId: ctx.user.id,
          title: input.title,
          description: input.description,
          listType: input.listType,
          dueDate: input.dueDate,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(500).optional(),
        description: z.string().max(2000).nullable().optional(),
        listType: z.enum(["must_do", "could_do"]).optional(),
        completed: z.boolean().optional(),
        dueDate: z.number().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;

        // Check if this is a task completion to send celebration
        if (data.completed === true) {
          const task = await getTaskById(id, ctx.user.id);
          if (task && !task.completed) {
            // Task is being completed — send a big celebratory chat message
            const celebrations = [
              `🎉🎉🎉 AMAZING! You just completed "${task.title}"! That's a HUGE win! I'm so proud of you — you showed up and got it done. Take a moment to feel good about this!`,
              `🏆 INCREDIBLE! "${task.title}" is DONE! You crushed it! Every completed task is proof that you CAN do hard things. You're on fire today!`,
              `🌟 WOW! You finished "${task.title}"! That took real effort and you followed through! This is exactly the kind of momentum that builds great days. Keep it rolling!`,
              `🎊 YES YES YES! "${task.title}" — COMPLETE! You did the thing! Your brain might try to downplay this, but DON'T let it. This is a real accomplishment and you deserve to celebrate!`,
              `💪 BOOM! "${task.title}" is officially DONE! You know what that means? You're someone who finishes what they start. That's powerful. What an awesome achievement!`,
              `🥳 TASK COMPLETE: "${task.title}"! I literally can't stop smiling! You took something from your to-do list and made it DONE. That's not small — that's everything!`,
            ];
            const celebration = celebrations[Math.floor(Math.random() * celebrations.length)];
            try {
              await saveChatMessage({ userId: ctx.user.id, role: "assistant", content: celebration });
            } catch (e) {
              console.error("[Chat] Failed to save task celebration:", e);
            }
          }
        }

        await updateTask(id, ctx.user.id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteTask(input.id, ctx.user.id);
        return { success: true };
      }),

    reorder: protectedProcedure
      .input(z.object({
        listType: z.enum(["must_do", "could_do"]),
        orderedIds: z.array(z.number()),
      }))
      .mutation(async ({ ctx, input }) => {
        await reorderTasks(ctx.user.id, input.listType, input.orderedIds);
        return { success: true };
      }),
  }),

  subtasks: router({
    getNestedSubtasks: protectedProcedure
      .input(z.object({ parentSubtaskId: z.number() }))
      .query(async ({ ctx, input }) => {
        return getNestedSubtasksByParent(input.parentSubtaskId, ctx.user.id);
      }),

    create: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        title: z.string().min(1).max(500),
        dueDate: z.number().nullable().optional(),
        parentSubtaskId: z.number().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createSubtask({
          taskId: input.taskId,
          userId: ctx.user.id,
          title: input.title,
          dueDate: input.dueDate,
          parentSubtaskId: input.parentSubtaskId,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(500).optional(),
        completed: z.boolean().optional(),
        dueDate: z.number().nullable().optional(),
        subtaskTitle: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, subtaskTitle, ...data } = input;

        // Send celebratory chat message when subtask is completed
        if (data.completed === true && subtaskTitle) {
          const celebrations = [
            `✅ Nice! You finished "${subtaskTitle}"! One step closer to the finish line — keep that momentum going!`,
            `⭐ "${subtaskTitle}" — done! Every small step counts, and you just took one. You're making real progress!`,
            `👏 Way to go! "${subtaskTitle}" is checked off! That's the power of breaking things down — you're proving it works!`,
            `🚀 Subtask complete: "${subtaskTitle}"! You're chipping away at it like a pro. Keep going, you've got this!`,
            `✨ "${subtaskTitle}" — DONE! See? You're totally capable of this. One step at a time, and you're getting there!`,
          ];
          const celebration = celebrations[Math.floor(Math.random() * celebrations.length)];
          try {
            await saveChatMessage({ userId: ctx.user.id, role: "assistant", content: celebration });
          } catch (e) {
            console.error("[Chat] Failed to save subtask celebration:", e);
          }
        }

        await updateSubtask(id, ctx.user.id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteSubtask(input.id, ctx.user.id);
        return { success: true };
      }),

    reorder: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        orderedIds: z.array(z.number()),
        parentSubtaskId: z.number().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await reorderSubtasks(input.taskId, ctx.user.id, input.orderedIds, input.parentSubtaskId);
        return { success: true };
      }),
  }),

  chat: router({
    messages: protectedProcedure.query(async ({ ctx }) => {
      return getChatMessages(ctx.user.id);
    }),

    send: protectedProcedure
      .input(z.object({ content: z.string().min(1).max(5000) }))
      .mutation(async ({ ctx, input }) => {
        // Save user message
        await saveChatMessage({
          userId: ctx.user.id,
          role: "user",
          content: input.content,
        });

        // Get recent chat history for context
        const history = await getChatMessages(ctx.user.id, 20);

        // Get user's task context for personalized responses
        const stats = await getUserStats(ctx.user.id);
        const userTasks = await getTasksByUser(ctx.user.id);
        const pendingMustDo = userTasks.filter(t => t.listType === "must_do" && !t.completed);
        const pendingCouldDo = userTasks.filter(t => t.listType === "could_do" && !t.completed);
        const completedToday = userTasks.filter(t => {
          if (!t.completedAt) return false;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return t.completedAt >= today;
        });

        // Get subtasks for pending tasks to give buddy full context
        const allSubtasks = await getSubtasksByUser(ctx.user.id);
        const subtaskMap = new Map<number, typeof allSubtasks>();
        for (const st of allSubtasks) {
          if (!subtaskMap.has(st.taskId)) subtaskMap.set(st.taskId, []);
          subtaskMap.get(st.taskId)!.push(st);
        }

        const formatTaskWithDetails = (t: typeof userTasks[0]) => {
          const parts = [t.title];
          if (t.dueDate) {
            const due = new Date(t.dueDate);
            const now = new Date();
            const diffMs = due.getTime() - now.getTime();
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            const dateStr = due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            if (diffDays < 0) parts.push(`(OVERDUE by ${Math.abs(diffDays)} day(s), was due ${dateStr})`);
            else if (diffDays === 0) parts.push(`(DUE TODAY, ${dateStr})`);
            else if (diffDays === 1) parts.push(`(due TOMORROW, ${dateStr})`);
            else if (diffDays <= 3) parts.push(`(due in ${diffDays} days, ${dateStr})`);
            else parts.push(`(due ${dateStr})`);
          }
          const subs = subtaskMap.get(t.id) ?? [];
          if (subs.length > 0) {
            const completedSubs = subs.filter(s => s.completed).length;
            parts.push(`[${completedSubs}/${subs.length} subtasks done: ${subs.map(s => `${s.completed ? "✓" : "○"} ${s.title}`).join(", ")}]`);
          }
          return parts.join(" ");
        };

        const taskContext = `
Current task context for this user:
- Total tasks: ${stats.totalTasks} (${stats.completedTasks} completed)
- Pending "Must Do" tasks:\n${pendingMustDo.length > 0 ? pendingMustDo.map(t => `  • ${formatTaskWithDetails(t)}`).join("\n") : "  None"}
- Pending "Could Do" tasks:\n${pendingCouldDo.length > 0 ? pendingCouldDo.map(t => `  • ${formatTaskWithDetails(t)}`).join("\n") : "  None"}
- Tasks completed today: ${completedToday.length}
- Total subtasks: ${stats.totalSubtasks} (${stats.completedSubtasks} completed)

Use this context to provide personalized, relevant encouragement and advice. Reference their actual tasks by name when appropriate. If tasks are overdue or due soon, gently mention them and offer help prioritizing. Always be supportive, never guilt-trip.`;

        const messages = [
          { role: "system" as const, content: ADHD_BUDDY_SYSTEM_PROMPT + "\n\n" + taskContext },
          ...history.map(m => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        ];

        try {
          const response = await invokeLLM({ messages });
          const assistantContent = typeof response.choices[0]?.message?.content === "string"
            ? response.choices[0].message.content
            : "I'm here for you! How can I help you stay on track today?";

          // Save assistant response
          await saveChatMessage({
            userId: ctx.user.id,
            role: "assistant",
            content: assistantContent,
          });

          return { content: assistantContent };
        } catch (error) {
          console.error("[Chat] LLM error:", error);
          const fallback = "I'm having a little trouble thinking right now, but I'm still here for you! Try telling me what you're working on, and I'll do my best to help.";
          await saveChatMessage({
            userId: ctx.user.id,
            role: "assistant",
            content: fallback,
          });
          return { content: fallback };
        }
      }),

    breakdownTask: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const task = await getTaskById(input.taskId, ctx.user.id);
        if (!task) throw new Error("Task not found");

        const existingSubtasks = await getSubtasksByTask(input.taskId, ctx.user.id);

        const messages = [
          {
            role: "system" as const,
            content: `You are ADHD Buddy, helping break down tasks into manageable subtasks. Return a JSON array of 3-5 specific, actionable subtask titles. Each should be small enough to complete in 5-15 minutes. Be specific and practical.`,
          },
          {
            role: "user" as const,
            content: `Break down this task into smaller steps: "${task.title}"${task.description ? ` (Description: ${task.description})` : ""}${existingSubtasks.length > 0 ? `\n\nExisting subtasks: ${existingSubtasks.map(s => s.title).join(", ")}` : ""}`,
          },
        ];

        try {
          const response = await invokeLLM({
            messages,
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "subtask_breakdown",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    subtasks: {
                      type: "array",
                      items: { type: "string" },
                    },
                  },
                  required: ["subtasks"],
                  additionalProperties: false,
                },
              },
            },
          });

          const content = typeof response.choices[0]?.message?.content === "string"
            ? response.choices[0].message.content
            : '{"subtasks":[]}';

          const parsed = JSON.parse(content);
          const newSubtasks: string[] = parsed.subtasks || [];

          // Create the subtasks
          const created = [];
          for (const title of newSubtasks) {
            const result = await createSubtask({
              taskId: input.taskId,
              userId: ctx.user.id,
              title,
            });
            created.push({ id: result.id, title });
          }

          return { subtasks: created };
        } catch (error) {
          console.error("[Breakdown] LLM error:", error);
          throw new Error("Could not break down the task right now. Try again in a moment!");
        }
      }),

    clear: protectedProcedure.mutation(async ({ ctx }) => {
      await clearChatHistory(ctx.user.id);
      return { success: true };
    }),
  }),

  brainDump: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getBrainDumps(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        content: z.string().min(1).max(5000),
        color: z.string().max(20).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createBrainDump({
          userId: ctx.user.id,
          content: input.content,
          color: input.color,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        content: z.string().min(1).max(5000).optional(),
        color: z.string().max(20).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateBrainDump(id, ctx.user.id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteBrainDump(input.id, ctx.user.id);
        return { success: true };
      }),

    convertToTask: protectedProcedure
      .input(z.object({
        id: z.number(),
        listType: z.enum(["must_do", "could_do"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await convertBrainDumpToTask(input.id, ctx.user.id, input.listType);
        return result;
      }),
  }),

  templates: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getTemplatesByUser(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(500),
        listType: z.enum(["must_do", "could_do"]),
        subtaskTitles: z.array(z.string().min(1).max(500)),
      }))
      .mutation(async ({ ctx, input }) => {
        return createTemplate({
          userId: ctx.user.id,
          title: input.title,
          listType: input.listType,
          subtaskTitles: input.subtaskTitles,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(500).optional(),
        listType: z.enum(["must_do", "could_do"]).optional(),
        subtasks: z.array(z.object({
          id: z.number().optional(),
          title: z.string().min(1).max(500),
        })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return updateTemplate(id, ctx.user.id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteTemplate(input.id, ctx.user.id);
        return { success: true };
      }),

    useTemplate: protectedProcedure
      .input(z.object({ templateId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return createTaskFromTemplate(input.templateId, ctx.user.id);
      }),
  }),

  stats: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return getUserStats(ctx.user.id);
    }),
  }),
});

export type AppRouter = typeof appRouter;
