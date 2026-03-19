import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, tasks, subtasks, chatMessages, brainDumps, taskTemplates, templateSubtasks, type Task, type Subtask } from "../drizzle/schema";
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
  dueDate?: number | null;
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
    dueDate: data.dueDate ?? null,
  });

  return { id: Number(result[0].insertId) };
}

export async function updateTask(taskId: number, userId: number, data: {
  title?: string;
  description?: string | null;
  listType?: "must_do" | "could_do";
  completed?: boolean;
  dueDate?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateSet: Record<string, unknown> = {};
  if (data.title !== undefined) updateSet.title = data.title;
  if (data.description !== undefined) updateSet.description = data.description;
  if (data.listType !== undefined) updateSet.listType = data.listType;
  if (data.dueDate !== undefined) updateSet.dueDate = data.dueDate;
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

  // Only return top-level subtasks (parentSubtaskId is null)
  return db
    .select()
    .from(subtasks)
    .where(and(eq(subtasks.taskId, taskId), eq(subtasks.userId, userId), isNull(subtasks.parentSubtaskId)))
    .orderBy(asc(subtasks.sortOrder), asc(subtasks.createdAt));
}

export async function getNestedSubtasksByParent(parentSubtaskId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];

  // Return all nested subtasks for a given parent
  return db
    .select()
    .from(subtasks)
    .where(and(eq(subtasks.parentSubtaskId, parentSubtaskId), eq(subtasks.userId, userId)))
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
  dueDate?: number | null;
  parentSubtaskId?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get max sort order for this parent (or top-level if no parent)
  const conditions = [eq(subtasks.taskId, data.taskId), eq(subtasks.userId, data.userId)];
  if (data.parentSubtaskId) {
    conditions.push(eq(subtasks.parentSubtaskId, data.parentSubtaskId));
  } else {
    conditions.push(isNull(subtasks.parentSubtaskId));
  }

  const existing = await db
    .select({ maxOrder: sql<number>`COALESCE(MAX(${subtasks.sortOrder}), -1)` })
    .from(subtasks)
    .where(and(...conditions));

  const nextOrder = (existing[0]?.maxOrder ?? -1) + 1;

  const result = await db.insert(subtasks).values({
    taskId: data.taskId,
    userId: data.userId,
    title: data.title,
    parentSubtaskId: data.parentSubtaskId ?? null,
    sortOrder: nextOrder,
    dueDate: data.dueDate ?? null,
  });

  return { id: Number(result[0].insertId) };
}

export async function updateSubtask(subtaskId: number, userId: number, data: {
  title?: string;
  completed?: boolean;
  dueDate?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateSet: Record<string, unknown> = {};
  if (data.title !== undefined) updateSet.title = data.title;
  if (data.dueDate !== undefined) updateSet.dueDate = data.dueDate;
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

export async function reorderSubtasks(taskId: number, userId: number, orderedIds: number[], parentSubtaskId?: number | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  for (let i = 0; i < orderedIds.length; i++) {
    const conditions = [eq(subtasks.id, orderedIds[i]), eq(subtasks.userId, userId), eq(subtasks.taskId, taskId)];
    if (parentSubtaskId) {
      conditions.push(eq(subtasks.parentSubtaskId, parentSubtaskId));
    } else {
      conditions.push(isNull(subtasks.parentSubtaskId));
    }
    await db
      .update(subtasks)
      .set({ sortOrder: i })
      .where(and(...conditions));
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

// ==================== BRAIN DUMP QUERIES ====================

export async function getBrainDumps(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(brainDumps)
    .where(and(eq(brainDumps.userId, userId), isNull(brainDumps.convertedToTaskId)))
    .orderBy(desc(brainDumps.createdAt));
}

export async function createBrainDump(data: {
  userId: number;
  content: string;
  color?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(brainDumps).values({
    userId: data.userId,
    content: data.content,
    color: data.color ?? "default",
  });

  return { id: Number(result[0].insertId) };
}

export async function updateBrainDump(dumpId: number, userId: number, data: {
  content?: string;
  color?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateSet: Record<string, unknown> = {};
  if (data.content !== undefined) updateSet.content = data.content;
  if (data.color !== undefined) updateSet.color = data.color;

  if (Object.keys(updateSet).length === 0) return;

  await db
    .update(brainDumps)
    .set(updateSet)
    .where(and(eq(brainDumps.id, dumpId), eq(brainDumps.userId, userId)));
}

export async function deleteBrainDump(dumpId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(brainDumps).where(and(eq(brainDumps.id, dumpId), eq(brainDumps.userId, userId)));
}

export async function convertBrainDumpToTask(dumpId: number, userId: number, listType: "must_do" | "could_do") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the brain dump
  const dumps = await db
    .select()
    .from(brainDumps)
    .where(and(eq(brainDumps.id, dumpId), eq(brainDumps.userId, userId)))
    .limit(1);

  if (dumps.length === 0) throw new Error("Brain dump not found");
  const dump = dumps[0];

  // Create a task from it
  const taskResult = await createTask({
    userId,
    title: dump.content.length > 200 ? dump.content.substring(0, 200) + "..." : dump.content,
    listType,
  });

  // Mark the brain dump as converted
  await db
    .update(brainDumps)
    .set({ convertedToTaskId: taskResult.id })
    .where(eq(brainDumps.id, dumpId));

  return taskResult;
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

// ==================== TEMPLATE QUERIES ====================

export async function getTemplatesByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const tmpls = await db
    .select()
    .from(taskTemplates)
    .where(eq(taskTemplates.userId, userId))
    .orderBy(desc(taskTemplates.createdAt));

  // Fetch subtasks for each template
  const results = [];
  for (const tmpl of tmpls) {
    const subs = await db
      .select()
      .from(templateSubtasks)
      .where(eq(templateSubtasks.templateId, tmpl.id))
      .orderBy(asc(templateSubtasks.sortOrder));
    results.push({ ...tmpl, subtasks: subs });
  }

  return results;
}

export async function createTemplate(data: {
  userId: number;
  title: string;
  listType: "must_do" | "could_do";
  subtaskTitles: string[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(taskTemplates).values({
    userId: data.userId,
    title: data.title,
    listType: data.listType,
  });

  const templateId = Number(result[0].insertId);

  // Insert template subtasks
  for (let i = 0; i < data.subtaskTitles.length; i++) {
    if (data.subtaskTitles[i].trim()) {
      await db.insert(templateSubtasks).values({
        templateId,
        title: data.subtaskTitles[i].trim(),
        sortOrder: i,
      });
    }
  }

  return { id: templateId };
}

export async function deleteTemplate(templateId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete template subtasks first
  await db.delete(templateSubtasks).where(eq(templateSubtasks.templateId, templateId));
  // Delete the template
  await db.delete(taskTemplates).where(and(eq(taskTemplates.id, templateId), eq(taskTemplates.userId, userId)));
}

export async function createTaskFromTemplate(templateId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the template
  const tmpls = await db
    .select()
    .from(taskTemplates)
    .where(and(eq(taskTemplates.id, templateId), eq(taskTemplates.userId, userId)))
    .limit(1);

  if (tmpls.length === 0) throw new Error("Template not found");
  const tmpl = tmpls[0];

  // Create the task
  const taskResult = await createTask({
    userId,
    title: tmpl.title,
    listType: tmpl.listType,
  });

  // Get template subtasks and create real subtasks
  const subs = await db
    .select()
    .from(templateSubtasks)
    .where(eq(templateSubtasks.templateId, templateId))
    .orderBy(asc(templateSubtasks.sortOrder));

  for (const sub of subs) {
    await createSubtask({
      taskId: taskResult.id,
      userId,
      title: sub.title,
    });
  }

  return { taskId: taskResult.id, subtaskCount: subs.length };
}

export async function updateTemplate(templateId: number, userId: number, data: {
  title?: string;
  listType?: "must_do" | "could_do";
  subtasks?: { id?: number; title: string }[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verify ownership
  const tmpls = await db
    .select()
    .from(taskTemplates)
    .where(and(eq(taskTemplates.id, templateId), eq(taskTemplates.userId, userId)))
    .limit(1);

  if (tmpls.length === 0) throw new Error("Template not found");

  // Update template fields
  const updateSet: Record<string, unknown> = {};
  if (data.title !== undefined) updateSet.title = data.title;
  if (data.listType !== undefined) updateSet.listType = data.listType;

  if (Object.keys(updateSet).length > 0) {
    await db
      .update(taskTemplates)
      .set(updateSet)
      .where(and(eq(taskTemplates.id, templateId), eq(taskTemplates.userId, userId)));
  }

  // If subtasks are provided, replace all subtasks with the new list
  if (data.subtasks !== undefined) {
    // Delete all existing subtasks
    await db.delete(templateSubtasks).where(eq(templateSubtasks.templateId, templateId));

    // Insert new subtasks in order
    for (let i = 0; i < data.subtasks.length; i++) {
      const sub = data.subtasks[i];
      if (sub.title.trim()) {
        await db.insert(templateSubtasks).values({
          templateId,
          title: sub.title.trim(),
          sortOrder: i,
        });
      }
    }
  }

  return { success: true };
}
