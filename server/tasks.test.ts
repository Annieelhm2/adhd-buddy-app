import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId = 1): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

function createUnauthContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

describe("tasks.create", () => {
  it("creates a must_do task successfully", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tasks.create({
      title: "Test task",
      listType: "must_do",
    });

    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });

  it("creates a could_do task successfully", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tasks.create({
      title: "Optional task",
      listType: "could_do",
    });

    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });

  it("rejects empty title", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.tasks.create({ title: "", listType: "must_do" })
    ).rejects.toThrow();
  });

  it("rejects unauthenticated users", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.tasks.create({ title: "Test", listType: "must_do" })
    ).rejects.toThrow();
  });
});

describe("tasks.list", () => {
  it("returns tasks for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a task first
    await caller.tasks.create({ title: "List test task", listType: "must_do" });

    const tasks = await caller.tasks.list();
    expect(Array.isArray(tasks)).toBe(true);
    expect(tasks.length).toBeGreaterThan(0);

    const task = tasks.find((t) => t.title === "List test task");
    expect(task).toBeDefined();
    expect(task?.listType).toBe("must_do");
    expect(task?.completed).toBe(false);
    expect(task?.subtasks).toBeDefined();
    expect(Array.isArray(task?.subtasks)).toBe(true);
  });

  it("filters by listType", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await caller.tasks.create({ title: "Must task", listType: "must_do" });
    await caller.tasks.create({ title: "Could task", listType: "could_do" });

    const mustTasks = await caller.tasks.list({ listType: "must_do" });
    const couldTasks = await caller.tasks.list({ listType: "could_do" });

    expect(mustTasks.every((t) => t.listType === "must_do")).toBe(true);
    expect(couldTasks.every((t) => t.listType === "could_do")).toBe(true);
  });

  it("rejects unauthenticated users", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.tasks.list()).rejects.toThrow();
  });
});

describe("tasks.update", () => {
  it("updates task title", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const created = await caller.tasks.create({
      title: "Original title",
      listType: "must_do",
    });

    const result = await caller.tasks.update({
      id: created.id,
      title: "Updated title",
    });

    expect(result).toEqual({ success: true });

    const tasks = await caller.tasks.list();
    const updated = tasks.find((t) => t.id === created.id);
    expect(updated?.title).toBe("Updated title");
  });

  it("marks task as completed", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const created = await caller.tasks.create({
      title: "Complete me",
      listType: "must_do",
    });

    await caller.tasks.update({ id: created.id, completed: true });

    const tasks = await caller.tasks.list();
    const completed = tasks.find((t) => t.id === created.id);
    expect(completed?.completed).toBe(true);
  });
});

describe("tasks.delete", () => {
  it("deletes a task", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const created = await caller.tasks.create({
      title: "Delete me",
      listType: "must_do",
    });

    const result = await caller.tasks.delete({ id: created.id });
    expect(result).toEqual({ success: true });

    const tasks = await caller.tasks.list();
    const deleted = tasks.find((t) => t.id === created.id);
    expect(deleted).toBeUndefined();
  });
});

describe("subtasks", () => {
  it("creates a subtask for a task", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const task = await caller.tasks.create({
      title: "Parent task",
      listType: "must_do",
    });

    const subtask = await caller.subtasks.create({
      taskId: task.id,
      title: "Child step",
    });

    expect(subtask).toHaveProperty("id");

    const tasks = await caller.tasks.list();
    const parent = tasks.find((t) => t.id === task.id);
    expect(parent?.subtasks.length).toBeGreaterThan(0);
    expect(parent?.subtasks.some((s) => s.title === "Child step")).toBe(true);
  });

  it("updates a subtask", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const task = await caller.tasks.create({
      title: "Parent for update",
      listType: "must_do",
    });

    const subtask = await caller.subtasks.create({
      taskId: task.id,
      title: "Original subtask",
    });

    await caller.subtasks.update({
      id: subtask.id,
      title: "Updated subtask",
      completed: true,
    });

    const tasks = await caller.tasks.list();
    const parent = tasks.find((t) => t.id === task.id);
    const updated = parent?.subtasks.find((s) => s.id === subtask.id);
    expect(updated?.title).toBe("Updated subtask");
    expect(updated?.completed).toBe(true);
  });

  it("deletes a subtask", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const task = await caller.tasks.create({
      title: "Parent for delete",
      listType: "must_do",
    });

    const subtask = await caller.subtasks.create({
      taskId: task.id,
      title: "Delete this subtask",
    });

    await caller.subtasks.delete({ id: subtask.id });

    const tasks = await caller.tasks.list();
    const parent = tasks.find((t) => t.id === task.id);
    expect(parent?.subtasks.find((s) => s.id === subtask.id)).toBeUndefined();
  });

  it("rejects unauthenticated subtask creation", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.subtasks.create({ taskId: 1, title: "Test" })
    ).rejects.toThrow();
  });

  it("creates a subtask with a due date", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const task = await caller.tasks.create({ title: "Parent with subtask due", listType: "must_do" });
    const tomorrow = Date.now() + 24 * 60 * 60 * 1000;
    const subtask = await caller.subtasks.create({
      taskId: task.id,
      title: "Subtask with due date",
      dueDate: tomorrow,
    });

    expect(subtask).toHaveProperty("id");

    const tasks = await caller.tasks.list();
    const parent = tasks.find((t) => t.id === task.id);
    const sub = parent?.subtasks.find((s) => s.id === subtask.id);
    expect(sub).toBeDefined();
    expect(sub?.dueDate).toBe(tomorrow);
  });

  it("creates a subtask without a due date (null)", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const task = await caller.tasks.create({ title: "Parent no sub due", listType: "must_do" });
    const subtask = await caller.subtasks.create({
      taskId: task.id,
      title: "Subtask no due date",
    });

    const tasks = await caller.tasks.list();
    const parent = tasks.find((t) => t.id === task.id);
    const sub = parent?.subtasks.find((s) => s.id === subtask.id);
    expect(sub?.dueDate).toBeNull();
  });

  it("updates a subtask due date", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const task = await caller.tasks.create({ title: "Parent update sub due", listType: "must_do" });
    const subtask = await caller.subtasks.create({
      taskId: task.id,
      title: "Update sub due date",
    });

    const nextWeek = Date.now() + 7 * 24 * 60 * 60 * 1000;
    await caller.subtasks.update({ id: subtask.id, dueDate: nextWeek });

    const tasks = await caller.tasks.list();
    const parent = tasks.find((t) => t.id === task.id);
    const sub = parent?.subtasks.find((s) => s.id === subtask.id);
    expect(sub?.dueDate).toBe(nextWeek);
  });

  it("removes a subtask due date by setting null", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const tomorrow = Date.now() + 24 * 60 * 60 * 1000;
    const task = await caller.tasks.create({ title: "Parent remove sub due", listType: "must_do" });
    const subtask = await caller.subtasks.create({
      taskId: task.id,
      title: "Remove sub due date",
      dueDate: tomorrow,
    });

    await caller.subtasks.update({ id: subtask.id, dueDate: null });

    const tasks = await caller.tasks.list();
    const parent = tasks.find((t) => t.id === task.id);
    const sub = parent?.subtasks.find((s) => s.id === subtask.id);
    expect(sub?.dueDate).toBeNull();
  });
});

describe("tasks.reorder", () => {
  it("reorders tasks within a list", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const task1 = await caller.tasks.create({ title: "First", listType: "must_do" });
    const task2 = await caller.tasks.create({ title: "Second", listType: "must_do" });
    const task3 = await caller.tasks.create({ title: "Third", listType: "must_do" });

    // Reorder: Third, First, Second
    const result = await caller.tasks.reorder({
      listType: "must_do",
      orderedIds: [task3.id, task1.id, task2.id],
    });

    expect(result).toEqual({ success: true });
  });
});

describe("tasks.dueDate", () => {
  it("creates a task with a due date", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const tomorrow = Date.now() + 24 * 60 * 60 * 1000;
    const result = await caller.tasks.create({
      title: "Task with due date",
      listType: "must_do",
      dueDate: tomorrow,
    });

    expect(result).toHaveProperty("id");

    const tasks = await caller.tasks.list();
    const task = tasks.find((t) => t.id === result.id);
    expect(task).toBeDefined();
    expect(task?.dueDate).toBe(tomorrow);
  });

  it("creates a task without a due date (null)", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tasks.create({
      title: "Task no due date",
      listType: "must_do",
    });

    const tasks = await caller.tasks.list();
    const task = tasks.find((t) => t.id === result.id);
    expect(task?.dueDate).toBeNull();
  });

  it("updates a task due date", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const created = await caller.tasks.create({
      title: "Update due date task",
      listType: "must_do",
    });

    const nextWeek = Date.now() + 7 * 24 * 60 * 60 * 1000;
    await caller.tasks.update({ id: created.id, dueDate: nextWeek });

    const tasks = await caller.tasks.list();
    const updated = tasks.find((t) => t.id === created.id);
    expect(updated?.dueDate).toBe(nextWeek);
  });

  it("removes a task due date by setting null", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const tomorrow = Date.now() + 24 * 60 * 60 * 1000;
    const created = await caller.tasks.create({
      title: "Remove due date task",
      listType: "must_do",
      dueDate: tomorrow,
    });

    await caller.tasks.update({ id: created.id, dueDate: null });

    const tasks = await caller.tasks.list();
    const updated = tasks.find((t) => t.id === created.id);
    expect(updated?.dueDate).toBeNull();
  });
});

describe("stats.get", () => {
  it("returns user stats", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.stats.get();

    expect(stats).toHaveProperty("totalTasks");
    expect(stats).toHaveProperty("completedTasks");
    expect(stats).toHaveProperty("totalSubtasks");
    expect(stats).toHaveProperty("completedSubtasks");
    expect(typeof stats.totalTasks).toBe("number");
    expect(typeof stats.completedTasks).toBe("number");
  });
});

describe("chat", () => {
  it("returns chat messages for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const messages = await caller.chat.messages();
    expect(Array.isArray(messages)).toBe(true);
  });

  it("clears chat history", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.clear();
    expect(result).toEqual({ success: true });

    const messages = await caller.chat.messages();
    expect(messages.length).toBe(0);
  });

  it("rejects unauthenticated chat access", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.chat.messages()).rejects.toThrow();
  });
});

describe("brainDump", () => {
  it("creates a brain dump", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.brainDump.create({
      content: "Random thought about project",
    });

    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });

  it("creates a brain dump with color", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.brainDump.create({
      content: "Colored thought",
      color: "yellow",
    });

    expect(result).toHaveProperty("id");

    const dumps = await caller.brainDump.list();
    const dump = dumps.find((d) => d.id === result.id);
    expect(dump?.color).toBe("yellow");
  });

  it("lists brain dumps for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await caller.brainDump.create({ content: "Dump 1" });
    await caller.brainDump.create({ content: "Dump 2" });

    const dumps = await caller.brainDump.list();
    expect(Array.isArray(dumps)).toBe(true);
    expect(dumps.length).toBeGreaterThanOrEqual(2);
  });

  it("updates a brain dump content", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const created = await caller.brainDump.create({ content: "Original thought" });

    const result = await caller.brainDump.update({
      id: created.id,
      content: "Updated thought",
    });

    expect(result).toEqual({ success: true });

    const dumps = await caller.brainDump.list();
    const updated = dumps.find((d) => d.id === created.id);
    expect(updated?.content).toBe("Updated thought");
  });

  it("updates a brain dump color", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const created = await caller.brainDump.create({ content: "Color change" });

    await caller.brainDump.update({ id: created.id, color: "blue" });

    const dumps = await caller.brainDump.list();
    const updated = dumps.find((d) => d.id === created.id);
    expect(updated?.color).toBe("blue");
  });

  it("deletes a brain dump", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const created = await caller.brainDump.create({ content: "Delete me" });

    const result = await caller.brainDump.delete({ id: created.id });
    expect(result).toEqual({ success: true });

    const dumps = await caller.brainDump.list();
    const deleted = dumps.find((d) => d.id === created.id);
    expect(deleted).toBeUndefined();
  });

  it("converts a brain dump to a must_do task", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const created = await caller.brainDump.create({ content: "Convert to task" });

    const result = await caller.brainDump.convertToTask({
      id: created.id,
      listType: "must_do",
    });

    expect(result).toHaveProperty("id");

    // Brain dump should no longer appear in list (it's been converted)
    const dumps = await caller.brainDump.list();
    const converted = dumps.find((d) => d.id === created.id);
    expect(converted).toBeUndefined();

    // Task should exist
    const tasks = await caller.tasks.list({ listType: "must_do" });
    const task = tasks.find((t) => t.id === result.id);
    expect(task).toBeDefined();
    expect(task?.title).toBe("Convert to task");
  });

  it("converts a brain dump to a could_do task", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const created = await caller.brainDump.create({ content: "Maybe do this" });

    const result = await caller.brainDump.convertToTask({
      id: created.id,
      listType: "could_do",
    });

    expect(result).toHaveProperty("id");

    const tasks = await caller.tasks.list({ listType: "could_do" });
    const task = tasks.find((t) => t.id === result.id);
    expect(task).toBeDefined();
    expect(task?.title).toBe("Maybe do this");
  });

  it("rejects empty content", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.brainDump.create({ content: "" })
    ).rejects.toThrow();
  });

  it("rejects unauthenticated access", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.brainDump.list()).rejects.toThrow();
  });
});
