import { atom } from 'jotai';

// Types
export interface Task {
  id: string;
  title: string;
  note: string;
  tags: string[];
  color: string;
  q: 'do' | 'decide' | 'delegate' | 'delete' | null;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Link {
  id: string;
  url: string;
  title: string;
  favicon: string;
  createdAt: number;
}

export interface UserData {
  tasks: Task[];
  links: Link[];
  createdAt: number;
  updatedAt: number;
}

// Theme
export type ThemeMode = 'light' | 'dark';

// Auth atoms
export const uuidAtom = atom<string | null>(null);
export const authLoadingAtom = atom(true);

// Data atoms
export const userDataAtom = atom<UserData | null>(null);
export const dataLoadingAtom = atom(true);

// Theme atom
export const themeModeAtom = atom<ThemeMode>('light');

// Derived atoms
export const tasksAtom = atom((get) => get(userDataAtom)?.tasks ?? []);
export const linksAtom = atom((get) => get(userDataAtom)?.links ?? []);

// Theme colors
export const themeAtom = atom((get) => {
  const mode = get(themeModeAtom);
  return mode === 'dark' ? darkTheme : lightTheme;
});

export const lightTheme = {
  background: '#f5f5f5',
  card: '#ffffff',
  text: '#333333',
  textSecondary: '#666666',
  textMuted: '#999999',
  border: '#dddddd',
  borderLight: '#eeeeee',
  primary: '#3b82f6',
  danger: '#ef4444',
  inputBg: '#fafafa',
  overlay: 'rgba(0,0,0,0.5)',
  tabBar: '#ffffff',
  tabBarBorder: '#eeeeee',
};

export const darkTheme = {
  background: '#0f172a',
  card: '#1e293b',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  border: '#334155',
  borderLight: '#1e293b',
  primary: '#3b82f6',
  danger: '#ef4444',
  inputBg: '#1e293b',
  overlay: 'rgba(0,0,0,0.7)',
  tabBar: '#1e293b',
  tabBarBorder: '#334155',
};

export type Theme = typeof lightTheme;

// Helper to create empty data
export function createEmptyData(): UserData {
  const now = Date.now();
  return { tasks: [], links: [], createdAt: now, updatedAt: now };
}

// UUID validation
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
