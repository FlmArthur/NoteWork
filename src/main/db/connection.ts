import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'
import fs from 'fs'

let db: Database.Database | null = null
let currentUserId: string | null = null

export function getCurrentUserId(): string | null {
  return currentUserId
}

export function getDbPath(userId?: string): string {
  const userDataPath = app.getPath('userData')
  const dataDir = path.join(userDataPath, 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  if (userId) {
    const userDir = path.join(dataDir, userId)
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true })
    }
    return path.join(userDir, 'database.sqlite')
  }
  return path.join(dataDir, 'noteworks.sqlite')
}

export function initGlobalDb(): Database.Database {
  const dbPath = path.join(app.getPath('userData'), 'data', 'users.sqlite')
  const dir = path.dirname(dbPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  if (db) db.close()
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
  `)
  currentUserId = null
  return db
}

export function initUserDatabase(userId: string): Database.Database {
  if (db) db.close()
  const dbPath = getDbPath(userId)
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  runUserMigrations(db)
  currentUserId = userId
  return db
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized.')
  }
  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
    currentUserId = null
  }
}

function runUserMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS notebooks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#4A90D9',
      icon TEXT DEFAULT 'book',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      notebook_id TEXT NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT '未命名文档',
      content TEXT,
      plain_text TEXT DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      last_opened_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_documents_notebook ON documents(notebook_id);

    CREATE TABLE IF NOT EXISTS calendar_notes (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      color TEXT DEFAULT '#FFD700',
      tags TEXT DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_calendar_notes_date ON calendar_notes(date);

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
      status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','paused','done')),
      start_date TEXT,
      end_date TEXT,
      due_date TEXT,
      tags TEXT DEFAULT '[]',
      sort_order INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(due_date);
    CREATE INDEX IF NOT EXISTS idx_tasks_range ON tasks(start_date, end_date);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      value TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
  `)

  const taskTable = db.prepare(`
    SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'tasks'
  `).get() as { sql?: string } | undefined

  if (taskTable?.sql && !taskTable.sql.includes("'paused'")) {
    db.transaction(() => {
      db.exec(`
        ALTER TABLE tasks RENAME TO tasks_legacy_status;

        CREATE TABLE tasks (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT DEFAULT '',
          priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
          status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','paused','done')),
          start_date TEXT,
          end_date TEXT,
          due_date TEXT,
          tags TEXT DEFAULT '[]',
          sort_order INTEGER NOT NULL DEFAULT 0,
          completed_at TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
        );

        INSERT INTO tasks (
          id, title, description, priority, status, start_date, end_date, due_date,
          tags, sort_order, completed_at, created_at, updated_at
        )
        SELECT
          id, title, description, priority, status, start_date, end_date, due_date,
          tags, sort_order, completed_at, created_at, updated_at
        FROM tasks_legacy_status;

        DROP TABLE tasks_legacy_status;
        CREATE INDEX idx_tasks_date ON tasks(due_date);
        CREATE INDEX idx_tasks_range ON tasks(start_date, end_date);
        CREATE INDEX idx_tasks_status ON tasks(status);
      `)
    })()
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS task_activities (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('progress_summary','daily_summary','status_change','defer')),
      content TEXT NOT NULL DEFAULT '',
      summary_date TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_task_activities_task ON task_activities(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_activities_date ON task_activities(summary_date);
  `)
}
