# Patient AI Hospital Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把患者端 `/assistant` 改造成单一医院 AI 智能体工作台，并补齐患者上下文、安全边界和响应式视觉。

**Architecture:** 保留现有 React Router、`useChat` 流式聊天和患者 API；将 Assistant 页面重写为三栏桌面/单列移动布局，使用白名单结构化卡片渲染可执行患者动作。右侧摘要通过现有预约、缴费和患者接口加载，任何单项失败都降级为空状态。

**Tech Stack:** React 19、React Router、现有 axios API 模块、CSS variables/纯 CSS 动效、ReactMarkdown。

---

### Task 1: 建立患者智能体页面骨架

**Files:**
- Modify: `React/src/views/Assistant/index.jsx`
- Modify: `React/src/views/shared/Icons.jsx`（仅在缺少图标时补充）

- [ ] **Step 1: 复核现有聊天 API 和布局组件**

运行 `rg "chatStream|listRegistrations|listCharges|listVisits" React/src`，确认调用签名和返回结构。

- [ ] **Step 2: 重写 Assistant 视图结构**

保留 `useChat` 的流式回调，将渲染拆成 `AiShell`、`ConversationPanel`、`ContextRail`、`ActionCard` 和移动端 `MobileContextSheet`；页面只暴露健康咨询、预约、账单、报告和人工服务入口。

- [ ] **Step 3: 加入患者摘要加载**

在页面级 hook 中用 `Promise.allSettled` 请求患者预约、账单和就诊摘要，单项失败设置对应 `null`，不影响对话。

- [ ] **Step 4: 运行 lint 检查结构错误**

运行 `npm run lint`（工作目录 `React`），预期无新增 error。

### Task 2: 应用“可信医院智能体”视觉系统

**Files:**
- Modify: `React/src/views/shared/views.css`
- Modify: `React/src/index.css`

- [ ] **Step 1: 添加 AI 工作台专属变量与背景**

加入深靛蓝、冷青绿、琥珀色变量，增加细网格/纸张纹理伪元素，并为 `.ai-shell`、`.ai-rail`、`.ai-message`、`.ai-composer` 定义桌面布局。

- [ ] **Step 2: 添加响应式断点**

在 `max-width: 1100px` 隐藏上下文栏，在 `max-width: 760px` 改为单列、固定底部输入区和可展开摘要。

- [ ] **Step 3: 添加动效与无障碍降级**

为欢迎态、消息和卡片加入 stagger/fade 动效，并在 `prefers-reduced-motion: reduce` 时关闭动画。

### Task 3: 安全边界与验证

**Files:**
- Modify: `React/src/views/Assistant/index.jsx`
- Create: `React/test/assistant.test.js`（若现有测试配置允许）

- [ ] **Step 1: 限制结构化动作白名单**

仅允许 `book_appointment`、`view_appointments`、`view_payment`、`view_report`、`human_service`；未知动作显示“需要人工协助”，不调用 API。

- [ ] **Step 2: 加入急症提示和确认交互**

检测 AI 返回的风险标记或急症关键词，展示立即就医提示；预约/取消/支付等变更先显示确认按钮。

- [ ] **Step 3: 运行构建验证**

运行 `npm run build`（工作目录 `React`），预期 Vite 构建成功且无语法错误。

- [ ] **Step 4: 检查患者端不存在医护工具入口**

运行 `rg "prescription|drug|inventory|addDrug|createPrescription" React/src/views/Assistant React/src/views/Home`，确认只剩免责声明或文案，不存在可执行入口。

