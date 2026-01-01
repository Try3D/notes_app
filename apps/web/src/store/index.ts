import { atom } from "jotai";
import type { Task, Link, UserData } from "@eisenhower/shared";
import { API_URL } from "../config";

const CACHE_KEY = "eisenhower_data";

export const uuidAtom = atom<string | null>(localStorage.getItem("uuid"));
export const loadingAtom = atom(true);
export const userDataAtom = atom<UserData | null>(null);

export const tasksAtom = atom((get) => get(userDataAtom)?.tasks ?? []);
export const linksAtom = atom((get) => get(userDataAtom)?.links ?? []);

export const setUuidAtom = atom(null, (_get, set, uuid: string | null) => {
  if (uuid) {
    localStorage.setItem("uuid", uuid);
  } else {
    localStorage.removeItem("uuid");
    localStorage.removeItem(CACHE_KEY);
  }
  set(uuidAtom, uuid);
});

const saveToAPI = async (uuid: string, data: UserData) => {
  try {
    await fetch(`${API_URL}/api/data`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${uuid}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  } catch (error) {
    console.error("Failed to save data:", error);
  }
};

const saveData = (uuid: string | null, data: UserData) => {
  localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  if (uuid) saveToAPI(uuid, data);
};

const forceFetchFromServer = async (uuid: string): Promise<UserData | null> => {
  try {
    const response = await fetch(`${API_URL}/api/data?_t=${Date.now()}`, {
      headers: {
        Authorization: `Bearer ${uuid}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    const result = await response.json();
    if (result.success && result.data) {
      return result.data;
    }
  } catch (error) {
    console.error("Failed to fetch from server:", error);
  }
  return null;
};

function createEmptyData(): UserData {
  const now = Date.now();
  return { tasks: [], links: [], createdAt: now, updatedAt: now };
}

function migrateData(data: UserData): { data: UserData; needsSave: boolean } {
  let needsSave = false;
  const now = Date.now();

  const migratedTasks = data.tasks.map((task) => {
    if (!("kanban" in task) || task.kanban === undefined) {
      needsSave = true;
      return { ...task, kanban: null, updatedAt: now };
    }
    return task;
  });

  if (needsSave) {
    return {
      data: { ...data, tasks: migratedTasks, updatedAt: now },
      needsSave: true,
    };
  }

  return { data, needsSave: false };
}

export const fetchDataAtom = atom(null, async (get, set) => {
  const uuid = get(uuidAtom);
  if (!uuid) {
    set(userDataAtom, null);
    set(loadingAtom, false);
    return;
  }

  set(loadingAtom, true);

  const serverData = await forceFetchFromServer(uuid);

  if (serverData) {
    const { data: migratedData, needsSave } = migrateData(serverData);
    set(userDataAtom, migratedData);
    localStorage.setItem(CACHE_KEY, JSON.stringify(migratedData));
    if (needsSave) {
      saveToAPI(uuid, migratedData);
    }
  } else {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const cachedData = JSON.parse(cached);
        const { data: migratedData } = migrateData(cachedData);
        set(userDataAtom, migratedData);
      } catch {
        set(userDataAtom, createEmptyData());
      }
    } else {
      set(userDataAtom, createEmptyData());
    }
  }

  set(loadingAtom, false);
});

export const syncFromServerAtom = atom(null, async (get, set) => {
  const uuid = get(uuidAtom);
  if (!uuid) return;

  const serverData = await forceFetchFromServer(uuid);

  if (serverData) {
    const { data: migratedData, needsSave } = migrateData(serverData);
    set(userDataAtom, migratedData);
    localStorage.setItem(CACHE_KEY, JSON.stringify(migratedData));
    if (needsSave) {
      saveToAPI(uuid, migratedData);
    }
  }
});

export const setupVisibilityListenerAtom = atom(null, (get, set) => {
  const syncFromServer = async () => {
    const uuid = get(uuidAtom);
    if (!uuid) return;

    const serverData = await forceFetchFromServer(uuid);
    if (serverData) {
      set(userDataAtom, serverData);
      localStorage.setItem(CACHE_KEY, JSON.stringify(serverData));
    }
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      syncFromServer();
    }
  };

  document.removeEventListener("visibilitychange", handleVisibilityChange);
  document.addEventListener("visibilitychange", handleVisibilityChange);
});

export const addTaskAtom = atom(null, (get, set, partial: Partial<Task>) => {
  const uuid = get(uuidAtom);
  const data = get(userDataAtom);
  if (!data) return null;

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

  const newData = {
    ...data,
    tasks: [...data.tasks, newTask],
    updatedAt: now,
  };
  set(userDataAtom, newData);
  saveData(uuid, newData);
  return newTask;
});

export const updateTaskAtom = atom(null, (get, set, id: string, updates: Partial<Task>) => {
  const uuid = get(uuidAtom);
  const data = get(userDataAtom);
  if (!data) return;

  const now = Date.now();
  const newData = {
    ...data,
    tasks: data.tasks.map((t) =>
      t.id === id ? { ...t, ...updates, updatedAt: now } : t
    ),
    updatedAt: now,
  };
  set(userDataAtom, newData);
  saveData(uuid, newData);
});

export const deleteTaskAtom = atom(null, (get, set, id: string) => {
  const uuid = get(uuidAtom);
  const data = get(userDataAtom);
  if (!data) return;

  const now = Date.now();
  const newData = {
    ...data,
    tasks: data.tasks.filter((t) => t.id !== id),
    updatedAt: now,
  };
  set(userDataAtom, newData);
  saveData(uuid, newData);
});

export const moveTaskAtom = atom(
  null,
  (get, set, taskId: string, updates: Partial<Task>, newIndex: number, groupKey: keyof Task, groupValue: string | null) => {
    const uuid = get(uuidAtom);
    const data = get(userDataAtom);
    if (!data) return;

    const taskToMove = data.tasks.find((t) => t.id === taskId);
    if (!taskToMove) return;

    const now = Date.now();
    const updatedTask = { ...taskToMove, ...updates, updatedAt: now };

    const targetGroupTasks = data.tasks.filter((t) => {
      if (t.id === taskId) return false;
      return groupValue === null ? !t[groupKey] : t[groupKey] === groupValue;
    });

    const otherTasks = data.tasks.filter((t) => {
      if (t.id === taskId) return false;
      return groupValue === null ? !!t[groupKey] : t[groupKey] !== groupValue;
    });

    const clampedIndex = Math.max(0, Math.min(newIndex, targetGroupTasks.length));
    targetGroupTasks.splice(clampedIndex, 0, updatedTask);

    const newData = {
      ...data,
      tasks: [...otherTasks, ...targetGroupTasks],
      updatedAt: now,
    };
    set(userDataAtom, newData);
    saveData(uuid, newData);
  }
);

export const addLinkAtom = atom(null, (get, set, link: Omit<Link, "id" | "createdAt">) => {
  const uuid = get(uuidAtom);
  const data = get(userDataAtom);
  if (!data) return;

  const now = Date.now();
  const newLink: Link = {
    ...link,
    id: crypto.randomUUID(),
    createdAt: now,
  };

  const newData = {
    ...data,
    links: [...data.links, newLink],
    updatedAt: now,
  };
  set(userDataAtom, newData);
  saveData(uuid, newData);
});

export const deleteLinkAtom = atom(null, (get, set, id: string) => {
  const uuid = get(uuidAtom);
  const data = get(userDataAtom);
  if (!data) return;

  const now = Date.now();
  const newData = {
    ...data,
    links: data.links.filter((l) => l.id !== id),
    updatedAt: now,
  };
  set(userDataAtom, newData);
  saveData(uuid, newData);
});

export const reorderLinksAtom = atom(null, (get, set, linkIds: string[]) => {
  const uuid = get(uuidAtom);
  const data = get(userDataAtom);
  if (!data) return;

  const linkMap = new Map(data.links.map((l) => [l.id, l]));
  const reorderedLinks = linkIds
    .map((id) => linkMap.get(id))
    .filter((l): l is Link => l !== undefined);
  const remainingLinks = data.links.filter((l) => !linkIds.includes(l.id));

  const now = Date.now();
  const newData = {
    ...data,
    links: [...reorderedLinks, ...remainingLinks],
    updatedAt: now,
  };
  set(userDataAtom, newData);
  saveData(uuid, newData);
});

export const logoutAtom = atom(null, (_get, set) => {
  localStorage.removeItem("uuid");
  localStorage.removeItem(CACHE_KEY);
  set(uuidAtom, null);
  set(userDataAtom, null);
});

export const deleteAccountAtom = atom(null, async (get, set) => {
  const uuid = get(uuidAtom);
  if (!uuid) return;

  try {
    await fetch(`${API_URL}/api/data`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${uuid}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tasks: [], links: [], deleted: true }),
    });
  } catch (error) {
    console.error("Failed to delete account:", error);
  }

  set(logoutAtom);
});

export const importDataAtom = atom(
  null,
  (get, set, jsonString: string): { success: boolean; error?: string; tasksImported?: number; linksImported?: number } => {
    const uuid = get(uuidAtom);
    const data = get(userDataAtom);
    if (!data) return { success: false, error: "No data context" };

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

      const now = Date.now();
      const newData: UserData = {
        tasks,
        links,
        createdAt: data.createdAt,
        updatedAt: now,
      };

      set(userDataAtom, newData);
      saveData(uuid, newData);

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
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};
