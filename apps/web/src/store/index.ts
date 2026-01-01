import { atom } from "jotai";
import type { Task, Link, UserData } from "@eisenhower/shared";
import { API_URL } from "../config";

const TASKS_CACHE_KEY = "eisenhower_tasks";
const LINKS_CACHE_KEY = "eisenhower_links";

export const uuidAtom = atom<string | null>(localStorage.getItem("uuid"));
export const loadingAtom = atom(true);
export const tasksAtom = atom<Task[]>([]);
export const linksAtom = atom<Link[]>([]);
export const activePageAtom = atom<"tasks" | "links">("tasks");

export const setUuidAtom = atom(null, (_get, set, uuid: string | null) => {
  if (uuid) {
    localStorage.setItem("uuid", uuid);
  } else {
    localStorage.removeItem("uuid");
    localStorage.removeItem(TASKS_CACHE_KEY);
    localStorage.removeItem(LINKS_CACHE_KEY);
  }
  set(uuidAtom, uuid);
});

const getAuthHeaders = (uuid: string) => ({
  Authorization: `Bearer ${uuid}`,
  "Content-Type": "application/json",
});

export const fetchDataAtom = atom(null, async (get, set) => {
  const uuid = get(uuidAtom);
  if (!uuid) {
    set(tasksAtom, []);
    set(linksAtom, []);
    set(loadingAtom, false);
    return;
  }

  set(loadingAtom, true);

  try {
    const response = await fetch(`${API_URL}/api/data`, {
      headers: getAuthHeaders(uuid),
    });
    const result = await response.json();

    if (result.success && result.data) {
      const { tasks, links } = result.data as UserData;
      set(tasksAtom, tasks);
      set(linksAtom, links);
      localStorage.setItem(TASKS_CACHE_KEY, JSON.stringify(tasks));
      localStorage.setItem(LINKS_CACHE_KEY, JSON.stringify(links));
    }
  } catch (error) {
    const cachedTasks = localStorage.getItem(TASKS_CACHE_KEY);
    const cachedLinks = localStorage.getItem(LINKS_CACHE_KEY);
    if (cachedTasks) set(tasksAtom, JSON.parse(cachedTasks));
    if (cachedLinks) set(linksAtom, JSON.parse(cachedLinks));
  }

  set(loadingAtom, false);
});

export const fetchTasksAtom = atom(null, async (get, set) => {
  const uuid = get(uuidAtom);
  if (!uuid) return;

  try {
    const response = await fetch(`${API_URL}/api/tasks`, {
      headers: getAuthHeaders(uuid),
    });
    const result = await response.json();

    if (result.success && result.data) {
      set(tasksAtom, result.data);
      localStorage.setItem(TASKS_CACHE_KEY, JSON.stringify(result.data));
    }
  } catch (error) {
    console.error("Failed to fetch tasks:", error);
  }
});

export const fetchLinksAtom = atom(null, async (get, set) => {
  const uuid = get(uuidAtom);
  if (!uuid) return;

  try {
    const response = await fetch(`${API_URL}/api/links`, {
      headers: getAuthHeaders(uuid),
    });
    const result = await response.json();

    if (result.success && result.data) {
      set(linksAtom, result.data);
      localStorage.setItem(LINKS_CACHE_KEY, JSON.stringify(result.data));
    }
  } catch (error) {
    console.error("Failed to fetch links:", error);
  }
});

const POLL_INTERVAL = 30000;
let pollInterval: ReturnType<typeof setInterval> | null = null;

export const startPollingAtom = atom(null, (get, set) => {
  if (pollInterval) return;

  const poll = () => {
    const activePage = get(activePageAtom);
    if (activePage === "links") {
      set(fetchLinksAtom);
    } else {
      set(fetchTasksAtom);
    }
  };

  pollInterval = setInterval(poll, POLL_INTERVAL);
});

export const stopPollingAtom = atom(null, () => {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
});

export const addTaskAtom = atom(null, async (get, set, partial: Partial<Task>) => {
  const uuid = get(uuidAtom);
  const tasks = get(tasksAtom);
  if (!uuid) return null;

  const now = Date.now();
  const newTask: Task = {
    id: crypto.randomUUID(),
    title: "",
    note: "",
    tags: [],
    color: "#ef4444",
    q: null,
    kanban: null,
    completed: false,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };

  const newTasks = [...tasks, newTask];
  set(tasksAtom, newTasks);
  localStorage.setItem(TASKS_CACHE_KEY, JSON.stringify(newTasks));

  try {
    await fetch(`${API_URL}/api/tasks`, {
      method: "POST",
      headers: getAuthHeaders(uuid),
      body: JSON.stringify(newTask),
    });
  } catch (error) {
    console.error("Failed to add task:", error);
  }

  return newTask;
});

export const updateTaskAtom = atom(null, async (get, set, id: string, updates: Partial<Task>) => {
  const uuid = get(uuidAtom);
  const tasks = get(tasksAtom);
  if (!uuid) return;

  const now = Date.now();
  const newTasks = tasks.map((t) =>
    t.id === id ? { ...t, ...updates, updatedAt: now } : t
  );
  set(tasksAtom, newTasks);
  localStorage.setItem(TASKS_CACHE_KEY, JSON.stringify(newTasks));

  try {
    await fetch(`${API_URL}/api/tasks/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(uuid),
      body: JSON.stringify(updates),
    });
  } catch (error) {
    console.error("Failed to update task:", error);
  }
});

export const deleteTaskAtom = atom(null, async (get, set, id: string) => {
  const uuid = get(uuidAtom);
  const tasks = get(tasksAtom);
  if (!uuid) return;

  const newTasks = tasks.filter((t) => t.id !== id);
  set(tasksAtom, newTasks);
  localStorage.setItem(TASKS_CACHE_KEY, JSON.stringify(newTasks));

  try {
    await fetch(`${API_URL}/api/tasks/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(uuid),
    });
  } catch (error) {
    console.error("Failed to delete task:", error);
  }
});

export const moveTaskAtom = atom(
  null,
  async (get, set, taskId: string, updates: Partial<Task>, newIndex: number, groupKey: keyof Task, groupValue: string | null) => {
    const uuid = get(uuidAtom);
    const tasks = get(tasksAtom);
    if (!uuid) return;

    const taskToMove = tasks.find((t) => t.id === taskId);
    if (!taskToMove) return;

    const now = Date.now();
    const updatedTask = { ...taskToMove, ...updates, updatedAt: now };

    const targetGroupTasks = tasks.filter((t) => {
      if (t.id === taskId) return false;
      return groupValue === null ? !t[groupKey] : t[groupKey] === groupValue;
    });

    const otherTasks = tasks.filter((t) => {
      if (t.id === taskId) return false;
      return groupValue === null ? !!t[groupKey] : t[groupKey] !== groupValue;
    });

    const clampedIndex = Math.max(0, Math.min(newIndex, targetGroupTasks.length));
    targetGroupTasks.splice(clampedIndex, 0, updatedTask);

    const newTasks = [...otherTasks, ...targetGroupTasks];
    set(tasksAtom, newTasks);
    localStorage.setItem(TASKS_CACHE_KEY, JSON.stringify(newTasks));

    try {
      if (Object.keys(updates).length > 0) {
        await fetch(`${API_URL}/api/tasks/${taskId}`, {
          method: "PUT",
          headers: getAuthHeaders(uuid),
          body: JSON.stringify(updates),
        });
      }

      await fetch(`${API_URL}/api/tasks/reorder`, {
        method: "PUT",
        headers: getAuthHeaders(uuid),
        body: JSON.stringify({ taskIds: newTasks.map((t) => t.id) }),
      });
    } catch (error) {
      console.error("Failed to move task:", error);
    }
  }
);

export const addLinkAtom = atom(null, async (get, set, link: Omit<Link, "id" | "createdAt">) => {
  const uuid = get(uuidAtom);
  const links = get(linksAtom);
  if (!uuid) return;

  const now = Date.now();
  const newLink: Link = {
    ...link,
    id: crypto.randomUUID(),
    createdAt: now,
  };

  const newLinks = [...links, newLink];
  set(linksAtom, newLinks);
  localStorage.setItem(LINKS_CACHE_KEY, JSON.stringify(newLinks));

  try {
    await fetch(`${API_URL}/api/links`, {
      method: "POST",
      headers: getAuthHeaders(uuid),
      body: JSON.stringify(newLink),
    });
  } catch (error) {
    console.error("Failed to add link:", error);
  }
});

export const deleteLinkAtom = atom(null, async (get, set, id: string) => {
  const uuid = get(uuidAtom);
  const links = get(linksAtom);
  if (!uuid) return;

  const newLinks = links.filter((l) => l.id !== id);
  set(linksAtom, newLinks);
  localStorage.setItem(LINKS_CACHE_KEY, JSON.stringify(newLinks));

  try {
    await fetch(`${API_URL}/api/links/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(uuid),
    });
  } catch (error) {
    console.error("Failed to delete link:", error);
  }
});

export const reorderLinksAtom = atom(null, async (get, set, linkIds: string[]) => {
  const uuid = get(uuidAtom);
  const links = get(linksAtom);
  if (!uuid) return;

  const linkMap = new Map(links.map((l) => [l.id, l]));
  const reorderedLinks = linkIds
    .map((id) => linkMap.get(id))
    .filter((l): l is Link => l !== undefined);
  const remainingLinks = links.filter((l) => !linkIds.includes(l.id));

  const newLinks = [...reorderedLinks, ...remainingLinks];
  set(linksAtom, newLinks);
  localStorage.setItem(LINKS_CACHE_KEY, JSON.stringify(newLinks));

  try {
    await fetch(`${API_URL}/api/links/reorder`, {
      method: "PUT",
      headers: getAuthHeaders(uuid),
      body: JSON.stringify({ linkIds }),
    });
  } catch (error) {
    console.error("Failed to reorder links:", error);
  }
});

export const logoutAtom = atom(null, (_get, set) => {
  localStorage.removeItem("uuid");
  localStorage.removeItem(TASKS_CACHE_KEY);
  localStorage.removeItem(LINKS_CACHE_KEY);
  set(uuidAtom, null);
  set(tasksAtom, []);
  set(linksAtom, []);
});

export const deleteAccountAtom = atom(null, async (get, set) => {
  const uuid = get(uuidAtom);
  if (!uuid) return;

  try {
    await fetch(`${API_URL}/api/account`, {
      method: "DELETE",
      headers: getAuthHeaders(uuid),
    });
  } catch (error) {
    console.error("Failed to delete account:", error);
  }

  set(logoutAtom);
});

export const importDataAtom = atom(
  null,
  async (get, set, jsonString: string): Promise<{ success: boolean; error?: string; tasksImported?: number; linksImported?: number }> => {
    const uuid = get(uuidAtom);
    if (!uuid) return { success: false, error: "No user context" };

    try {
      const imported = JSON.parse(jsonString);

      if (!imported || typeof imported !== "object") {
        return { success: false, error: "Invalid JSON format" };
      }

      const tasks: Task[] = Array.isArray(imported.tasks)
        ? imported.tasks.filter(
            (t: unknown) =>
              t && typeof t === "object" && "id" in t && "title" in t
          )
        : [];

      const links: Link[] = Array.isArray(imported.links)
        ? imported.links.filter(
            (l: unknown) =>
              l && typeof l === "object" && "id" in l && "url" in l
          )
        : [];

      for (const task of tasks) {
        await fetch(`${API_URL}/api/tasks`, {
          method: "POST",
          headers: getAuthHeaders(uuid),
          body: JSON.stringify(task),
        });
      }

      for (const link of links) {
        await fetch(`${API_URL}/api/links`, {
          method: "POST",
          headers: getAuthHeaders(uuid),
          body: JSON.stringify(link),
        });
      }

      set(tasksAtom, tasks);
      set(linksAtom, links);
      localStorage.setItem(TASKS_CACHE_KEY, JSON.stringify(tasks));
      localStorage.setItem(LINKS_CACHE_KEY, JSON.stringify(links));

      return {
        success: true,
        tasksImported: tasks.length,
        linksImported: links.length,
      };
    } catch {
      return { success: false, error: "Failed to parse JSON" };
    }
  }
);

export const generateUUID = (): string => {
  return crypto.randomUUID();
};

export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};
