# Eisenhower - Full-Stack Productivity App

## IMPORTANT: Agent Rules
**DO NOT run any commands (npm, expo, dev servers, etc.) until the user explicitly tells you to.** Only provide instructions and let the user execute commands themselves.

## Project Overview
A full-stack productivity app with:
- **Eisenhower Matrix** task manager (4-quadrant: Do, Schedule, Delegate, Eliminate)
- **Kanban Board** (columns: Unassigned, Backlog, To Do, In Progress, Done)
- **Todo Manager** (tasks grouped by color)
- **Links/Bookmarks** manager
- **Settings** page (UUID display, export data, delete account)

## Tech Stack
- **Monorepo**: Turborepo
- **Frontend**: React + Vite + Jotai (`apps/web`)
- **Mobile**: Flutter (`apps/flutter`)
- **Chrome Extension**: (`apps/chrome-extension`)
- **Backend**: Hono on Cloudflare Workers (`apps/api`) - already deployed
- **Storage**: Cloudflare KV
- **Shared Types**: `packages/shared`
- **Auth**: Loginless UUID system (user generates/enters a UUID as their identity)

**API Base URL**: `https://eisenhower-api.rsarans186.workers.dev`

## Directory Structure
```
/eisenhower
├── apps/
│   ├── web/                    # React Vite frontend
│   │   ├── src/
│   │   │   ├── main.tsx        # App entry point
│   │   │   ├── App.tsx         # Routes configuration
│   │   │   ├── styles.css      # All styles
│   │   │   ├── config.ts       # API base URL
│   │   │   ├── store/
│   │   │   │   └── index.ts    # Jotai atoms for state management
│   │   │   ├── context/
│   │   │   │   └── ThemeContext.tsx  # Dark/light mode
│   │   │   ├── components/
│   │   │   │   ├── Layout.tsx        # Sidebar + main content wrapper
│   │   │   │   └── TaskDrawer.tsx    # Slide-out drawer for editing tasks
│   │   │   └── pages/
│   │   │       ├── Login.tsx         # Generate/enter UUID
│   │   │       ├── Todos.tsx         # Tasks grouped by color
│   │   │       ├── Matrix.tsx        # Eisenhower 4-quadrant matrix
│   │   │       ├── Kanban.tsx        # Kanban board view
│   │   │       ├── Links.tsx         # Bookmarks manager
│   │   │       └── Settings.tsx      # UUID, export, delete account
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   ├── api/                    # Hono Cloudflare Workers backend (deployed)
│   │   ├── src/
│   │   │   └── index.ts        # API routes
│   │   ├── wrangler.json       # Cloudflare Workers config
│   │   └── package.json
│   ├── flutter/                # Flutter mobile app
│   │   ├── lib/
│   │   │   ├── main.dart
│   │   │   ├── models/         # Task, Link, UserData
│   │   │   ├── providers/      # Auth, Data, Theme providers
│   │   │   ├── screens/        # All app screens (including kanban_screen.dart)
│   │   │   ├── services/       # API & storage services
│   │   │   ├── theme/          # App theming (AppColors, colorNames)
│   │   │   └── widgets/        # Reusable widgets (hand_drawn_widgets, task_drawer)
│   │   └── assets/             # Fonts, icons, splash
│   └── chrome-extension/       # Browser extension for saving bookmarks
│       ├── manifest.json
│       ├── popup.html/js/css
│       ├── background.js
│       └── icons/              # Extension icons (16, 32, 48, 128px)
├── packages/
│   └── shared/                 # Shared TypeScript types
│       └── src/
│           └── index.ts        # Task, Link, UserData types + utilities
├── package.json                # Root monorepo package.json
├── turbo.json                  # Turborepo config
└── tsconfig.json               # Root TypeScript config
```

## API Endpoints (apps/api/src/index.ts)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/data` | Fetch user data (requires `Authorization: Bearer <uuid>`) |
| PUT | `/api/data` | Save user data (requires `Authorization: Bearer <uuid>`) |
| GET | `/api/exists/:uuid` | Check if UUID exists in system |
| POST | `/api/register` | Register new UUID (creates empty data) |
| GET | `/api/health` | Health check |

## Data Models (packages/shared/src/index.ts)

### Task
```typescript
interface Task {
  id: string;
  title: string;
  note: string;
  tags: string[];
  color: string;                                      // hex color (e.g., "#ef4444")
  q: 'do' | 'decide' | 'delegate' | 'delete' | null;  // Eisenhower quadrant
  kanban: 'backlog' | 'todo' | 'in-progress' | 'done' | null;  // Kanban column
  completed: boolean;
  createdAt: number;
  updatedAt: number;
}
```

### Link
```typescript
interface Link {
  id: string;
  url: string;
  title: string;
  favicon: string;
  createdAt: number;
}
```

### UserData
```typescript
interface UserData {
  tasks: Task[];
  links: Link[];
  createdAt: number;
  updatedAt: number;
}
```

## Known Hardcoded Values (candidates for centralization)

### API URL (duplicated in 4 places)
- `apps/web/src/config.ts`
- `apps/flutter/lib/services/api_service.dart`
- `apps/chrome-extension/popup.js`
- `apps/chrome-extension/background.js`

### Favicon Service URL
`https://www.google.com/s2/favicons?domain=...&sz=64` - duplicated in web, flutter, and chrome extension

### Labels (duplicated across files)
- **Quadrant labels**: "Do", "Schedule", "Delegate", "Eliminate"
- **Kanban columns**: "Unassigned", "Backlog", "To Do", "In Progress", "Done"
- **Colors**: red, green, orange, blue, purple, pink, teal, yellow, gray, dark

### Magic Numbers
- Poll interval: 30 seconds (web store, flutter data_provider)
- Copy feedback timeout: 2000ms
- Edge scroll delays: 600ms initial, 400ms interval (flutter kanban)

### Storage Keys
| Platform | Keys |
|----------|------|
| Web | `uuid`, `eisenhower_data` |
| Flutter | `eisenhower_uuid`, `eisenhower_data`, `eisenhower_theme` |
| Chrome | `uuid`, `darkMode` |

## Design Notes
- Uses 'Short Stack' Google Font for a handwritten/playful look
- CSS variables for theming (light/dark mode)
- Light: `--bg: #fdf7f1`, `--card: #ffffff`, `--border: #3c3c3c`, `--text: #3c3c3c`
- Dark: `--bg: #1a1a1a`, `--card: #252525`, `--border: #e0e0e0`, `--text: #f0f0f0`
- Sidebar navigation on the left (web), bottom navigation (mobile)
- Task drawer slides in from right for editing
- Long-press to drag tasks for reordering (mobile)
- Edge-scroll auto-tab-switching in Kanban (flutter): drag to edge to switch tabs

## Commands
```bash
npm install          # Install all dependencies
npm run dev          # Start web dev server (connects to deployed API)
npm run build        # Build all packages
```
