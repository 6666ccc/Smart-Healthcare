# 慧疗 (HuiLiao) 动画系统设计

> 日期：2026-06-16
> 风格方向：**呼吸感 · 柔和克制** — 医疗场景的安静有序，动画存在但不喧宾夺主

---

## 1. 动画 Token（CSS 变量）

在已有 `--ease-soft: cubic-bezier(0.22, 1, 0.36, 1)` 基础上扩展。

### 1.1 新增变量（追加到 `src/index.css` 的 `:root`）

```css
:root {
  /* 节奏时长 */
  --motion-fast: 0.15s;      /* 微交互：hover、focus 响应 */
  --motion-base: 0.28s;      /* 常规过渡：卡片、按钮、tab */
  --motion-slow: 0.45s;      /* 页面级：整页 reveal、入场 */
  --motion-gentle: 0.6s;     /* 氛围级：背景呼吸、shimmer */

  /* 缓动曲线补充 */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);       /* 出场（快出） */
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);    /* 对称过渡 */
}
```

### 1.2 全局动画工具类（追加到 `src/index.css`）

```css
/* 入场动画基类 — 页面载入时使用 */
@keyframes fadeUpIn {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
.anim-fade-up {
  animation: fadeUpIn var(--motion-slow) var(--ease-soft) both;
}

/* 弹窗入场 */
@keyframes modalIn {
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
}
.anim-modal-in {
  animation: modalIn var(--motion-base) var(--ease-out) both;
}

/* 光泽扫过（骨架屏） */
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* stagger 延迟生成器 */
.anim-stagger > * { opacity: 0; }
.anim-stagger.anim-visible > * {
  animation: fadeUpIn var(--motion-slow) var(--ease-soft) both;
}
.anim-stagger.anim-visible > *:nth-child(1) { animation-delay: 0.05s; }
.anim-stagger.anim-visible > *:nth-child(2) { animation-delay: 0.10s; }
.anim-stagger.anim-visible > *:nth-child(3) { animation-delay: 0.15s; }
.anim-stagger.anim-visible > *:nth-child(4) { animation-delay: 0.20s; }
.anim-stagger.anim-visible > *:nth-child(5) { animation-delay: 0.25s; }
.anim-stagger.anim-visible > *:nth-child(6) { animation-delay: 0.30s; }
.anim-stagger.anim-visible > *:nth-child(7) { animation-delay: 0.35s; }
.anim-stagger.anim-visible > *:nth-child(8) { animation-delay: 0.40s; }
.anim-stagger.anim-visible > *:nth-child(9) { animation-delay: 0.45s; }
.anim-stagger.anim-visible > *:nth-child(10){ animation-delay: 0.50s; }

/* prefers-reduced-motion 全局尊重 */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 2. 微交互体系

### 2.1 卡片 Hover

**目标**：所有列表卡片（挂号/接诊/收费/患者等）hover 时微微上浮 + 阴影加深。

```css
.card-hover {
  transition:
    transform var(--motion-fast) var(--ease-soft),
    box-shadow var(--motion-fast) var(--ease-soft);
}
.card-hover:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.06);
}
```

**实施范围**：`reg-pc-card`、`con-pc-card`、`pay-pc-card`、`pat-pc-card`、`sch-pc-card`、`drug-pc-card`、`disp-pc-card`、`dept-pc-item`、Home 页快捷卡片。

### 2.2 按钮 Hover

- **主按钮**（`.shared-btn-submit` / 各页面 primary btn）：`scale(1.02)` + 背景色过渡
- **文字按钮/链接按钮**：下划线从中间展开（`::after` 伪元素 `scaleX(0→1)`）

### 2.3 侧边栏导航激活态

当前激活态是纯色变化。加入指示条动画：

```css
.home-pc-nav-item {
  position: relative;
  transition: background var(--motion-fast) var(--ease-soft);
}
.home-pc-nav-item::before {
  content: '';
  position: absolute;
  left: 0; top: 50%; transform: translateY(-50%);
  width: 3px; height: 0;
  background: var(--c-primary);
  border-radius: 0 2px 2px 0;
  transition: height var(--motion-base) var(--ease-soft);
}
.home-pc-nav-item--active::before {
  height: 60%;
}
```

### 2.4 Tab 切换指示器

PC 端 Tab 使用 `::after` 下划线平滑滑动（每页面各自的 tab 组件适配）。

### 2.5 移动端 TabBar

active icon 弹性缩放：

```css
.home-tab-item .tab-icon {
  transition: transform var(--motion-base) var(--ease-soft);
}
.home-tab-item--active .tab-icon {
  animation: tabPop 0.35s var(--ease-soft);
}
@keyframes tabPop {
  0%   { transform: scale(0.95); }
  50%  { transform: scale(1.08); }
  100% { transform: scale(1); }
}
```

---

## 3. 骨架屏（Skeleton Screen）

### 3.1 `<Skeleton />` 组件

新增文件：`src/components/Skeleton.jsx`

```jsx
// Props: lines (行数), variant ('text' | 'card' | 'toolbar')
// 渲染多条 shimmer 灰色圆角条
```

CSS：

```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--c-border) 25%,
    var(--c-bg) 50%,
    var(--c-border) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}
.skeleton--text    { height: 14px; margin-bottom: 8px; }
.skeleton--heading { height: 22px; width: 40%; margin-bottom: 16px; }
.skeleton--card    { height: 80px; margin-bottom: 12px; border-radius: var(--radius); }
```

### 3.2 替换范围

所有"加载中…"文字替换为 `<Skeleton />`。每个 PC 页面列表加载态显示 3-5 张 card 骨架。

### 3.3 移动端

移动端 skeleton 使用静态脉冲（仅 `opacity` 呼吸 0.6-1.0），降低 GPU 负担。

---

## 4. 路由过渡

### 4.1 实现方式

在 `src/views/Home/pc/PcLayout.jsx`（业务页面入口）和共用 `PcLayout` 的 body 区域，添加 CSS transition class：

```css
.page-enter {
  animation: fadeUpIn var(--motion-slow) var(--ease-soft) both;
}
```

实际通过 React 的 key 机制：给 `<Outlet />` 或页面根元素加 `key={location.pathname}`，触发重新挂载 → 入场动画播放。

### 4.2 进入/离开

- **进入**：全部走 `fadeUpIn`，0.45s
- **离开**：CSS transition 不需要额外处理——页面卸载自然消失

### 4.3 移动端

移动端仅 opacity 过渡（无 translateY），感觉更轻盈。

---

## 5. 页面级动画清单

### 5.1 首页（Home）

| 元素 | 动画 |
|------|------|
| 统计卡片行 | stagger fadeUpIn（每张延迟 0.08s） |
| 快捷功能卡片 | stagger fadeUpIn（比统计卡晚 0.2s 开始） |
| 待办列表 | 整体 fadeUpIn + 列表项 stagger |
| 问候语 section | 最先入场（无延迟） |

### 5.2 业务列表页

| 元素 | 动画 |
|------|------|
| 工具栏（标题+tabs+按钮） | fadeUpIn，delay 0 |
| 列表卡片 | stagger fadeUpIn（每张 0.05s） |
| 弹窗（新建/编辑） | `anim-modal-in` |
| 空状态 | fadeUpIn（无 stagger） |

### 5.3 登录页

已有完整动画体系（`loginFadeUp`、`loginBgBreath`、`loginLogoGlow`）——保持不变。

### 5.4 AI 助手

| 元素 | 动画 |
|------|------|
| 消息入场 | fadeUpIn（每条约 0.25s delay） |
| 打字指示器 | 已有三点跳动动画 — 保持不变 |
| 会话列表 | 新建会话从列表顶部滑入 |
| 欢迎页推荐词 | stagger fadeUpIn |

### 5.5 个人中心

| 元素 | 动画 |
|------|------|
| 头像卡片 | fadeUpIn，0.1s delay |
| 信息表格 | fadeUpIn，0.2s delay |
| 安全提示 | fadeUpIn，0.3s delay |

---

## 6. 实施计划

### Phase 1：基础层（`src/index.css`）
- [ ] 追加 `--motion-*` / `--ease-*` CSS 变量
- [ ] 追加 `@keyframes fadeUpIn`、`modalIn`、`shimmer`、`tabPop`
- [ ] 追加 `.anim-*` 工具类
- [ ] 追加 `prefers-reduced-motion` 媒体查询
- [ ] 追加 `.card-hover` 全局 mixin

### Phase 2：骨架屏组件
- [ ] 创建 `src/components/Skeleton.jsx`
- [ ] 追加 skeleton CSS 到 `index.css`
- [ ] 所有 PC 页面"加载中…"替换为 `<Skeleton />`

### Phase 3：微交互
- [ ] 卡片 hover 效果（所有列表卡片）
- [ ] 按钮 hover 效果（主按钮 + 文字按钮）
- [ ] 侧边栏激活态指示条
- [ ] Tab 切换下划线滑动
- [ ] 移动端 TabBar 弹性缩放

### Phase 4：路由过渡
- [ ] PcLayout body 添加 `page-enter` class 逻辑

### Phase 5：页面级 stagger
- [ ] Home 页统计卡片 + 快捷功能 stagger
- [ ] 各业务列表页卡片 stagger
- [ ] AI 助手消息入场
- [ ] 个人中心分区入场

### Phase 6：验证
- [ ] 桌面端 Chrome/Edge/Firefox 动画流畅
- [ ] 移动端动画降级正确
- [ ] `prefers-reduced-motion: reduce` 关闭动画
- [ ] 构建无错误

---

## 7. 约束 & 边界

- **纯 CSS 动画** — 不引入 framer-motion 等库，符合项目"零额外依赖"现状
- **不改造登录页** — 登录页已有成熟的动画系统，保持不变
- **不新增 npm 依赖**
- **60fps 目标** — 仅使用 `transform` + `opacity` 做动画（GPU 合成层），避免 `width/height/top/left` 动画触发 layout
- **移动端降级** — 减少 stagger 项目数（最多 3 项），shimmer → pulse，路由过渡简化
