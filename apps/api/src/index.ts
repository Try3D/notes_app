import { Hono } from "hono";
import { cors } from "hono/cors";
import type { UserData, ApiResponse } from "@eisenhower/shared";
import { createEmptyUserData } from "@eisenhower/shared";

type Bindings = {
  KV: KVNamespace;
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

app.get("/api/data", async (c) => {
  const uuid = getUUID(c.req.header("Authorization"));

  if (!uuid || !isValidUUID(uuid)) {
    return c.json<ApiResponse<null>>(
      {
        success: false,
        error: "Invalid or missing authorization",
      },
      401,
    );
  }

  const data = await c.env.KV.get<UserData>(uuid, "json");

  if (!data) {
    return c.json<ApiResponse<UserData>>({
      success: true,
      data: createEmptyUserData(),
    });
  }

  return c.json<ApiResponse<UserData>>({
    success: true,
    data,
  });
});

app.put("/api/data", async (c) => {
  const uuid = getUUID(c.req.header("Authorization"));

  if (!uuid || !isValidUUID(uuid)) {
    return c.json<ApiResponse<null>>(
      {
        success: false,
        error: "Invalid or missing authorization",
      },
      401,
    );
  }

  try {
    const body = await c.req.json<UserData>();

    body.updatedAt = Date.now();

    await c.env.KV.put(uuid, JSON.stringify(body));

    return c.json<ApiResponse<UserData>>({
      success: true,
      data: body,
    });
  } catch (error) {
    return c.json<ApiResponse<null>>(
      {
        success: false,
        error: "Invalid request body",
      },
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

  const data = await c.env.KV.get(uuid);

  return c.json<ApiResponse<{ exists: boolean }>>({
    success: true,
    data: { exists: data !== null },
  });
});

app.post("/api/register", async (c) => {
  try {
    const body = await c.req.json<{ uuid: string }>();
    const { uuid } = body;

    if (!uuid || !isValidUUID(uuid)) {
      return c.json<ApiResponse<null>>(
        {
          success: false,
          error: "Invalid UUID format",
        },
        400,
      );
    }

    const existing = await c.env.KV.get(uuid);
    if (existing) {
      return c.json<ApiResponse<null>>(
        {
          success: false,
          error: "UUID already registered",
        },
        409,
      );
    }

    const userData = createEmptyUserData();
    await c.env.KV.put(uuid, JSON.stringify(userData));

    return c.json<ApiResponse<UserData>>({
      success: true,
      data: userData,
    });
  } catch (error) {
    return c.json<ApiResponse<null>>(
      {
        success: false,
        error: "Invalid request body",
      },
      400,
    );
  }
});

app.get("/api/health", (c) => {
  return c.json({ status: "ok", timestamp: Date.now(), version: "0.0.0" });
});

export default app;
