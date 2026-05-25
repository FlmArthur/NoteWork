# NoteWorks

NoteWorks 是一款面向个人办公场景的 Windows 桌面笔记与任务管理应用。项目基于 Electron、React 和 TypeScript 构建，集成笔记本、富文本文档、日历便签、工作清单、报告生成和数据备份等能力。

## 功能特性

- 笔记本与文档管理：支持笔记本、文档的创建、编辑、重命名、删除和排序。
- 富文本编辑：基于 Tiptap，支持常用排版、链接、图片、表格等编辑能力。
- 日历便签：基于 FullCalendar，提供日历视图和日期便签管理。
- 工作清单：支持任务状态、优先级、开始日期、截止日期、标签和拖拽排序。
- 报告生成：可从任务数据生成日报、周报、月报，并支持导出。
- 本地数据：使用 SQLite 存储应用数据，适合个人离线使用。
- 桌面打包：使用 electron-builder 生成 Windows NSIS 安装包。

## 技术栈

| 类型 | 技术 |
| --- | --- |
| 桌面框架 | Electron 33 |
| 前端框架 | React 18 + TypeScript |
| 构建工具 | electron-vite + Vite |
| UI 组件 | Ant Design |
| 状态管理 | Zustand |
| 富文本编辑 | Tiptap |
| 日历组件 | FullCalendar |
| 拖拽排序 | dnd-kit |
| 数据库 | SQLite + better-sqlite3 |
| ORM | Drizzle ORM |
| 打包工具 | electron-builder |

## 项目结构

```text
Canlender/
├─ src/
│  ├─ main/                 # Electron 主进程
│  │  ├─ db/                # SQLite 连接与数据表定义
│  │  ├─ ipc/               # IPC 通道处理
│  │  ├─ services/          # 业务服务
│  │  └─ utils/             # 工具函数
│  ├─ preload/              # 预加载脚本与 contextBridge
│  └─ renderer/             # React 渲染进程
│     └─ src/
│        ├─ components/     # 通用组件
│        ├─ pages/          # 页面
│        ├─ stores/         # Zustand 状态
│        ├─ styles/         # 全局样式
│        └─ types/          # 类型声明
├─ templates/               # 报告模板等资源
├─ electron.vite.config.ts  # electron-vite 配置
├─ package.json             # 项目依赖与脚本
└─ SoftwareDesignDocument.md
```

## 环境要求

- Node.js 20 或更高版本
- npm 10 或更高版本
- Windows 10/11
- Python 3.12 或更高版本，供原生模块编译使用

> `better-sqlite3` 是原生模块。如果安装或运行时出现模块版本不匹配，需要执行 Electron 原生模块重编译。

## 安装依赖

```bash
npm install
```

如遇到 `better-sqlite3` 与 Electron Node 版本不匹配，可执行：

```bash
npx @electron/rebuild
```

## 开发运行

```bash
npm run dev
```

该命令会启动 electron-vite 开发环境，并打开 Electron 桌面窗口。

## 构建

```bash
npm run build
```

构建产物会输出到 `out/` 目录。

## 打包 Windows 安装包

```bash
npm run package:win
```

打包产物会输出到 `release/` 目录。当前配置使用 NSIS 安装器，并将 `better-sqlite3` 相关文件从 ASAR 中解包。

## 常用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发环境 |
| `npm run build` | 构建主进程、预加载脚本和渲染进程 |
| `npm run preview` | 预览构建后的应用 |
| `npm run package` | 构建并打包应用 |
| `npm run package:win` | 构建并打包 Windows 安装包 |

## 数据存储

应用数据默认存放在 Electron 用户数据目录下，主要包括：

- 用户配置
- SQLite 数据库
- 笔记、文档、日历便签、任务和报告相关数据
- 备份与恢复所需的本地文件

请勿将本地数据库、备份文件、构建产物或依赖目录提交到 Git 仓库。

## Git 提交建议

首次提交前建议确认以下内容不会进入仓库：

- `node_modules/`
- `out/`
- `release/`
- 本地数据库文件
- 临时文件和日志
- 系统生成文件

项目已提供 `.gitignore` 来过滤上述常见文件。

## 相关文档

- [构建与部署指南](./BUILD.md)
- [软件设计文档](./SoftwareDesignDocument.md)

