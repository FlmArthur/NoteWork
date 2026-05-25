import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const notebooks = sqliteTable('notebooks', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').default('#4A90D9'),
  icon: text('icon').default('book'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  notebookId: text('notebook_id').notNull().references(() => notebooks.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default('未命名文档'),
  content: text('content'),
  plainText: text('plain_text').default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  lastOpenedAt: text('last_opened_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const calendarNotes = sqliteTable('calendar_notes', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  title: text('title').notNull(),
  content: text('content').default(''),
  color: text('color').default('#FFD700'),
  tags: text('tags').default('[]'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').default(''),
  priority: text('priority').notNull().default('medium'),
  status: text('status').notNull().default('todo'),
  startDate: text('start_date'),
  endDate: text('end_date'),
  dueDate: text('due_date'),
  tags: text('tags').default('[]'),
  sortOrder: integer('sort_order').notNull().default(0),
  completedAt: text('completed_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value'),
})
