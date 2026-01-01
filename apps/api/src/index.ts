import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Task, Link, UserData, ApiResponse } from "@eisenhower/shared";

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  "/api/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "PUT", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

function getUUID(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

interface TaskRow {
  id: string;
  user_uuid: string;
  title: string;
  note: string;
  tags: string;
  color: string;
  q: string | null;
  kanban: string | null;
  completed: number;
  created_at: number;
  updated_at: number;
  sort_order: number;
}

interface LinkRow {
  id: string;
  user_uuid: string;
  url: string;
  title: string;
  favicon: string;
  created_at: number;
  sort_order: number;
}

interface UserRow {
  uuid: string;
  created_at: number;
  updated_at: number;
}

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    note: row.note,
    tags: JSON.parse(row.tags),
    color: row.color,
    q: row.q as Task["q"],
    kanban: row.kanban as Task["kanban"],
    completed: row.completed === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToLink(row: LinkRow): Link {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    favicon: row.favicon,
    createdAt: row.created_at,
  };
}

app.get("/api/data", async (c) => {
  const uuid = getUUID(c.req.header("Authorization"));

  if (!uuid || !isValidUUID(uuid)) {
    return c.json<ApiResponse<null>>(
      { success: false, error: "Invalid or missing authorization" },
      401,
    );
  }

  const user = await c.env.DB.prepare(
    "SELECT * FROM users WHERE uuid = ?"
  ).bind(uuid).first<UserRow>();

  if (!user) {
    const now = Date.now();
    return c.json<ApiResponse<UserData>>({
      success: true,
      data: { tasks: [], links: [], createdAt: now, updatedAt: now },
    });
  }

  const taskRows = await c.env.DB.prepare(
    "SELECT * FROM tasks WHERE user_uuid = ? ORDER BY sort_order ASC"
  ).bind(uuid).all<TaskRow>();

  const linkRows = await c.env.DB.prepare(
    "SELECT * FROM links WHERE user_uuid = ? ORDER BY sort_order ASC"
  ).bind(uuid).all<LinkRow>();

  const tasks = taskRows.results?.map(rowToTask) ?? [];
  const links = linkRows.results?.map(rowToLink) ?? [];

  return c.json<ApiResponse<UserData>>({
    success: true,
    data: {
      tasks,
      links,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    },
  });
});

app.get("/api/tasks", async (c) => {
  const uuid = getUUID(c.req.header("Authorization"));

  if (!uuid || !isValidUUID(uuid)) {
    return c.json<ApiResponse<null>>(
      { success: false, error: "Invalid or missing authorization" },
      401,
    );
  }

  const taskRows = await c.env.DB.prepare(
    "SELECT * FROM tasks WHERE user_uuid = ? ORDER BY sort_order ASC"
  ).bind(uuid).all<TaskRow>();

  const tasks = taskRows.results?.map(rowToTask) ?? [];

  return c.json<ApiResponse<Task[]>>({
    success: true,
    data: tasks,
  });
});

app.post("/api/tasks", async (c) => {
  const uuid = getUUID(c.req.header("Authorization"));

  if (!uuid || !isValidUUID(uuid)) {
    return c.json<ApiResponse<null>>(
      { success: false, error: "Invalid or missing authorization" },
      401,
    );
  }

  try {
    const task = await c.req.json<Task>();
    const now = Date.now();

    const maxOrder = await c.env.DB.prepare(
      "SELECT COALESCE(MAX(sort_order), -1) as max_order FROM tasks WHERE user_uuid = ?"
    ).bind(uuid).first<{ max_order: number }>();

    const sortOrder = (maxOrder?.max_order ?? -1) + 1;

    await c.env.DB.prepare(
      `INSERT INTO tasks (id, user_uuid, title, note, tags, color, q, kanban, completed, created_at, updated_at, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      task.id,
      uuid,
      task.title,
      task.note,
      JSON.stringify(task.tags),
      task.color,
      task.q,
      task.kanban,
      task.completed ? 1 : 0,
      task.createdAt,
      task.updatedAt,
      sortOrder,
    ).run();

    await c.env.DB.prepare(
      "UPDATE users SET updated_at = ? WHERE uuid = ?"
    ).bind(now, uuid).run();

    return c.json<ApiResponse<Task>>({
      success: true,
      data: task,
    });
  } catch (error) {
    return c.json<ApiResponse<null>>(
      { success: false, error: "Invalid request body" },
      400,
    );
  }
});

app.put("/api/tasks/:id", async (c) => {
  const uuid = getUUID(c.req.header("Authorization"));
  const taskId = c.req.param("id");

  if (!uuid || !isValidUUID(uuid)) {
    return c.json<ApiResponse<null>>(
      { success: false, error: "Invalid or missing authorization" },
      401,
    );
  }

  try {
    const updates = await c.req.json<Partial<Task>>();
    const now = Date.now();

    const existing = await c.env.DB.prepare(
      "SELECT * FROM tasks WHERE id = ? AND user_uuid = ?"
    ).bind(taskId, uuid).first<TaskRow>();

    if (!existing) {
      return c.json<ApiResponse<null>>(
        { success: false, error: "Task not found" },
        404,
      );
    }

    await c.env.DB.prepare(
      `UPDATE tasks SET
        title = ?, note = ?, tags = ?, color = ?, q = ?, kanban = ?, completed = ?, updated_at = ?
       WHERE id = ? AND user_uuid = ?`
    ).bind(
      updates.title ?? existing.title,
      updates.note ?? existing.note,
      updates.tags ? JSON.stringify(updates.tags) : existing.tags,
      updates.color ?? existing.color,
      updates.q !== undefined ? updates.q : existing.q,
      updates.kanban !== undefined ? updates.kanban : existing.kanban,
      updates.completed !== undefined ? (updates.completed ? 1 : 0) : existing.completed,
      now,
      taskId,
      uuid,
    ).run();

    await c.env.DB.prepare(
      "UPDATE users SET updated_at = ? WHERE uuid = ?"
    ).bind(now, uuid).run();

    const updatedRow = await c.env.DB.prepare(
      "SELECT * FROM tasks WHERE id = ? AND user_uuid = ?"
    ).bind(taskId, uuid).first<TaskRow>();

    return c.json<ApiResponse<Task>>({
      success: true,
      data: updatedRow ? rowToTask(updatedRow) : undefined,
    });
  } catch (error) {
    return c.json<ApiResponse<null>>(
      { success: false, error: "Invalid request body" },
      400,
    );
  }
});

app.delete("/api/tasks/:id", async (c) => {
  const uuid = getUUID(c.req.header("Authorization"));
  const taskId = c.req.param("id");

  if (!uuid || !isValidUUID(uuid)) {
    return c.json<ApiResponse<null>>(
      { success: false, error: "Invalid or missing authorization" },
      401,
    );
  }

  const now = Date.now();

  await c.env.DB.prepare(
    "DELETE FROM tasks WHERE id = ? AND user_uuid = ?"
  ).bind(taskId, uuid).run();

  await c.env.DB.prepare(
    "UPDATE users SET updated_at = ? WHERE uuid = ?"
  ).bind(now, uuid).run();

  return c.json<ApiResponse<null>>({
    success: true,
  });
});

app.put("/api/tasks/reorder", async (c) => {
  const uuid = getUUID(c.req.header("Authorization"));

  if (!uuid || !isValidUUID(uuid)) {
    return c.json<ApiResponse<null>>(
      { success: false, error: "Invalid or missing authorization" },
      401,
    );
  }

  try {
    const { taskIds } = await c.req.json<{ taskIds: string[] }>();
    const now = Date.now();

    const statements = taskIds.map((id, index) =>
      c.env.DB.prepare(
        "UPDATE tasks SET sort_order = ?, updated_at = ? WHERE id = ? AND user_uuid = ?"
      ).bind(index, now, id, uuid)
    );

    await c.env.DB.batch(statements);

    await c.env.DB.prepare(
      "UPDATE users SET updated_at = ? WHERE uuid = ?"
    ).bind(now, uuid).run();

    return c.json<ApiResponse<null>>({
      success: true,
    });
  } catch (error) {
    return c.json<ApiResponse<null>>(
      { success: false, error: "Invalid request body" },
      400,
    );
  }
});

app.get("/api/links", async (c) => {
  const uuid = getUUID(c.req.header("Authorization"));

  if (!uuid || !isValidUUID(uuid)) {
    return c.json<ApiResponse<null>>(
      { success: false, error: "Invalid or missing authorization" },
      401,
    );
  }

  const linkRows = await c.env.DB.prepare(
    "SELECT * FROM links WHERE user_uuid = ? ORDER BY sort_order ASC"
  ).bind(uuid).all<LinkRow>();

  const links = linkRows.results?.map(rowToLink) ?? [];

  return c.json<ApiResponse<Link[]>>({
    success: true,
    data: links,
  });
});

app.post("/api/links", async (c) => {
  const uuid = getUUID(c.req.header("Authorization"));

  if (!uuid || !isValidUUID(uuid)) {
    return c.json<ApiResponse<null>>(
      { success: false, error: "Invalid or missing authorization" },
      401,
    );
  }

  try {
    const link = await c.req.json<Link>();
    const now = Date.now();

    const maxOrder = await c.env.DB.prepare(
      "SELECT COALESCE(MAX(sort_order), -1) as max_order FROM links WHERE user_uuid = ?"
    ).bind(uuid).first<{ max_order: number }>();

    const sortOrder = (maxOrder?.max_order ?? -1) + 1;

    await c.env.DB.prepare(
      `INSERT INTO links (id, user_uuid, url, title, favicon, created_at, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      link.id,
      uuid,
      link.url,
      link.title,
      link.favicon,
      link.createdAt,
      sortOrder,
    ).run();

    await c.env.DB.prepare(
      "UPDATE users SET updated_at = ? WHERE uuid = ?"
    ).bind(now, uuid).run();

    return c.json<ApiResponse<Link>>({
      success: true,
      data: link,
    });
  } catch (error) {
    return c.json<ApiResponse<null>>(
      { success: false, error: "Invalid request body" },
      400,
    );
  }
});

app.delete("/api/links/:id", async (c) => {
  const uuid = getUUID(c.req.header("Authorization"));
  const linkId = c.req.param("id");

  if (!uuid || !isValidUUID(uuid)) {
    return c.json<ApiResponse<null>>(
      { success: false, error: "Invalid or missing authorization" },
      401,
    );
  }

  const now = Date.now();

  await c.env.DB.prepare(
    "DELETE FROM links WHERE id = ? AND user_uuid = ?"
  ).bind(linkId, uuid).run();

  await c.env.DB.prepare(
    "UPDATE users SET updated_at = ? WHERE uuid = ?"
  ).bind(now, uuid).run();

  return c.json<ApiResponse<null>>({
    success: true,
  });
});

app.put("/api/links/reorder", async (c) => {
  const uuid = getUUID(c.req.header("Authorization"));

  if (!uuid || !isValidUUID(uuid)) {
    return c.json<ApiResponse<null>>(
      { success: false, error: "Invalid or missing authorization" },
      401,
    );
  }

  try {
    const { linkIds } = await c.req.json<{ linkIds: string[] }>();
    const now = Date.now();

    const statements = linkIds.map((id, index) =>
      c.env.DB.prepare(
        "UPDATE links SET sort_order = ? WHERE id = ? AND user_uuid = ?"
      ).bind(index, id, uuid)
    );

    await c.env.DB.batch(statements);

    await c.env.DB.prepare(
      "UPDATE users SET updated_at = ? WHERE uuid = ?"
    ).bind(now, uuid).run();

    return c.json<ApiResponse<null>>({
      success: true,
    });
  } catch (error) {
    return c.json<ApiResponse<null>>(
      { success: false, error: "Invalid request body" },
      400,
    );
  }
});

app.get("/api/exists/:uuid", async (c) => {
  const uuid = c.req.param("uuid");

  if (!isValidUUID(uuid)) {
    return c.json<ApiResponse<{ exists: boolean }>>({
      success: true,
      data: { exists: false },
    });
  }

  const user = await c.env.DB.prepare(
    "SELECT 1 FROM users WHERE uuid = ?"
  ).bind(uuid).first();

  return c.json<ApiResponse<{ exists: boolean }>>({
    success: true,
    data: { exists: user !== null },
  });
});

app.post("/api/register", async (c) => {
  try {
    const body = await c.req.json<{ uuid: string }>();
    const { uuid } = body;

    if (!uuid || !isValidUUID(uuid)) {
      return c.json<ApiResponse<null>>(
        { success: false, error: "Invalid UUID format" },
        400,
      );
    }

    const existing = await c.env.DB.prepare(
      "SELECT 1 FROM users WHERE uuid = ?"
    ).bind(uuid).first();

    if (existing) {
      return c.json<ApiResponse<null>>(
        { success: false, error: "UUID already registered" },
        409,
      );
    }

    const now = Date.now();
    await c.env.DB.prepare(
      "INSERT INTO users (uuid, created_at, updated_at) VALUES (?, ?, ?)"
    ).bind(uuid, now, now).run();

    return c.json<ApiResponse<UserData>>({
      success: true,
      data: { tasks: [], links: [], createdAt: now, updatedAt: now },
    });
  } catch (error) {
    return c.json<ApiResponse<null>>(
      { success: false, error: "Invalid request body" },
      400,
    );
  }
});

app.delete("/api/account", async (c) => {
  const uuid = getUUID(c.req.header("Authorization"));

  if (!uuid || !isValidUUID(uuid)) {
    return c.json<ApiResponse<null>>(
      { success: false, error: "Invalid or missing authorization" },
      401,
    );
  }

  await c.env.DB.prepare("DELETE FROM tasks WHERE user_uuid = ?").bind(uuid).run();
  await c.env.DB.prepare("DELETE FROM links WHERE user_uuid = ?").bind(uuid).run();
  await c.env.DB.prepare("DELETE FROM users WHERE uuid = ?").bind(uuid).run();

  return c.json<ApiResponse<null>>({
    success: true,
  });
});

app.get("/api/health", (c) => {
  return c.json({ status: "ok", timestamp: Date.now(), version: "1.0.0" });
});

export default app;
