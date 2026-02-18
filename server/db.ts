import { and, asc, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, tasks, subtasks, chatMessages, type Task, type Subtask } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ==================== TASK QUERIES ====================

export async function getTasksByUser(userId: number, listType?: "must_do" | "could_do") {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(tasks.userId, userId)];
  if (listType) {
    conditions.push(eq(tasks.listType, listType));
  }

  return db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt));
}

export async function getTaskById(taskId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function createTask(data: {
  userId: number;
  title: string;
  description?: string;
  listType: "must_do" | "could_do";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get max sort order for this list type
  const existing = await db
    .select({ maxOrder: sql<number>`COALESCE(MAX(${tasks.sortOrder}), -1)` })
    .from(tasks)
    .where(and(eq(tasks.userId, data.userId), eq(tasks.listType, data.listType)));

  const nextOrder = (existing[0]?.maxOrder ?? -1) + 1;

  const result = await db.insert(tasks).values({
    userId: data.userId,
    title: data.title,
    description: data.description ?? null,
    listType: data.listType,
    sortOrder: nextOrder,
  });

  return { id: Number(result[0].insertId) };
}

export async function updateTask(taskId: number, userId: number, data: {
  title?: string;
  description?: string | null;
  listType?: "must_do" | "could_do";
  completed?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateSet: Record<string, unknown> = {};
  if (data.title !== undefined) updateSet.title = data.title;
  if (data.description !== undefined) updateSet.description = data.description;
  if (data.listType !== undefined) updateSet.listType = data.listType;
  if (data.completed !== undefined) {
    updateSet.completed = data.completed;
    updateSet.completedAt = data.completed ? new Date() : null;
  }

  if (Object.keys(updateSet).length === 0) return;

  await db
    .update(tasks)
    .set(updateSet)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
}

export async function deleteTask(taskId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete subtasks first
  await db.delete(subtasks).where(and(eq(subtasks.taskId, taskId), eq(subtasks.userId, userId)));
  // Delete the task
  await db.delete(tasks).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
}

export async function reorderTasks(userId: number, listType: "must_do" | "could_do", orderedIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Update sort order for each task
  for (let i = 0; i < orderedIds.length; i++) {
    await db
      .update(tasks)
      .set({ sortOrder: i })
      .where(and(eq(tasks.id, orderedIds[i]), eq(tasks.userId, userId), eq(tasks.listType, listType)));
  }
}

// ==================== SUBTASK QUERIES ====================

export async function getSubtasksByTask(taskId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(subtasks)
    .where(and(eq(subtasks.taskId, taskId), eq(subtasks.userId, userId)))
    .orderBy(asc(subtasks.sortOrder), asc(subtasks.createdAt));
}

export async function getSubtasksByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(subtasks)
    .where(eq(subtasks.userId, userId))
    .orderBy(asc(subtasks.sortOrder), asc(subtasks.createdAt));
}

export async function createSubtask(data: {
  taskId: number;
  userId: number;
  title: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select({ maxOrder: sql<number>`COALESCE(MAX(${subtasks.sortOrder}), -1)` })
    .from(subtasks)
    .where(and(eq(subtasks.taskId, data.taskId), eq(subtasks.userId, data.userId)));

  const nextOrder = (existing[0]?.maxOrder ?? -1) + 1;

  const result = await db.insert(subtasks).values({
    taskId: data.taskId,
    userId: data.userId,
    title: data.title,
    sortOrder: nextOrder,
  });

  return { id: Number(result[0].insertId) };
}

export async function updateSubtask(subtaskId: number, userId: number, data: {
  title?: string;
  completed?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateSet: Record<string, unknown> = {};
  if (data.title !== undefined) updateSet.title = data.title;
  if (data.completed !== undefined) {
    updateSet.completed = data.completed;
    updateSet.completedAt = data.completed ? new Date() : null;
  }

  if (Object.keys(updateSet).length === 0) return;

  await db
    .update(subtasks)
    .set(updateSet)
    .where(and(eq(subtasks.id, subtaskId), eq(subtasks.userId, userId)));
}

export async function deleteSubtask(subtaskId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(subtasks).where(and(eq(subtasks.id, subtaskId), eq(subtasks.userId, userId)));
}

export async function reorderSubtasks(taskId: number, userId: number, orderedIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  for (let i = 0; i < orderedIds.length; i++) {
    await db
      .update(subtasks)
      .set({ sortOrder: i })
      .where(and(eq(subtasks.id, orderedIds[i]), eq(subtasks.userId, userId), eq(subtasks.taskId, taskId)));
  }
}

// ==================== CHAT QUERIES ====================

export async function getChatMessages(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.userId, userId))
    .orderBy(asc(chatMessages.createdAt))
    .limit(limit);
}

export async function saveChatMessage(data: {
  userId: number;
  role: "user" | "assistant";
  content: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(chatMessages).values({
    userId: data.userId,
    role: data.role,
    content: data.content,
  });

  return { id: Number(result[0].insertId) };
}

export async function clearChatHistory(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
}

// ==================== STATS QUERIES ====================

export async function getUserStats(userId: number) {
  const db = await getDb();
  if (!db) return { totalTasks: 0, completedTasks: 0, totalSubtasks: 0, completedSubtasks: 0 };

  const taskStats = await db
    .select({
      total: sql<number>`COUNT(*)`,
      completed: sql<number>`SUM(CASE WHEN ${tasks.completed} = true THEN 1 ELSE 0 END)`,
    })
    .from(tasks)
    .where(eq(tasks.userId, userId));

  const subtaskStats = await db
    .select({
      total: sql<number>`COUNT(*)`,
      completed: sql<number>`SUM(CASE WHEN ${subtasks.completed} = true THEN 1 ELSE 0 END)`,
    })
    .from(subtasks)
    .where(eq(subtasks.userId, userId));

  return {
    totalTasks: Number(taskStats[0]?.total ?? 0),
    completedTasks: Number(taskStats[0]?.completed ?? 0),
    totalSubtasks: Number(subtaskStats[0]?.total ?? 0),
    completedSubtasks: Number(subtaskStats[0]?.completed ?? 0),
  };
}
