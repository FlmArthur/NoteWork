# 桌面笔记办公软件 —— 软件设计文档

> **项目代号**: NoteWorks  
> **版本**: v1.0  
> **日期**: 2026-05-22  
> **目标平台**: Windows 10/11 64-bit  

---

## 目录

1. [项目概述](#1-项目概述)
2. [需求分析](#2-需求分析)
3. [技术选型](#3-技术选型)
4. [系统架构](#4-系统架构)
5. [模块设计](#5-模块设计)
6. [数据库设计](#6-数据库设计)
7. [UI/UX 设计](#7-uiux-设计)
8. [接口设计](#8-接口设计)
9. [安全设计](#9-安全设计)
10. [开发计划](#10-开发计划)

---

## 1. 项目概述

### 1.1 产品定位

一款面向个人用户的 Windows 桌面笔记办公软件，集笔记管理、文档编辑、日历便签、工作清单与智能报告生成为一体。

### 1.2 核心价值

- **一站式办公**：笔记、文档、日历、任务四合一，减少工具切换
- **智能报告**：基于工作清单自动生成日报/周报/月报，提升办公效率
- **数据安全**：本地优先存储 + 备份恢复机制，用户数据完全可控
- **多账号隔离**：支持多用户共用一台电脑，数据完全隔离

### 1.3 功能矩阵

| 模块 | 功能点 |
|------|--------|
| **笔记管理** | 笔记本创建/删除/重命名；文档创建/编辑/删除；分级目录 |
| **文档编辑** | 富文本编辑（参考 WPS 格式工具栏）；图片/表格插入；多文档标签页 |
| **日历便签** | 月/周/日视图；日期上创建便签；便签颜色/标签 |
| **工作清单** | 任务增删改查；日期设定；多日任务（开始→结束）；优先级；完成状态 |
| **报告生成** | 从清单按日期范围提取任务；日报/周报/月报模板；导出为 PDF/Word |
| **数据管理** | 全量备份/恢复；导入/导出；自动备份策略 |
| **用户系统** | 注册/登录；密码修改；用户数据隔离 |

---

## 2. 需求分析

### 2.1 功能性需求

#### FR-01 笔记本管理
- FR-01-01: 用户可创建不限数量的笔记本
- FR-01-02: 笔记本支持重命名、删除、排序
- FR-01-03: 笔记本支持自定义颜色/图标

#### FR-02 文档编辑
- FR-02-01: 每个笔记本内可创建多个文档
- FR-02-02: 文档编辑器支持富文本（字体、字号、加粗、斜体、下划线、颜色、对齐）
- FR-02-03: 支持插入图片、表格、超链接、分割线
- FR-02-04: 支持撤销/重做
- FR-02-05: 多文档以标签页形式打开，可拖拽排序
- FR-02-06: 文档自动保存（30秒间隔 + 失焦时保存）

#### FR-03 日历功能
- FR-03-01: 提供月视图、周视图、日视图三种模式
- FR-03-02: 支持在任意日期上创建便签
- FR-03-03: 便签支持纯文本、带格式文本
- FR-03-04: 便签卡片在日历格子中可见标题摘要
- FR-03-05: 点击日期可查看当天全部便签列表

#### FR-04 工作清单
- FR-04-01: 任务列表支持增删改查
- FR-04-02: 每条任务包含：标题、描述、优先级（高/中/低）、状态（待办/进行中/已完成）
- FR-04-03: 支持设置截止日期（单日）
- FR-04-04: 支持设置多日任务（开始日期 → 结束日期）
- FR-04-05: 支持按日期、优先级、状态筛选和排序
- FR-04-06: 支持拖拽排序任务

#### FR-05 报告生成
- FR-05-01: 日报：选择日期，提取当日任务生成报告
- FR-05-02: 周报：选择周范围，提取该周任务生成报告
- FR-05-03: 月报：选择月份，提取该月任务生成报告
- FR-05-04: 报告格式包含：报告标题、时间范围、完成事项、未完成事项、下期计划
- FR-05-05: 支持导出为 PDF 和 Microsoft Word (.docx)
- FR-05-06: 支持报告预览后导出

#### FR-06 数据备份与恢复
- FR-06-01: 全量备份所有用户数据至指定目录
- FR-06-02: 从备份文件恢复数据
- FR-06-03: 支持自动备份策略（每N天/每次关闭时）
- FR-06-04: 备份文件命名包含时间戳与版本信息

#### FR-07 用户账号
- FR-07-01: 用户注册（用户名 + 密码）
- FR-07-02: 用户登录/注销
- FR-07-03: 密码修改
- FR-07-04: 同一台电脑不同用户数据完全隔离
- FR-07-05: 用户数据使用 AES-256 加密存储

### 2.2 非功能性需求

| 类别 | 要求 |
|------|------|
| 性能 | 应用冷启动 < 3 秒；文档打开 < 500ms；自动保存无感知 |
| 可用性 | 安装包 < 150MB；内存占用 < 400MB |
| 可靠性 | 自动保存防数据丢失；定期备份提醒 |
| 安全 | 密码哈希存储（bcrypt）；数据文件 AES-256 加密 |
| 兼容性 | Windows 10 1809+ / Windows 11 |

---

## 3. 技术选型

### 3.1 总体方案

选用 **Electron + React + TypeScript** 全栈方案，理由是：

1. 需要类 WPS 的富文本编辑能力 → 成熟的 Web 富文本编辑器生态（Tiptap / Slate）
2. 日历、拖拽排序等复杂 UI → React 组件生态完善
3. 报告导出为 PDF/Word → 利用 Node.js 后端能力
4. 本地数据库 + 文件系统操作 → Electron 主进程能力

### 3.2 技术栈明细

| 层次 | 技术 | 版本 | 说明 |
|------|------|------|------|
| **框架** | Electron | 33.x | 桌面壳 |
| **前端** | React | 18.x | UI 渲染 |
| **语言** | TypeScript | 5.x | 类型安全 |
| **构建** | Vite | 6.x | 前端构建 + Electron 打包 |
| **UI 组件库** | Ant Design | 5.x | 通用 UI 组件（表单/表格/弹窗） |
| **富文本编辑器** | Tiptap | 2.x | 基于 ProseMirror，插件化架构 |
| **日历组件** | FullCalendar | 6.x | 月/周/日视图 + 事件系统 |
| **拖拽** | @dnd-kit/core | — | 任务列表拖拽排序 |
| **本地数据库** | better-sqlite3 | 11.x | SQLite 同步绑定，高性能 |
| **ORM** | Drizzle ORM | — | 类型安全的 SQL 构建器 |
| **加密** | Node.js crypto | — | AES-256-GCM |
| **密码哈希** | bcryptjs | — | 密码安全存储 |
| **PDF 生成** | puppeteer-core | — | HTML → PDF |
| **Word 生成** | docx | — | 程序化生成 .docx |
| **打包分发** | electron-builder | — | NSIS 安装包 |

### 3.3 不选其他方案的理由

| 候选方案 | 不选原因 |
|----------|----------|
| WPF + .NET | 富文本编辑能力弱；缺乏成熟的日历/任务组件；开发效率低 |
| Tauri + React | 生态不够成熟；文件系统/Rich Text 生态较弱 |
| Qt + C++ | 开发效率低；复杂 UI 实现成本高 |
| Flutter Desktop | Windows 端富文本编辑器生态不成熟 |

---

## 4. 系统架构

### 4.1 分层架构图

```
┌─────────────────────────────────────────────────────┐
│                   渲染进程（Renderer）                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │ 笔记本模块 │ │ 日历模块  │ │ 清单模块  │ │ 报告模块  │ │
│  └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └────┬────┘ │
│        └───────────────┴─────────────┴────────────┘      │
│                          │                               │
│                   ┌──────┴──────┐                        │
│                   │  IPC Bridge │                        │
│                   │ (contextBridge)                      │
│                   └──────┬──────┘                        │
└──────────────────────────┼──────────────────────────────┘
                           │  IPC (invoke/handle)
┌──────────────────────────┼──────────────────────────────┐
│                   主进程（Main）                           │
│                          │                               │
│  ┌──────────┐ ┌─────────┴────────┐ ┌─────────────────┐  │
│  │ 用户服务  │ │   数据库服务       │ │  文件/导出服务    │  │
│  │ (认证/加密)│ │  (Drizzle+SQLite) │ │ (备份/PDF/Word)  │  │
│  └──────────┘ └──────────────────┘ └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 4.2 进程职责划分

| 进程 | 职责 |
|------|------|
| **Main Process** | 数据库读写、用户认证、加密/解密、文件 I/O、报告生成、备份/恢复、窗口管理 |
| **Renderer Process** | UI 渲染、用户交互、编辑器状态管理、本地缓存、通过 IPC 调用主进程服务 |

### 4.3 数据流

```
用户操作 → React State → IPC invoke → Main Process Handler
                                            │
                                    ┌───────┴───────┐
                                    │  Service Layer │
                                    │  (Auth/DB/File)│
                                    └───────┬───────┘
                                            │
                              ┌─────────────┴─────────────┐
                              │         SQLite DB          │
                              │  (/AppData/NoteWorks/data/) │
                              └───────────────────────────┘
```

### 4.4 目录结构

```
NoteWorks/
├── package.json
├── electron-builder.yml
├── tsconfig.json
├── vite.config.ts
│
├── electron/                    # 主进程
│   ├── main.ts                  # 入口
│   ├── preload.ts               # 预加载脚本（IPC 桥接）
│   ├── ipc/                     # IPC 处理器
│   │   ├── auth.ipc.ts          # 用户认证相关
│   │   ├── notebook.ipc.ts      # 笔记本 CRUD
│   │   ├── document.ipc.ts      # 文档 CRUD
│   │   ├── calendar.ipc.ts      # 日历便签 CRUD
│   │   ├── task.ipc.ts          # 工作清单 CRUD
│   │   ├── report.ipc.ts        # 报告生成
│   │   └── backup.ipc.ts        # 备份恢复
│   ├── services/                # 业务服务
│   │   ├── auth.service.ts
│   │   ├── notebook.service.ts
│   │   ├── document.service.ts
│   │   ├── calendar.service.ts
│   │   ├── task.service.ts
│   │   ├── report.service.ts
│   │   └── backup.service.ts
│   ├── db/                      # 数据库
│   │   ├── connection.ts        # SQLite 连接管理
│   │   ├── schema.ts            # Drizzle ORM Schema
│   │   └── migrations/          # 数据库迁移文件
│   └── utils/
│       ├── crypto.ts            # AES 加密工具
│       └── file.ts              # 文件操作工具
│
├── src/                         # 渲染进程（React）
│   ├── main.tsx                 # React 入口
│   ├── App.tsx                  # 根组件（路由 + 布局）
│   ├── router.tsx               # 路由配置
│   ├── stores/                  # 状态管理 (Zustand)
│   │   ├── auth.store.ts
│   │   ├── notebook.store.ts
│   │   ├── editor.store.ts
│   │   ├── calendar.store.ts
│   │   └── task.store.ts
│   ├── hooks/                   # 自定义 Hooks
│   │   ├── useIpc.ts            # IPC 调用封装
│   │   └── useAutoSave.ts       # 自动保存
│   ├── components/              # 通用组件
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx    # 主布局（侧边栏+内容区）
│   │   │   ├── Sidebar.tsx      # 侧边导航
│   │   │   └── TitleBar.tsx     # 自定义标题栏
│   │   ├── editor/              # 富文本编辑器组件
│   │   │   ├── RichEditor.tsx
│   │   │   ├── Toolbar.tsx      # 格式工具栏
│   │   │   └── extensions/      # Tiptap 扩展
│   │   └── common/
│   ├── pages/                   # 页面
│   │   ├── login/
│   │   │   └── LoginPage.tsx
│   │   ├── notebook/
│   │   │   ├── NotebookListPage.tsx   # 笔记本列表
│   │   │   └── DocumentEditPage.tsx   # 文档编辑
│   │   ├── calendar/
│   │   │   └── CalendarPage.tsx       # 日历便签
│   │   ├── tasks/
│   │   │   └── TaskListPage.tsx       # 工作清单
│   │   ├── report/
│   │   │   └── ReportPage.tsx         # 报告生成/预览
│   │   └── settings/
│   │       ├── SettingsPage.tsx       # 设置
│   │       └── BackupPage.tsx         # 备份恢复
│   └── styles/
│       ├── global.css
│       └── themes/
│
├── resources/                   # 静态资源
│   └── icons/
│
└── templates/                   # 报告模板
    ├── daily-report.html
    ├── weekly-report.html
    └── monthly-report.html
```

---

## 5. 模块设计

### 5.1 用户认证模块

**状态机**：
```
[未登录] → 登录/注册 → [已登录] → 主界面
                ↑                      ↓
                └──── 注销 ←──── [已登录]
```

**主要接口**：
- `auth:register(username, password)` → 创建用户
- `auth:login(username, password)` → 验证并返回 token
- `auth:logout()` → 清除会话
- `auth:changePassword(oldPwd, newPwd)` → 修改密码

**安全设计**：
- 密码使用 bcrypt 哈希后存储（cost factor = 12）
- 用户数据用 AES-256-GCM 加密，密钥由用户密码派生（PBKDF2）
- 登录时在内存中持有解密密钥，退出时销毁

### 5.2 笔记本与文档模块

**数据模型**：
```
Notebook (笔记本)
├── id: UUID
├── name: string
├── color: string
├── sortOrder: number
├── createdAt/updatedAt
│
└── Document[] (文档)
    ├── id: UUID
    ├── notebookId: UUID (FK)
    ├── title: string
    ├── content: JSON (Tiptap 文档结构)
    ├── plainText: string (用于搜索)
    ├── sortOrder: number
    ├── lastOpenedAt: DateTime
    └── createdAt/updatedAt
```

**核心逻辑**：
- 笔记本列表在左侧边栏树形展示
- 点击笔记本 → 展开文档列表
- 点击文档 → 以标签页形式打开编辑器
- 文档自动保存：编辑后 30 秒 + 切换文档时保存
- 支持文档搜索（全文搜索 plainText 字段）

**富文本编辑器 (Tiptap 扩展)**：
- `@tiptap/starter-kit` — 基础格式（粗斜体/标题/列表/引用/代码块）
- `@tiptap/extension-table` — 表格
- `@tiptap/extension-image` — 图片
- `@tiptap/extension-link` — 超链接
- `@tiptap/extension-text-align` — 对齐
- `@tiptap/extension-text-style` — 字体样式
- `@tiptap/extension-color` — 文字颜色
- `@tiptap/extension-highlight` — 高亮
- `@tiptap/extension-underline` — 下划线
- 自定义扩展：`FontSize`、`FontFamily`、`LineHeight`

### 5.3 日历便签模块

**数据模型**：
```
CalendarNote (日历便签)
├── id: UUID
├── userId: UUID (FK)
├── date: Date
├── title: string
├── content: string (支持简单格式)
├── color: string
├── tags: JSON string[]
└── createdAt/updatedAt
```

**视图模式**：
| 视图 | 展示形式 |
|------|----------|
| 月视图 | 标准的月历格子，便签显示为彩色小卡片（最多显示 3 条，超出显示 "+N"） |
| 周视图 | 7 天横向排列，每天显示时间段，便签放置在对应时间段 |
| 日视图 | 当天详细视图，左侧时间轴，右侧便签详情列表 |

**交互逻辑**：
- 点击日期格子 → 弹出便签创建/编辑面板
- 便签卡片支持拖拽到其他日期（修改日期）
- 便签颜色可自定义（预设 8 种颜色）
- 支持标签分类和筛选

### 5.4 工作清单模块

**数据模型**：
```
Task (任务)
├── id: UUID
├── userId: UUID (FK)
├── title: string
├── description: string
├── priority: 'high' | 'medium' | 'low'
├── status: 'todo' | 'in_progress' | 'done'
├── startDate: Date | null       # 多日任务起始
├── endDate: Date | null         # 多日任务截止
├── dueDate: Date | null         # 单日任务截止
├── tags: JSON string[]
├── sortOrder: number
├── completedAt: DateTime | null
└── createdAt/updatedAt
```

**任务类型**：
- **单日任务**：只设置 `dueDate`（截止日期）
- **多日任务**：设置 `startDate` 和 `endDate`（跨越天数），在报告生成时按天数展开统计
- **无日期任务**：不设日期，作为待定事项

**筛选/排序**：
- 按状态筛选：全部 / 待办 / 进行中 / 已完成
- 按优先级筛选
- 按日期范围筛选
- 排序：拖拽手动排序 / 按日期 / 按优先级 / 按创建时间

### 5.5 报告生成模块

**报告类型与提取规则**：

| 报告类型 | 日期范围 | 提取逻辑 |
|----------|----------|----------|
| 日报 | 单日 | `dueDate = 当天` OR (`startDate <= 当天 <= endDate`) |
| 周报 | 周一~周日 | 同上逻辑，扩展至周范围 |
| 月报 | 1日~月末 | 同上逻辑，扩展至月范围 |

**报告模板结构**：
```
┌──────────────────────────────┐
│  【日报】2026-05-22           │
│                              │
│  一、今日完成事项              │
│    1. [已完成] 任务标题       │
│    2. [已完成] 任务标题       │
│                              │
│  二、进行中事项               │
│    1. [进行中] 任务标题       │
│                              │
│  三、未完成事项               │
│    1. [待办] 任务标题         │
│                              │
│  四、明日计划                 │
│    （从明日清单提取）         │
│                              │
│  总结：今日完成 3/5 项任务     │
└──────────────────────────────┘
```

**导出流程**：
```
1. 用户在报告页面选择报告类型 + 日期范围
2. 系统从数据库提取对应任务
3. 按模板渲染 HTML 预览
4. 用户确认后：
   ├── 导出 PDF：puppeteer HTML → PDF
   └── 导出 Word：docx 库程序化生成 .docx
```

### 5.6 备份与恢复模块

**备份内容**：
- 整个 SQLite 数据库文件
- 上传的图片/附件文件（存储在 `AppData/NoteWorks/files/{userId}/`）

**备份流程**：
```
1. 用户选择备份目录
2. 系统创建备份目录/NoteWorks_Backup_2026-05-22_14-30-00/
3. 复制数据库文件（加密后）到备份目录
4. 复制附件文件夹到备份目录
5. 生成 backup.json（元数据：版本/时间/内容清单）
6. 使用 archiver 打包为 .zip
7. 可选：自动备份定时器（在设置中配置间隔天数）
```

**恢复流程**：
```
1. 用户选择备份 .zip 文件
2. 系统解压到临时目录
3. 验证 backup.json 版本兼容性
4. 提示用户确认（当前数据将被覆盖）
5. 解密 → 替换数据库文件 → 替换附件文件夹
6. 重启应用
```

---

## 6. 数据库设计

### 6.1 ER 图

```
┌──────────┐       ┌──────────────┐       ┌─────────────┐
│   User   │       │   Notebook   │       │   Document   │
│──────────│       │──────────────│       │─────────────│
│ id (PK)  │──┐    │ id (PK)      │──┐    │ id (PK)     │
│ username │  │    │ userId (FK)  │  │    │ notebookId  │
│ password │  │    │ name         │  │    │   (FK)      │
│ salt     │  │    │ color        │  │    │ title       │
│ ...      │  │    │ sortOrder    │  │    │ content     │
└──────────┘  │    │ ...          │  │    │ plainText   │
              │    └──────────────┘  │    │ ...         │
              │                     │    └─────────────┘
              │    ┌──────────────┐  │
              │    │CalendarNote  │  │    ┌─────────────┐
              │    │──────────────│  │    │    Task      │
              ├────│ id (PK)      │  ├────│─────────────│
              │    │ userId (FK)  │  │    │ id (PK)     │
              │    │ date         │  │    │ userId (FK) │
              │    │ title        │  │    │ title       │
              │    │ content      │  │    │ description │
              │    │ color        │  │    │ priority    │
              │    │ tags         │  │    │ status      │
              │    │ ...          │  │    │ startDate   │
              │    └──────────────┘  │    │ endDate     │
              │                     │    │ dueDate      │
              │                     │    │ tags         │
              │                     │    │ sortOrder    │
              │                     │    │ completedAt │
              │                     │    │ ...          │
              │                     │    └─────────────┘
              │                     │
              │    ┌──────────────┐  │
              │    │   Setting    │  │
              │    │──────────────│  │
              └────│ id (PK)      │──┘
                   │ userId (FK)  │
                   │ key          │
                   │ value        │
                   └──────────────┘
```

### 6.2 DDL (SQLite)

```sql
-- 用户表
CREATE TABLE users (
    id          TEXT PRIMARY KEY,       -- UUID
    username    TEXT NOT NULL UNIQUE,
    password    TEXT NOT NULL,          -- bcrypt hash
    salt        TEXT NOT NULL,          -- PBKDF2 salt
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 笔记本表
CREATE TABLE notebooks (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    color       TEXT DEFAULT '#4A90D9',
    icon        TEXT DEFAULT 'book',
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_notebooks_user ON notebooks(user_id);

-- 文档表
CREATE TABLE documents (
    id              TEXT PRIMARY KEY,
    notebook_id     TEXT NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
    title           TEXT NOT NULL DEFAULT '未命名文档',
    content         TEXT,                -- JSON (Tiptap doc structure)
    plain_text      TEXT DEFAULT '',     -- 用于全文搜索
    sort_order      INTEGER NOT NULL DEFAULT 0,
    last_opened_at  TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_documents_notebook ON documents(notebook_id);
CREATE INDEX idx_documents_plain_text ON documents(plain_text);

-- 日历便签表
CREATE TABLE calendar_notes (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date        TEXT NOT NULL,           -- YYYY-MM-DD
    title       TEXT NOT NULL,
    content     TEXT DEFAULT '',
    color       TEXT DEFAULT '#FFD700',
    tags        TEXT DEFAULT '[]',       -- JSON array
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_calendar_notes_user_date ON calendar_notes(user_id, date);

-- 工作任务表
CREATE TABLE tasks (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    description     TEXT DEFAULT '',
    priority        TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
    status          TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done')),
    start_date      TEXT,               -- YYYY-MM-DD (多日任务)
    end_date        TEXT,               -- YYYY-MM-DD (多日任务)
    due_date        TEXT,               -- YYYY-MM-DD (单日任务)
    tags            TEXT DEFAULT '[]',
    sort_order      INTEGER NOT NULL DEFAULT 0,
    completed_at    TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_tasks_user ON tasks(user_id);
CREATE INDEX idx_tasks_user_date ON tasks(user_id, due_date);
CREATE INDEX idx_tasks_user_range ON tasks(user_id, start_date, end_date);
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);

-- 用户设置表 (键值对)
CREATE TABLE settings (
    id        TEXT PRIMARY KEY,
    user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key       TEXT NOT NULL,
    value     TEXT,
    UNIQUE(user_id, key)
);
CREATE INDEX idx_settings_user ON settings(user_id);
```

---

## 7. UI/UX 设计

### 7.1 整体布局

```
┌─────────────────────────────────────────────────────────┐
│  [≡] NoteWorks                          [─] [□] [×]     │ ← 自定义标题栏
├────────┬─────────────────────────────────────────────────┤
│        │  [文档1] [文档2] [文档3] [+]               ×   │ ← 文档标签页
│ 导航   ├─────────────────────────────────────────────────┤
│ 区域   │                                                  │
│        │   ┌──────────────────────────────┐              │
│  📓笔记 │   │  富文本编辑器工具栏            │              │
│  📅日历 │   │  [B] [I] [U] [字号▼] [字体▼] │              │
│  ✅清单 │   │  [≡≡] [≡] [·] [图] [表] [链] │              │
│  📊报告 │   ├──────────────────────────────┤              │
│  ⚙设置 │   │                              │              │
│        │   │                              │              │
│        │   │     文档编辑区域              │              │
│        │   │                              │              │
│        │   │                              │              │
│        │   └──────────────────────────────┘              │
│        │                                                  │
└────────┴─────────────────────────────────────────────────┘
│  就绪  │ 字数: 1,234 │ 已自动保存 14:30:22               │ ← 状态栏
└────────┴─────────────────────────────────────────────────┘
```

### 7.2 各页面设计要点

**笔记本页面（左侧边栏 + 文档区域）**：
- 左侧：笔记本树形列表 → 点击展开文档列表 → 右键菜单操作
- 中间：文档标签页（可拖拽排序、中键关闭）
- 编辑区：Tiptap 富文本编辑器 + 格式工具栏

**日历页面**：
- 顶部工具栏：视图切换（月/周/日）、日期导航（← 今天 →）、添加便签按钮
- 主体：FullCalendar 组件，便签卡片悬浮在日期格子上
- 右侧面板（可收起）：选中日期的便签详情列表

**工作清单页面**：
- 顶部：筛选栏（状态/优先级/日期）+ 搜索框 + 新建任务按钮
- 主体：任务卡片列表（支持拖拽排序）
- 每条任务卡片：复选框 + 标题 + 优先级标签 + 日期标签 + 操作按钮
- 点击展开详情：描述、日期设置、标签编辑

**报告页面**：
- 顶部：报告类型选择（日报/周报/月报）+ 日期选择器 + 生成按钮
- 主体：报告预览区（HTML 渲染）
- 底部：导出按钮（PDF / Word）+ 复制到剪贴板

### 7.3 命名设计（中文界面）

| 功能 | 中文按钮/标签 |
|------|-------------|
| 新建笔记本 | 📓 新建笔记本 |
| 新建文档 | 📄 新建文档 |
| 新建便签 | 📝 添加便签 |
| 新建任务 | ➕ 添加任务 |
| 生成日报 | 📊 生成日报 |
| 导出 PDF | 📥 导出 PDF |
| 备份数据 | 💾 备份数据 |
| 恢复数据 | 📂 恢复数据 |

---

## 8. 接口设计

### 8.1 IPC 通道定义

主进程通过 `ipcMain.handle()` 注册处理函数，渲染进程通过 `ipcRenderer.invoke()` 调用。

```
# 格式: channel名称
#   → 参数类型
#   ← 返回值类型

# === 用户认证 ===
auth:register       → (username: string, password: string) → { success, userId }
auth:login          → (username: string, password: string) → { success, userId }
auth:change-password → (userId: string, oldPwd: string, newPwd: string) → { success }

# === 笔记本 ===
notebook:list       → (userId: string) → Notebook[]
notebook:create     → (userId: string, data: CreateNotebookDTO) → Notebook
notebook:update     → (id: string, data: UpdateNotebookDTO) → Notebook
notebook:delete     → (id: string) → void
notebook:reorder    → (ids: string[]) → void

# === 文档 ===
document:list       → (notebookId: string) → Document[]
document:get        → (id: string) → Document (含 content)
document:create     → (notebookId: string, title: string) → Document
document:save       → (id: string, content: JSON, plainText: string) → void
document:rename     → (id: string, title: string) → void
document:delete     → (id: string) → void
document:search     → (userId: string, query: string) → Document[]

# === 日历便签 ===
calendar:list       → (userId: string, year: number, month: number) → CalendarNote[]
calendar:getByDate  → (userId: string, date: string) → CalendarNote[]
calendar:create     → (userId: string, data: CreateNoteDTO) → CalendarNote
calendar:update     → (id: string, data: UpdateNoteDTO) → CalendarNote
calendar:delete     → (id: string) → void
calendar:move       → (id: string, newDate: string) → CalendarNote

# === 工作清单 ===
task:list           → (userId: string, filters?: TaskFilters) → Task[]
task:create         → (userId: string, data: CreateTaskDTO) → Task
task:update         → (id: string, data: UpdateTaskDTO) → Task
task:delete         → (id: string) → void
task:reorder        → (orderedIds: string[]) → void

# === 报告生成 ===
report:preview      → (userId: string, type: 'daily'|'weekly'|'monthly',
                       dateRange: {start: string, end: string}) → HTML string
report:export-pdf   → (userId: string, type, dateRange, savePath: string) → filePath
report:export-docx  → (userId: string, type, dateRange, savePath: string) → filePath

# === 备份恢复 ===
backup:create       → (userId: string, destPath: string) → { filePath, size, timestamp }
backup:restore      → (userId: string, backupFilePath: string) → { success }
backup:get-settings → (userId: string) → AutoBackupSettings
backup:set-settings → (userId: string, settings: AutoBackupSettings) → void
```

### 8.2 DTO 定义（TypeScript）

```typescript
// 笔记本
interface CreateNotebookDTO {
  name: string;
  color?: string;
  icon?: string;
}
interface UpdateNotebookDTO {
  name?: string;
  color?: string;
  icon?: string;
}

// 文档
interface DocumentContent {
  type: 'doc';
  content: any[];  // Tiptap JSON 节点数组
}

// 日历便签
interface CreateNoteDTO {
  date: string;     // YYYY-MM-DD
  title: string;
  content?: string;
  color?: string;
  tags?: string[];
}

// 工作清单
interface CreateTaskDTO {
  title: string;
  description?: string;
  priority?: 'high' | 'medium' | 'low';
  startDate?: string;     // 多日任务开始
  endDate?: string;       // 多日任务结束
  dueDate?: string;       // 单日任务截止
  tags?: string[];
}

interface TaskFilters {
  status?: 'todo' | 'in_progress' | 'done';
  priority?: 'high' | 'medium' | 'low';
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}
```

---

## 9. 安全设计

### 9.1 数据加密方案

```
用户注册:
  1. password → bcrypt(password, cost=12) → 存 users.password
  2. 生成随机 salt → 存 users.salt
  3. encryptionKey = PBKDF2(password, salt, 100000, 256, SHA-256)
  4. 使用 encryptionKey 加密用户数据库文件 (AES-256-GCM)

用户登录:
  1. bcrypt.compare(password, storedHash) → 验证通过
  2. encryptionKey = PBKDF2(password, salt, 100000, 256, SHA-256)
  3. 密钥保留在内存中，用于后续数据加解密
  4. 退出登录时销毁内存中的密钥
```

### 9.2 安全要点

| 项目 | 措施 |
|------|------|
| 密码存储 | bcrypt 哈希（不是明文、不是 MD5） |
| 数据存储 | AES-256-GCM 加密，每个用户独立密钥 |
| 传输 | 纯本地应用，无网络传输，不收集任何数据 |
| SQL 注入 | 使用 Drizzle ORM 参数化查询 |
| 会话管理 | 登录后在主进程内存中持有解密密钥，无持久化 token |
| 备份安全 | 备份文件同样使用 AES 加密 |

---

## 10. 开发计划

### 10.1 里程碑规划

| 阶段 | 时间 | 交付物 |
|------|------|--------|
| **M0: 项目初始化** | 第1周 | Electron + React 项目骨架；Drizzle ORM + SQLite 配置；IPC 通信框架搭建 |
| **M1: 用户系统** | 第2周 | 注册/登录/注销；密码加密；数据隔离机制 |
| **M2: 笔记本+文档** | 第3-5周 | 笔记本 CRUD；文档 CRUD；Tiptap 富文本编辑器集成；标签页；自动保存 |
| **M3: 日历便签** | 第6-7周 | FullCalendar 集成；便签 CRUD；月/周/日视图切换 |
| **M4: 工作清单** | 第8-9周 | 任务 CRUD；多日任务；拖拽排序；筛选搜索 |
| **M5: 报告生成** | 第10-11周 | 报告模板设计；数据提取逻辑；PDF/Word 导出 |
| **M6: 备份恢复** | 第12周 | 备份/恢复功能；自动备份策略；设置页面 |
| **M7: 测试+发布** | 第13-14周 | 集成测试；性能优化；electron-builder 打包；安装程序 |

**总预估工期：14 周（约 3.5 个月）**

### 10.2 技术风险与应对

| 风险 | 等级 | 应对措施 |
|------|------|----------|
| 富文本编辑器复杂度高 | 中 | Tiptap 插件化架构成熟，参考 Notion/语雀的编辑器方案 |
| FullCalendar 与 React 集成 | 低 | FullCalendar 官方提供 React 包装器 |
| 多用户数据加密性能 | 低 | SQLite 文件级加密，对性能影响极小（< 5%） |
| PDF 导出版式问题 | 中 | 先用 HTML 模板精细排版，再用 puppeteer 渲染；提供 Word 备选方案 |
| 打包体积过大 | 低 | Electron 基础 ~80MB，加上依赖约 120MB，在目标范围内 |

### 10.3 开发环境

- **Node.js**: 20.x LTS
- **包管理**: pnpm (节省磁盘空间)
- **代码规范**: ESLint + Prettier
- **版本管理**: Git
- **编辑器**: VS Code（推荐插件：ESLint、Prettier、Tailwind CSS）

---

## 附录 A: 扩展规划（v2.0 展望）

- 云同步功能（可选，端到端加密）
- Markdown 编辑模式
- 思维导图集成
- 手写笔记（手写笔支持）
- AI 辅助写作与任务建议
- 团队协作（共享笔记本）

---

## 附录 B: 参考技术文档

| 项目 | 文档地址 |
|------|----------|
| Electron | https://www.electronjs.org/docs |
| React | https://react.dev |
| Tiptap | https://tiptap.dev/docs |
| FullCalendar | https://fullcalendar.io/docs |
| Drizzle ORM | https://orm.drizzle.team/docs |
| better-sqlite3 | https://github.com/WiseLibs/better-sqlite3 |
| electron-builder | https://www.electron.build |
