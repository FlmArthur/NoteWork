# NoteWorks 构建与部署指南

## 环境要求

| 依赖 | 版本 | 说明 |
|------|------|------|
| Node.js | v24.16.0 | 运行时 & 包管理 |
| npm | 11.13.0 | 随 Node.js 安装 |
| Python | 3.12+ | 编译原生模块 (better-sqlite3) |
| Electron | v33.4.11 | 桌面应用框架 |
| 操作系统 | Windows 11 | 目标平台 |

## 项目架构

```
Canlender/
├── electron.vite.config.ts     # electron-vite 构建配置
├── package.json                 # 依赖 & 构建脚本
├── src/
│   ├── main/                    # 主进程 (Electron Main Process)
│   │   ├── index.ts             # 窗口创建、IPC 注册、生命周期
│   │   ├── db/
│   │   │   ├── connection.ts    # SQLite 数据库连接 & 迁移
│   │   │   └── schema.ts        # 数据表结构定义
│   │   └── ipc/                 # IPC 通信处理器
│   │       ├── auth.ipc.ts      # 用户注册/登录/密码修改
│   │       ├── notebook.ipc.ts  # 笔记本 CRUD
│   │       ├── document.ipc.ts  # 文档 CRUD & 重命名 & 搜索
│   │       ├── calendar.ipc.ts  # 日历便签 CRUD & 拖拽移动
│   │       ├── task.ipc.ts      # 任务 CRUD & 筛选 & 排序
│   │       ├── report.ipc.ts    # 日报/周报/月报 生成 & 导出
│   │       └── backup.ipc.ts    # 数据备份 & 恢复
│   ├── preload/
│   │   └── index.ts             # contextBridge 暴露 API 到渲染进程
│   └── renderer/
│       ├── index.html           # 入口 HTML
│       └── src/
│           ├── components/
│           │   ├── layout/
│           │   │   ├── TitleBar.tsx    # 自定义标题栏 (最小化/最大化/关闭)
│           │   │   ├── Sidebar.tsx     # 侧边导航栏 (200px)
│           │   │   └── MainLayout.tsx  # 主布局 & 路由配置
│           │   └── editor/
│           │       ├── RichEditor.tsx      # Tiptap 富文本编辑器
│           │       ├── Toolbar.tsx         # 编辑工具栏
│           │       ├── FontSizeExtension.ts # 自定义字体大小扩展
│           │       └── EditorContextMenu.tsx # 右键菜单
│           ├── pages/
│           │   ├── home/HomePage.tsx           # 首页仪表盘
│           │   ├── notebook/NotebookListPage.tsx # 笔记本 & 文档管理
│           │   ├── calendar/CalendarPage.tsx    # 日历 & 便签
│           │   ├── tasks/TaskListPage.tsx       # 工作清单 (拖拽排序)
│           │   ├── report/ReportPage.tsx        # 报告生成 & 导出
│           │   ├── login/LoginPage.tsx          # 登录/注册
│           │   └── settings/SettingsPage.tsx    # 设置 & 备份恢复
│           ├── stores/
│           │   ├── auth.store.ts     # 认证状态 (Zustand)
│           │   └── notebook.store.ts # 笔记本/文档状态 (Zustand)
│           ├── styles/
│           │   └── global.css        # 全局样式 (Evernote 绿色主题)
│           └── types/
│               └── electron.d.ts     # TypeScript 类型声明
└── out/                      # 构建输出目录
    ├── main/index.js          # 主进程打包产物 (~32 KB)
    ├── preload/index.js       # 预加载脚本 (~3.6 KB)
    └── renderer/              # 渲染进程 (React 打包 ~3.5 MB)
        ├── index.html
        └── assets/
```

## 数据库结构

每个用户拥有独立的 SQLite 数据库文件，存储于用户数据目录。

```
%APPDATA%/NoteWorks/data/
├── users.sqlite               # 全局用户表 (所有用户共享)
│   └── users                  # id, username, password(bcrypt), salt, timestamps
│
└── {userId}/
    └── database.sqlite        # 用户数据 (独立隔离)
        ├── notebooks          # 笔记本 (name, color, sort_order)
        ├── documents          # 文档 (notebook_id, title, content[Tiptap JSON], plain_text)
        ├── calendar_notes     # 日历便签 (date, title, content, color, tags)
        ├── tasks              # 任务 (priority, status, start_date, end_date, due_date, tags)
        └── settings           # 用户设置 (key-value)
```

## 构建步骤

### 1. 确保环境正确

```bash
# Node.js 必须在 PATH 中 (已写入 ~/.bashrc)
source ~/.bashrc
node --version   # 应输出 v24.16.0

# 清除可能残留的环境变量
unset ELECTRON_RUN_AS_NODE
```

### 2. 安装依赖

```bash
cd e:/Canlender
npm install
```

### 3. 编译原生模块

`better-sqlite3` 是 C++ 原生模块，需要针对 Electron 内置的 Node.js 重新编译：

```bash
# 确保 Python 3.12 在 PATH 中
export PATH="$HOME/AppData/Local/Programs/Python/Python312:$PATH"

# 使用 @electron/rebuild 自动编译
npx @electron/rebuild
```

如果 `@electron/rebuild` 失败，手动编译：

```bash
cd node_modules/better-sqlite3
npx node-gyp rebuild --target=33.4.11 --arch=x64 --dist-url=https://electronjs.org/headers
cd ../..
```

验证编译成功：

```bash
# .node 文件应存在且匹配 Electron NODE_MODULE_VERSION 130
file node_modules/better-sqlite3/build/Release/better_sqlite3.node
```

### 4. 构建项目

```bash
npx electron-vite build
```

构建过程：
1. Vite 打包主进程 (`src/main/` → `out/main/index.js`)
2. Vite 打包预加载脚本 (`src/preload/` → `out/preload/index.js`)
3. Vite 打包渲染进程 (`src/renderer/` → `out/renderer/`，含 React + Ant Design)

### 5. 开发模式运行

```bash
npx electron-vite dev
```

启动 Vite 开发服务器 + Electron 窗口，支持热更新。

### 6. 生产模式测试

```bash
npx electron out/main/index.js
```

---

## 创建便携版 (Portable)

便携版是免安装的独立运行版本，适合离线分发。

### 便携版目录结构

```
NoteWorks-portable/
├── NoteWorks.exe               # Electron 可执行文件 (~300 MB)
├── resources/
│   └── app/                    # 应用根目录
│       ├── package.json        # main 指向 ./out/main/index.js
│       ├── out/                # 构建产物
│       │   ├── main/index.js
│       │   ├── preload/index.js
│       │   └── renderer/
│       │       ├── index.html
│       │       └── assets/
│       └── node_modules/       # 运行时依赖 (better-sqlite3 等)
├── chrome_100_percent.pak      # Chromium 资源
├── chrome_200_percent.pak
├── d3dcompiler_47.dll
├── ffmpeg.dll
├── icudtl.dat
├── libEGL.dll / libGLESv2.dll
├── resources.pak
├── snapshot_blob.bin
├── v8_context_snapshot.bin
├── vk_swiftshader.dll / vulkan-1.dll
├── LICENSE / LICENSES.chromium.html
└── locales/
```

### 首次创建便携版

```bash
PORTABLE="C:/Users/Administrator/NoteWorks-portable"

# 1. 创建目录
mkdir -p "$PORTABLE/resources/app"

# 2. 复制 Electron 运行时
cp -r node_modules/electron/dist/* "$PORTABLE/"

# 3. 复制应用文件
cp package.json "$PORTABLE/resources/app/"
cp -r node_modules "$PORTABLE/resources/app/"

# 4. 复制构建产物
cp -r out "$PORTABLE/resources/app/"

# 5. 启动测试
npx electron "$PORTABLE"
```

### 更新便携版 (仅构建产物变更)

```bash
rm -rf "C:/Users/Administrator/NoteWorks-portable/resources/app/out"
cp -r out "C:/Users/Administrator/NoteWorks-portable/resources/app/"
```

当前版本大小：约 **776 MB**（主要是 Electron + Chromium 运行时）。

---

## 创建安装包 (.exe)

使用 electron-builder 打包为 NSIS 安装程序：

```bash
npx electron-vite build && npx electron-builder --win
```

输出在 `release/` 目录，生成 `NoteWorks Setup x.x.x.exe`。

### 打包配置 (package.json)

```json
"build": {
  "appId": "com.noteworks.app",
  "productName": "NoteWorks",
  "directories": { "output": "release" },
  "win": { "target": "nsis" },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "language": "2052"
  },
  "asarUnpack": ["node_modules/better-sqlite3/**"]
}
```

### 注意事项

- `asarUnpack` 必须包含 `better-sqlite3`：原生 .node 模块不能打包进 ASAR 归档
- electron-builder 打包 NSIS 时需要从 GitHub 下载 `winCodeSign` 和 `nsis-resources`
- GitHub 不可访问时打包会失败，**此时使用便携版分发**
- 安装包体积更小（约 84 MB 压缩），便携版可直接使用

---

## 关键配置

### electron.vite.config.ts

```typescript
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        external: ['better-sqlite3', 'bcryptjs']  // 原生模块不打包
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    build: {
      rollupOptions: {
        input: path.resolve(__dirname, 'src/renderer/index.html')
      }
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src/renderer/src')
      }
    }
  }
})
```

### package.json (关键字段)

```json
{
  "name": "noteworks",
  "version": "1.0.0",
  "main": "./out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "package": "electron-vite build && electron-builder",
    "package:win": "electron-vite build && electron-builder --win"
  }
}
```

---

## 一键构建脚本

```bash
#!/bin/bash
# build.sh — NoteWorks 一键构建 & 部署脚本
set -e

# 配置环境
export PATH="/c/Program Files/nodejs:$PATH"
export PATH="$HOME/AppData/Local/Programs/Python/Python312:$PATH"
unset ELECTRON_RUN_AS_NODE

# 进入项目
cd e:/Canlender

# 安装依赖 (首次)
[ -d "node_modules" ] || npm install

# 编译原生模块 (首次或 node_modules 更新后)
if [ ! -f "node_modules/better-sqlite3/build/Release/better_sqlite3.node" ]; then
  npx @electron/rebuild
fi

# 构建
npx electron-vite build

# 部署到便携版
rm -rf "C:/Users/Administrator/NoteWorks-portable/resources/app/out"
cp -r out "C:/Users/Administrator/NoteWorks-portable/resources/app/"

echo ""
echo "构建完成!"
echo "运行命令: npx electron C:/Users/Administrator/NoteWorks-portable"
```

使用方法：

```bash
source ~/.bashrc
bash e:/Canlender/build.sh
```

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| `ELECTRON_RUN_AS_NODE=1` 导致窗口不显示 | 环境变量残留，Electron 以 Node 模式运行 | `unset ELECTRON_RUN_AS_NODE` |
| `better-sqlite3` 报 MODULE_VERSION 不匹配 | 系统 Node (v24, MODULE 137) ≠ Electron Node (v20, MODULE 130) | `npx @electron/rebuild` |
| `npx: command not found` | Node.js 不在 PATH | `export PATH="/c/Program Files/nodejs:$PATH"` 或 `source ~/.bashrc` |
| `python: command not found` | Python 不在 PATH | `export PATH="$HOME/AppData/Local/Programs/Python/Python312:$PATH"` |
| electron-builder 打包 NSIS 失败 | 无法从 GitHub 下载 winCodeSign/nsis | 使用便携版分发 |
| 主进程文件路径错误 | electron-vite 输出目录与期望不符 | 检查 `package.json` 中 `main` 字段为 `./out/main/index.js` |
| 预加载脚本未加载 | 路径错误 | 检查 `main/index.ts` 中 preload 路径为 `../preload/index.js` |
| 渲染页面空白 | HTML 文件路径错误 | 检查渲染进程入口路径为 `../renderer/index.html` |
| 原生模块打包进 ASAR 报错 | .node 文件不能从 ASAR 加载 | 确保 `asarUnpack` 包含 `better-sqlite3`，或使用目录结构 (非 ASAR) |

---

## 技术栈

| 层面 | 技术 |
|------|------|
| 桌面框架 | Electron v33 |
| 构建工具 | electron-vite v5 |
| 前端框架 | React 18 + TypeScript |
| UI 组件库 | Ant Design 5.x |
| 状态管理 | Zustand |
| 路由 | react-router-dom v6 |
| 富文本编辑 | Tiptap v2 (StarterKit + 扩展) |
| 数据库 | better-sqlite3 (SQLite) |
| 密码加密 | bcryptjs |
| 日历 | FullCalendar v6 |
| 拖拽排序 | @dnd-kit |
| 日期处理 | dayjs |
| 打包 | electron-builder (NSIS) |
