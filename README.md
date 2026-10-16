# Lee To-Do — AI-Powered Cross-Platform Kanban Board

> A smart, platform-independent task management system with AI assistance and native push notifications across all devices.

## Tech Stack (100% Cloudflare)

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Vanilla CSS |
| Backend | Cloudflare Workers + Hono |
| Database | Cloudflare D1 (SQLite) |
| AI | Workers AI via AI Gateway |
| Notifications | Web Push API + Service Worker |
| Deployment | Cloudflare Pages + Workers |

##  Cross-Platform Notifications

Push notifications work like WhatsApp messages on:
- **Windows** → Action Center toast notifications
- **Android** → Notification tray (install as PWA)
- **iOS** → Notification Center (install as PWA, Safari 16.4+)
- **Mac/Linux** → Native browser notifications

##  Quick Start

### 1. Install Dependencies
```bash
npm install
cd client && npm install
cd ../worker && npm install
```

### 2. Create D1 Database
```bash
cd worker
npx wrangler d1 create lee-todo-db
# Copy the database_id and update wrangler.toml
```

### 3. Initialize Database Schema
```bash
npm run db:init
```

### 4. Generate VAPID Keys (for push notifications)
```bash
node scripts/generate-vapid.js
# Follow the instructions to set secrets
```

### 5. Run Locally
```bash
# Terminal 1: Start Worker backend
cd worker && npm run dev

# Terminal 2: Start React frontend
cd client && npm run dev
```

Open http://localhost:5173

##  Deploy to Cloudflare

### Deploy Worker (Backend)
```bash
cd worker
npx wrangler deploy
```

### Deploy Pages (Frontend)
```bash
cd client
npm run build
npx wrangler pages deploy dist --project-name=lee-todo
```

### Set Worker Secrets
```bash
cd worker
npx wrangler secret put VAPID_PUBLIC_KEY
npx wrangler secret put VAPID_PRIVATE_KEY
npx wrangler secret put VAPID_SUBJECT
```

### Initialize Remote Database
```bash
npm run db:init:remote
```

##  Features

- **4-Column Kanban**: To-Do → Urgent → In Progress → Blocked
- **Drag & Drop**: Move tasks between columns effortlessly
- **AI Assistant**: NLP text + voice commands to manage tasks
- **Smart Notifications**: Overdue alerts, daily reminders, weekly digest
- **Auto-Status**: Tasks auto-tagged as overdue/due-today/on-track
- **Quiet Hours**: No notifications during sleep
- **PWA**: Install on any device for native-app experience

##  AI Commands

| Say this... | AI does this... |
|------------|----------------|
| "Add a task to submit ML assignment by Friday" | Creates task in To-Do with due date |
| "Move database project to urgent" | Moves task to Urgent column |
| "What's overdue?" | Analyzes board and lists overdue tasks |
| "Give me my weekly summary" | Generates productivity insights |
| "What should I focus on today?" | Prioritization recommendation |

## 📁 Project Structure

```
Lee_To_Do/
├── client/                    # React SPA (Cloudflare Pages)
│   ├── public/
│   │   ├── sw.js              # Service Worker (push notifications)
│   │   └── manifest.json      # PWA manifest
│   └── src/
│       ├── components/        # React components
│       ├── hooks/             # Custom React hooks
│       ├── pages/             # Blackboard & Settings
│       └── utils/             # API client & helpers
├── worker/                    # Cloudflare Worker (Backend)
│   └── src/
│       ├── routes/            # API endpoints
│       ├── cron/              # Notification scheduler
│       └── db/                # D1 schema
└── scripts/                   # Utility scripts
```
