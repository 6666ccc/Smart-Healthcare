# AI Workspace Visual Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为患者 AI 工作台打造更具层次、动感且不干扰医疗可读性的首屏体验。

**Architecture:** 保持 `Assistant/index.jsx` 的数据与聊天逻辑不变，仅补充表现层 class 和状态；所有视觉、动画、响应式和 reduced-motion 规则集中在 `index.css` 的 AI 工作台区。

**Tech Stack:** React 19、CSS variables、CSS keyframes、Vite。

---

### Task 1: 建立欢迎态视觉层次

**Files:**
- Modify: `React/src/views/Assistant/index.jsx`
- Modify: `React/src/index.css`

- [ ] **Step 1: 标记欢迎态装饰层**

在 `.ai-welcome` 内新增纯展示的光圈、状态轨迹和微型状态标签，所有装饰元素使用 `aria-hidden="true"`。

- [ ] **Step 2: 实现护理灯与文字入场**

为欢迎态标志使用 `aiBeaconBreathe`，为 kicker、标题、说明、建议卡和行动卡分别使用 `aiRise` 且延迟递增，动画在 700ms 内完成。

- [ ] **Step 3: 实现悬停反馈**

为建议和行动按钮添加 `transform: translateY(-3px)`、阴影与箭头平移；为 `:active` 添加 `scale(.98)`。

### Task 2: 精修输入区与上下文卡

**Files:**
- Modify: `React/src/index.css`

- [ ] **Step 1: 加入输入焦点反馈**

使用 `.ai-composer__box:focus-within` 提升边框、光晕和背景，发送按钮在 `:not(:disabled)` 时使用青绿渐变。

- [ ] **Step 2: 加入摘要卡层次**

给 `.ai-context-card` 添加左侧渐变色条、hover 上移与行动文字箭头位移；保持文字对比度。

- [ ] **Step 3: 支持减弱动效**

复用现有 `prefers-reduced-motion` 覆盖，确保新增动画不会在该模式下播放。

### Task 3: 构建验证

**Files:**
- Test: `React/src/views/Assistant/index.jsx`
- Test: `React/src/index.css`

- [ ] **Step 1: 检查页面 lint**

运行 `npx eslint src/views/Assistant/index.jsx`，预期退出码为 0。

- [ ] **Step 2: 检查生产构建**

运行 `npm run build`，预期出现 `built in` 且退出码为 0。

- [ ] **Step 3: 提交改动**

运行 `git add React/src/views/Assistant/index.jsx React/src/index.css docs/superpowers/plans/2026-07-18-ai-workspace-visual-refinement.md` 和 `git commit -m "feat: polish AI workspace motion"`。
