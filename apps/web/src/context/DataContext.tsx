import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useRef,
} from "react";
import { useAuth } from "./AuthContext";
import type { Task, Link, UserData } from "@eisenhower/shared";
import { API_URL } from "../config";

const CACHE_KEY = "eisenhower_data";

interface ImportResult {
  success: boolean;
  error?: string;
  tasksImported?: number;
  linksImported?: number;
}

interface DataContextType {
  data: UserData | null;
  loading: boolean;
  tasks: Task[];
  links: Link[];
  addTask: (task: Partial<Task>) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  reorderTasks: (taskIds: string[]) => void;
  addLink: (link: Omit<Link, "id" | "createdAt">) => void;
  deleteLink: (id: string) => void;
  importData: (jsonString: string) => ImportResult;
  refetch: () => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

const COLORS = [
  "#ef4444",
  "#22c55e",
  "#f97316",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#facc15",
  "#64748b",
  "#0f172a",
];

function createEmptyData(): UserData {
  const now = Date.now();
  return { tasks: [], links: [], createdAt: now, updatedAt: now };
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { uuid } = useAuth();
  const [data, setData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const syncTimeoutRef = useRef<number | null>(null);

  const saveToAPI = useCallback(
    async (newData: UserData) => {
      if (!uuid) return;

      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      syncTimeoutRef.current = window.setTimeout(async () => {
        try {
          await fetch(`${API_URL}/api/data`, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${uuid}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(newData),
          });
        } catch (error) {
          console.error("Failed to save data:", error);
        }
      }, 300);
    },
    [uuid],
  );

  const updateData = useCallback(
    (updater: (prev: UserData) => UserData) => {
      setData((prev) => {
        if (!prev) return prev;
        const newData = updater(prev);
        newData.updatedAt = Date.now();
        localStorage.setItem(CACHE_KEY, JSON.stringify(newData));
        saveToAPI(newData);
        return newData;
      });
    },
    [saveToAPI],
  );

  const fetchData = useCallback(async () => {
    if (!uuid) {
      setData(null);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/data`, {
        headers: {
          Authorization: `Bearer ${uuid}`,
          "Content-Type": "application/json",
        },
      });
      const result = await response.json();

      if (result.success && result.data) {
        setData(result.data);
        localStorage.setItem(CACHE_KEY, JSON.stringify(result.data));
      } else {
        const emptyData = createEmptyData();
        setData(emptyData);
        localStorage.setItem(CACHE_KEY, JSON.stringify(emptyData));
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);

      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        setData(JSON.parse(cached));
      } else {
        setData(createEmptyData());
      }
    } finally {
      setLoading(false);
    }
  }, [uuid]);

  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached && uuid) {
      setData(JSON.parse(cached));
    }

    fetchData();
  }, [uuid, fetchData]);

  const addTask = useCallback(
    (partial: Partial<Task>): Task => {
      const now = Date.now();
      const newTask: Task = {
        id: crypto.randomUUID(),
        title: "",
        note: "",
        tags: [],
        color: COLORS[0],
        q: null,
        completed: false,
        createdAt: now,
        updatedAt: now,
        ...partial,
      };
      updateData((prev) => ({ ...prev, tasks: [...prev.tasks, newTask] }));
      return newTask;
    },
    [updateData],
  );

  const updateTask = useCallback(
    (id: string, updates: Partial<Task>) => {
      updateData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t,
        ),
      }));
    },
    [updateData],
  );

  const deleteTask = useCallback(
    (id: string) => {
      updateData((prev) => ({
        ...prev,
        tasks: prev.tasks.filter((t) => t.id !== id),
      }));
    },
    [updateData],
  );

  const reorderTasks = useCallback(
    (taskIds: string[]) => {
      updateData((prev) => {
        const taskMap = new Map(prev.tasks.map((t) => [t.id, t]));
        const reorderedTasks = taskIds
          .map((id) => taskMap.get(id))
          .filter((t): t is Task => t !== undefined);
        // Add any tasks that weren't in the taskIds array (shouldn't happen, but just in case)
        const remainingTasks = prev.tasks.filter((t) => !taskIds.includes(t.id));
        return { ...prev, tasks: [...reorderedTasks, ...remainingTasks] };
      });
    },
    [updateData],
  );

  const addLink = useCallback(
    (link: Omit<Link, "id" | "createdAt">) => {
      const newLink: Link = {
        ...link,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      };
      updateData((prev) => ({ ...prev, links: [...prev.links, newLink] }));
    },
    [updateData],
  );

  const deleteLink = useCallback(
    (id: string) => {
      updateData((prev) => ({
        ...prev,
        links: prev.links.filter((l) => l.id !== id),
      }));
    },
    [updateData],
  );

  const importData = useCallback(
    (jsonString: string): ImportResult => {
      try {
        const parsed = JSON.parse(jsonString);

        if (typeof parsed !== "object" || parsed === null) {
          return { success: false, error: "Invalid JSON: expected an object" };
        }

        const importedTasks: Task[] = [];
        const importedLinks: Link[] = [];

        if (Array.isArray(parsed.tasks)) {
          for (const task of parsed.tasks) {
            if (typeof task === "object" && task !== null) {
              const now = Date.now();
              importedTasks.push({
                id: typeof task.id === "string" ? task.id : crypto.randomUUID(),
                title: typeof task.title === "string" ? task.title : "",
                note: typeof task.note === "string" ? task.note : "",
                tags: Array.isArray(task.tags)
                  ? task.tags.filter((t: unknown) => typeof t === "string")
                  : [],
                color:
                  typeof task.color === "string" && COLORS.includes(task.color)
                    ? task.color
                    : COLORS[0],
                q: ["do", "decide", "delegate", "delete", null].includes(task.q)
                  ? task.q
                  : null,
                completed:
                  typeof task.completed === "boolean" ? task.completed : false,
                createdAt:
                  typeof task.createdAt === "number" ? task.createdAt : now,
                updatedAt:
                  typeof task.updatedAt === "number" ? task.updatedAt : now,
              });
            }
          }
        }

        if (Array.isArray(parsed.links)) {
          for (const link of parsed.links) {
            if (typeof link === "object" && link !== null) {
              importedLinks.push({
                id: typeof link.id === "string" ? link.id : crypto.randomUUID(),
                url: typeof link.url === "string" ? link.url : "",
                title: typeof link.title === "string" ? link.title : "",
                favicon: typeof link.favicon === "string" ? link.favicon : "",
                createdAt:
                  typeof link.createdAt === "number"
                    ? link.createdAt
                    : Date.now(),
              });
            }
          }
        }

        const validLinks = importedLinks.filter((l) => l.url.trim() !== "");

        if (importedTasks.length === 0 && validLinks.length === 0) {
          return {
            success: false,
            error: "No valid tasks or links found in the file",
          };
        }

        const now = Date.now();
        const newData: UserData = {
          tasks: importedTasks,
          links: validLinks,
          createdAt:
            typeof parsed.createdAt === "number" ? parsed.createdAt : now,
          updatedAt: now,
        };

        setData(newData);
        localStorage.setItem(CACHE_KEY, JSON.stringify(newData));
        saveToAPI(newData);

        return {
          success: true,
          tasksImported: importedTasks.length,
          linksImported: validLinks.length,
        };
      } catch (e) {
        if (e instanceof SyntaxError) {
          return {
            success: false,
            error: "Invalid JSON format. Please check the file contents.",
          };
        }
        return {
          success: false,
          error: `Import failed: ${e instanceof Error ? e.message : "Unknown error"}`,
        };
      }
    },
    [saveToAPI],
  );

  return (
    <DataContext.Provider
      value={{
        data,
        loading,
        tasks: data?.tasks ?? [],
        links: data?.links ?? [],
        addTask,
        updateTask,
        deleteTask,
        reorderTasks,
        addLink,
        deleteLink,
        importData,
        refetch: fetchData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}
