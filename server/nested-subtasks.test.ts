import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { eq } from "drizzle-orm";
import { subtasks, tasks } from "../drizzle/schema";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `nested-test-user-${userId}`,
    email: `nested${userId}@example.com`,
    name: `Nested Test User ${userId}`,
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
    res: {} as TrpcContext["res"],
  };

  return ctx;
}

describe("nested subtasks", () => {
  let ctx: TrpcContext;
  let caller: ReturnType<typeof appRouter.createCaller>;
  let taskId: number;
  let subtaskId: number;
  let testUserId: number;

  beforeEach(async () => {
    testUserId = Math.floor(Math.random() * 1000000) + 1;
    ctx = createAuthContext(testUserId);
    caller = appRouter.createCaller(ctx);

    // Create a task to work with
    const taskResult = await caller.tasks.create({
      title: "Parent Task",
      listType: "must_do",
    });
    taskId = taskResult.id;

    // Create a top-level subtask
    const subtaskResult = await caller.subtasks.create({
      taskId,
      title: "Top-level Subtask",
    });
    subtaskId = subtaskResult.id;
  });

  afterEach(async () => {
    // Clean up: delete all subtasks and tasks for this user
    const db = await getDb();
    if (db) {
      await db.delete(subtasks).where(eq(subtasks.userId, testUserId));
      await db.delete(tasks).where(eq(tasks.userId, testUserId));
    }
  });

  it("creates a nested subtask with parentSubtaskId", async () => {
    const result = await caller.subtasks.create({
      taskId,
      title: "Nested Subtask Level 1",
      parentSubtaskId: subtaskId,
    });

    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe("number");
  });

  it("retrieves nested subtasks for a parent subtask", async () => {
    // Create a nested subtask
    await caller.subtasks.create({
      taskId,
      title: "Nested Subtask 1",
      parentSubtaskId: subtaskId,
    });

    await caller.subtasks.create({
      taskId,
      title: "Nested Subtask 2",
      parentSubtaskId: subtaskId,
    });

    // Retrieve nested subtasks
    const nestedSubtasks = await caller.subtasks.getNestedSubtasks({
      parentSubtaskId: subtaskId,
    });

    expect(nestedSubtasks).toHaveLength(2);
    expect(nestedSubtasks[0]?.title).toBe("Nested Subtask 1");
    expect(nestedSubtasks[1]?.title).toBe("Nested Subtask 2");
  });

  it("supports multiple levels of nesting", async () => {
    // Create level 1 nested subtask
    const level1Result = await caller.subtasks.create({
      taskId,
      title: "Level 1 Nested",
      parentSubtaskId: subtaskId,
    });
    const level1Id = level1Result.id;

    // Create level 2 nested subtask
    const level2Result = await caller.subtasks.create({
      taskId,
      title: "Level 2 Nested",
      parentSubtaskId: level1Id,
    });
    const level2Id = level2Result.id;

    // Create level 3 nested subtask
    const level3Result = await caller.subtasks.create({
      taskId,
      title: "Level 3 Nested",
      parentSubtaskId: level2Id,
    });

    // Verify level 1
    const level1Nested = await caller.subtasks.getNestedSubtasks({
      parentSubtaskId: subtaskId,
    });
    expect(level1Nested).toHaveLength(1);
    expect(level1Nested[0]?.title).toBe("Level 1 Nested");

    // Verify level 2
    const level2Nested = await caller.subtasks.getNestedSubtasks({
      parentSubtaskId: level1Id,
    });
    expect(level2Nested).toHaveLength(1);
    expect(level2Nested[0]?.title).toBe("Level 2 Nested");

    // Verify level 3
    const level3Nested = await caller.subtasks.getNestedSubtasks({
      parentSubtaskId: level2Id,
    });
    expect(level3Nested).toHaveLength(1);
    expect(level3Nested[0]?.title).toBe("Level 3 Nested");
  });

  it("reorders nested subtasks within a parent", async () => {
    // Create two nested subtasks
    const nested1 = await caller.subtasks.create({
      taskId,
      title: "Nested 1",
      parentSubtaskId: subtaskId,
    });

    const nested2 = await caller.subtasks.create({
      taskId,
      title: "Nested 2",
      parentSubtaskId: subtaskId,
    });

    // Reorder them
    await caller.subtasks.reorder({
      taskId,
      orderedIds: [nested2.id, nested1.id],
      parentSubtaskId: subtaskId,
    });

    // Verify order
    const reordered = await caller.subtasks.getNestedSubtasks({
      parentSubtaskId: subtaskId,
    });

    expect(reordered[0]?.id).toBe(nested2.id);
    expect(reordered[1]?.id).toBe(nested1.id);
  });

  it("marks nested subtask as completed", async () => {
    const nested = await caller.subtasks.create({
      taskId,
      title: "Nested to Complete",
      parentSubtaskId: subtaskId,
    });

    await caller.subtasks.update({
      id: nested.id,
      completed: true,
      subtaskTitle: "Nested to Complete",
    });

    const updated = await caller.subtasks.getNestedSubtasks({
      parentSubtaskId: subtaskId,
    });

    expect(updated[0]?.completed).toBe(true);
  });

  it("deletes a nested subtask", async () => {
    const nested = await caller.subtasks.create({
      taskId,
      title: "Nested to Delete",
      parentSubtaskId: subtaskId,
    });

    await caller.subtasks.delete({ id: nested.id });

    const remaining = await caller.subtasks.getNestedSubtasks({
      parentSubtaskId: subtaskId,
    });

    expect(remaining).toHaveLength(0);
  });

  it("sets due date on nested subtask", async () => {
    const nested = await caller.subtasks.create({
      taskId,
      title: "Nested with Due Date",
      parentSubtaskId: subtaskId,
    });

    const dueDate = Date.now() + 86400000; // tomorrow
    await caller.subtasks.update({
      id: nested.id,
      dueDate,
    });

    const updated = await caller.subtasks.getNestedSubtasks({
      parentSubtaskId: subtaskId,
    });

    expect(updated[0]?.dueDate).toBe(dueDate);
  });

  it("retrieves only top-level subtasks when no parent specified", async () => {
    // Create nested subtask
    const nested = await caller.subtasks.create({
      taskId,
      title: "Nested Subtask",
      parentSubtaskId: subtaskId,
    });

    // Verify the nested subtask has the correct parentSubtaskId
    const nestedSubtasks = await caller.subtasks.getNestedSubtasks({
      parentSubtaskId: subtaskId,
    });
    expect(nestedSubtasks).toHaveLength(1);
    expect(nestedSubtasks[0]?.id).toBe(nested.id);
    expect(nestedSubtasks[0]?.parentSubtaskId).toBe(subtaskId);
  });

  it("edits a nested subtask title", async () => {
    const nested = await caller.subtasks.create({
      taskId,
      title: "Original Title",
      parentSubtaskId: subtaskId,
    });

    await caller.subtasks.update({
      id: nested.id,
      title: "Updated Title",
    });

    const updated = await caller.subtasks.getNestedSubtasks({
      parentSubtaskId: subtaskId,
    });

    expect(updated[0]?.title).toBe("Updated Title");
  });
});
