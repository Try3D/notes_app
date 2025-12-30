import { useEffect, useCallback, useRef } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  uuidAtom,
  authLoadingAtom,
  userDataAtom,
  dataLoadingAtom,
  themeModeAtom,
  tasksAtom,
  linksAtom,
  themeAtom,
  createEmptyData,
  isValidUUID,
  Task,
  Link,
  UserData,
  ThemeMode,
} from '../store/atoms';
import { API_URL, COLORS } from '../config';

const AUTH_KEY = 'eisenhower_uuid';
const DATA_KEY = 'eisenhower_data';
const THEME_KEY = 'eisenhower_theme';

// Auth hook
export function useAuth() {
  const [uuid, setUuidState] = useAtom(uuidAtom);
  const [loading, setLoading] = useAtom(authLoadingAtom);

  useEffect(() => {
    const loadUUID = async () => {
      try {
        const stored = await SecureStore.getItemAsync(AUTH_KEY);
        setUuidState(stored);
      } catch (error) {
        console.error('Failed to load UUID:', error);
      } finally {
        setLoading(false);
      }
    };
    loadUUID();
  }, []);

  const setUUID = useCallback(async (newUUID: string) => {
    try {
      await SecureStore.setItemAsync(AUTH_KEY, newUUID);
      setUuidState(newUUID);
    } catch (error) {
      console.error('Failed to save UUID:', error);
    }
  }, [setUuidState]);

  const clearUUID = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync(AUTH_KEY);
      await AsyncStorage.removeItem(DATA_KEY);
      setUuidState(null);
    } catch (error) {
      console.error('Failed to clear UUID:', error);
    }
  }, [setUuidState]);

  const generateUUID = useCallback(() => Crypto.randomUUID(), []);

  return { uuid, loading, setUUID, clearUUID, generateUUID, isValidUUID };
}

// Data hook
export function useData() {
  const [uuid] = useAtom(uuidAtom);
  const [data, setData] = useAtom(userDataAtom);
  const [loading, setLoading] = useAtom(dataLoadingAtom);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveToAPI = useCallback(async (newData: UserData) => {
    if (!uuid) return;

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch(`${API_URL}/api/data`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${uuid}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newData),
        });
      } catch (error) {
        console.error('Failed to save data:', error);
      }
    }, 300);
  }, [uuid]);

  const updateData = useCallback((updater: (prev: UserData) => UserData) => {
    setData((prev) => {
      if (!prev) return prev;
      const newData = updater(prev);
      newData.updatedAt = Date.now();
      AsyncStorage.setItem(DATA_KEY, JSON.stringify(newData));
      saveToAPI(newData);
      return newData;
    });
  }, [saveToAPI, setData]);

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
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();

      if (result.success && result.data) {
        setData(result.data);
        await AsyncStorage.setItem(DATA_KEY, JSON.stringify(result.data));
      } else {
        const emptyData = createEmptyData();
        setData(emptyData);
        await AsyncStorage.setItem(DATA_KEY, JSON.stringify(emptyData));
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      const cached = await AsyncStorage.getItem(DATA_KEY);
      if (cached) {
        setData(JSON.parse(cached));
      } else {
        setData(createEmptyData());
      }
    } finally {
      setLoading(false);
    }
  }, [uuid, setData, setLoading]);

  useEffect(() => {
    const loadCachedData = async () => {
      const cached = await AsyncStorage.getItem(DATA_KEY);
      if (cached && uuid) {
        setData(JSON.parse(cached));
      }
      fetchData();
    };
    loadCachedData();
  }, [uuid, fetchData]);

  const addTask = useCallback((partial: Partial<Task>): Task => {
    const now = Date.now();
    const newTask: Task = {
      id: Crypto.randomUUID(),
      title: '',
      note: '',
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
  }, [updateData]);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    updateData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t
      ),
    }));
  }, [updateData]);

  const deleteTask = useCallback((id: string) => {
    updateData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== id),
    }));
  }, [updateData]);

  const addLink = useCallback((link: Omit<Link, 'id' | 'createdAt'>) => {
    const newLink: Link = {
      ...link,
      id: Crypto.randomUUID(),
      createdAt: Date.now(),
    };
    updateData((prev) => ({ ...prev, links: [...prev.links, newLink] }));
  }, [updateData]);

  const deleteLink = useCallback((id: string) => {
    updateData((prev) => ({
      ...prev,
      links: prev.links.filter((l) => l.id !== id),
    }));
  }, [updateData]);

  const importData = useCallback(
    (jsonString: string): { success: boolean; error?: string; tasksImported?: number; linksImported?: number } => {
      try {
        const parsed = JSON.parse(jsonString);

        if (typeof parsed !== 'object' || parsed === null) {
          return { success: false, error: 'Invalid JSON: expected an object' };
        }

        const importedTasks: Task[] = [];
        const importedLinks: Link[] = [];

        if (Array.isArray(parsed.tasks)) {
          for (const task of parsed.tasks) {
            if (typeof task === 'object' && task !== null) {
              const now = Date.now();
              importedTasks.push({
                id: typeof task.id === 'string' ? task.id : Crypto.randomUUID(),
                title: typeof task.title === 'string' ? task.title : '',
                note: typeof task.note === 'string' ? task.note : '',
                tags: Array.isArray(task.tags)
                  ? task.tags.filter((t: unknown) => typeof t === 'string')
                  : [],
                color: typeof task.color === 'string' ? task.color : COLORS[0],
                q: ['do', 'decide', 'delegate', 'delete', null].includes(task.q)
                  ? task.q
                  : null,
                completed: typeof task.completed === 'boolean' ? task.completed : false,
                createdAt: typeof task.createdAt === 'number' ? task.createdAt : now,
                updatedAt: typeof task.updatedAt === 'number' ? task.updatedAt : now,
              });
            }
          }
        }

        if (Array.isArray(parsed.links)) {
          for (const link of parsed.links) {
            if (typeof link === 'object' && link !== null) {
              importedLinks.push({
                id: typeof link.id === 'string' ? link.id : Crypto.randomUUID(),
                url: typeof link.url === 'string' ? link.url : '',
                title: typeof link.title === 'string' ? link.title : '',
                favicon: typeof link.favicon === 'string' ? link.favicon : '',
                createdAt: typeof link.createdAt === 'number' ? link.createdAt : Date.now(),
              });
            }
          }
        }

        const validLinks = importedLinks.filter((l) => l.url.trim() !== '');

        if (importedTasks.length === 0 && validLinks.length === 0) {
          return {
            success: false,
            error: 'No valid tasks or links found in the file',
          };
        }

        const now = Date.now();
        const newData: UserData = {
          tasks: importedTasks,
          links: validLinks,
          createdAt: typeof parsed.createdAt === 'number' ? parsed.createdAt : now,
          updatedAt: now,
        };

        updateData(() => newData);

        return {
          success: true,
          tasksImported: importedTasks.length,
          linksImported: validLinks.length,
        };
      } catch (e) {
        if (e instanceof SyntaxError) {
          return {
            success: false,
            error: 'Invalid JSON format. Please check the file contents.',
          };
        }
        return {
          success: false,
          error: `Import failed: ${e instanceof Error ? e.message : 'Unknown error'}`,
        };
      }
    },
    [updateData],
  );

  return {
    data,
    loading,
    tasks: data?.tasks ?? [],
    links: data?.links ?? [],
    addTask,
    updateTask,
    deleteTask,
    addLink,
    deleteLink,
    importData,
    refetch: fetchData,
  };
}

// Theme hook
export function useTheme() {
  const [mode, setMode] = useAtom(themeModeAtom);
  const [theme] = useAtom(themeAtom);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_KEY);
        if (stored === 'dark' || stored === 'light') {
          setMode(stored);
        }
      } catch (error) {
        console.error('Failed to load theme:', error);
      }
    };
    loadTheme();
  }, [setMode]);

  const toggleTheme = useCallback(async () => {
    const newMode: ThemeMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    try {
      await AsyncStorage.setItem(THEME_KEY, newMode);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  }, [mode, setMode]);

  const setTheme = useCallback(async (newMode: ThemeMode) => {
    setMode(newMode);
    try {
      await AsyncStorage.setItem(THEME_KEY, newMode);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  }, [setMode]);

  return { theme, mode, toggleTheme, setTheme };
}
