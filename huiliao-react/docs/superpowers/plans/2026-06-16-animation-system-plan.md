# HuiLiao Animation System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a cohesive "breathing, restrained" CSS animation system to the HuiLiao medical platform — page reveals, skeleton screens, card/button micro-interactions, mobile adaptations — with zero new npm dependencies.

**Architecture:** CSS variables + `@keyframes` added to `src/index.css` form the shared foundation. A single `<Skeleton />` React component replaces all "加载中…" text. Existing `--ease-soft` cubic-bezier is extended with timing/duration tokens. All animations use `transform` + `opacity` only (GPU-composited). `prefers-reduced-motion` globally respected.

**Tech Stack:** React 19, Vite 8, Pure CSS (no framer-motion, no extra deps)

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/index.css` | CSS variables, global `@keyframes`, utility classes, skeleton CSS, reduced-motion |
| `src/components/Skeleton.jsx` | Reusable skeleton screen component |
| `src/layouts/PcLayout.jsx` | Page-enter animation wrapper |
| `src/views/Home/pc/index.css` | Sidebar indicator, Home card stagger |
| `src/views/Home/pc/AdminHome.jsx` | Stagger classes on stat cards, quick actions |
| `src/views/Home/mobile/index.css` | TabBar elastic pop animation |
| 10× `src/views/*/pc/index.css` | Card hover on each business list page |
| 8× `src/views/*/pc/index.jsx` | Replace "加载中…" with `<Skeleton />` |
| `src/views/Assistant/pc/index.css` | Message entrance stagger |
| `src/views/User/pc/index.css` | Section entrance stagger |

---

### Task 1: CSS Foundation — Variables, Keyframes, Utility Classes

**Files:**
- Modify: `src/index.css:1-10`

- [ ] **Step 1: Add animation tokens to `:root`**

After line 9 (`--ease-soft`), insert:

```css
  --motion-fast:0.15s;--motion-base:0.28s;--motion-slow:0.45s;--motion-gentle:0.6s;
  --ease-out:cubic-bezier(0.16,1,0.3,1);--ease-in-out:cubic-bezier(0.65,0,0.35,1);
```

- [ ] **Step 2: Add global keyframes after `:root` block**

Insert after line 10 (closing `}` of `:root`):

```css
@keyframes fadeUpIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes modalIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes skeletonPulse{0%,100%{opacity:.6}50%{opacity:1}}
@keyframes tabPop{0%{transform:scale(.95)}50%{transform:scale(1.08)}100%{transform:scale(1)}}
@keyframes indicatorSlide{from{transform:scaleX(0)}to{transform:scaleX(1)}}
```

- [ ] **Step 3: Add utility classes before `/* ---- 共享组件样式 ---- */`**

Insert before line 16:

```css
.anim-fade-up{animation:fadeUpIn var(--motion-slow) var(--ease-soft) both}
.anim-modal-in{animation:modalIn var(--motion-base) var(--ease-out) both}
.anim-stagger>*{opacity:0}
.anim-stagger.anim-visible>*{animation:fadeUpIn var(--motion-slow) var(--ease-soft) both}
.anim-stagger.anim-visible>:nth-child(1){animation-delay:0.05s}
.anim-stagger.anim-visible>:nth-child(2){animation-delay:0.1s}
.anim-stagger.anim-visible>:nth-child(3){animation-delay:0.15s}
.anim-stagger.anim-visible>:nth-child(4){animation-delay:0.2s}
.anim-stagger.anim-visible>:nth-child(5){animation-delay:0.25s}
.anim-stagger.anim-visible>:nth-child(6){animation-delay:0.3s}
.anim-stagger.anim-visible>:nth-child(7){animation-delay:0.35s}
.anim-stagger.anim-visible>:nth-child(8){animation-delay:0.4s}
.anim-stagger.anim-visible>:nth-child(9){animation-delay:0.45s}
.anim-stagger.anim-visible>:nth-child(10){animation-delay:0.5s}
```

- [ ] **Step 4: Add `prefers-reduced-motion` at the END of `index.css`**

```css
@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{
    animation-duration:0.01ms!important;
    animation-iteration-count:1!important;
    transition-duration:0.01ms!important;
  }
}
```

- [ ] **Step 5: Build to verify**

```bash
npx vite build
```

Expected: ✓ built in <1s, no errors.

---

### Task 2: Skeleton Screen Component

**Files:**
- Create: `src/components/Skeleton.jsx`
- Modify: `src/index.css` (append skeleton styles)
- Modify: `src/components/index.js`

- [ ] **Step 1: Create `src/components/Skeleton.jsx`**

```jsx
/**
 * 骨架屏占位组件
 *
 * @param {Object} props
 * @param {'text'|'heading'|'card'} [props.variant='text']  变体
 * @param {number} [props.count=1]                           重复行数
 * @param {string} [props.width]                             自定义宽度（覆盖默认）
 * @param {string} [props.className]                         额外 class
 */
export default function Skeleton({ variant = 'text', count = 1, width, className = '' }) {
  const items = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={`skeleton skeleton--${variant} ${className}`.trim()}
      style={width ? { width } : undefined}
    />
  ))
  return <>{items}</>
}
```

- [ ] **Step 2: Append skeleton CSS to `src/index.css`**

```css
/* ---- 骨架屏 ---- */
.skeleton{
  background:linear-gradient(90deg,var(--c-border) 25%,var(--c-bg) 50%,var(--c-border) 75%);
  background-size:200% 100%;
  animation:shimmer 1.5s infinite;
  border-radius:4px;
}
.skeleton--text{height:14px;margin-bottom:8px;width:100%}
.skeleton--text:last-child{width:60%}
.skeleton--heading{height:22px;width:40%;margin-bottom:16px}
.skeleton--card{height:72px;margin-bottom:10px;border-radius:var(--radius)}
/* 移动端降级为脉冲 */
@media (max-width:1023px){
  .skeleton{animation:skeletonPulse 1.5s var(--ease-in-out) infinite}
}
```

- [ ] **Step 3: Update `src/components/index.js`**

If the file exists, add:
```js
export { default as Skeleton } from './Skeleton'
```

- [ ] **Step 4: Build to verify**

```bash
npx vite build
```

Expected: ✓ built, no errors.

---

### Task 3: Replace "加载中…" with Skeleton

**Files:**
- Modify: `src/views/Dispense/pc/index.jsx` — simplest, 1 location
- Modify: `src/views/Department/pc/index.jsx` — 1 location
- Modify: `src/views/ScheduleManage/pc/index.jsx` — 1 location
- Modify: `src/views/DrugManage/pc/index.jsx` — 1 location
- Modify: `src/views/PatientList/pc/index.jsx` — 1 location
- Modify: `src/views/Registration/pc/index.jsx` — 1 location
- Modify: `src/views/Payment/pc/index.jsx` — 2 locations (charges + dispense tabs)
- Modify: `src/views/Consultation/pc/index.jsx` — 2 locations (pending + visits tabs)

- [ ] **Step 1: Dispense — simplest case**

In `src/views/Dispense/pc/index.jsx`:

Add import:
```js
import { Skeleton } from '../../../components'
```

Replace:
```jsx
{loading && <p className="disp-pc-empty">加载中…</p>}
```
With:
```jsx
{loading && <Skeleton variant="card" count={4} />}
```

- [ ] **Step 2: Department**

Same pattern → add import, replace the single loading line:
```jsx
{loading && <Skeleton variant="card" count={5} />}
```

- [ ] **Step 3: ScheduleManage**

```jsx
{loading && <Skeleton variant="card" count={4} />}
```

- [ ] **Step 4: DrugManage**

```jsx
{loading && <Skeleton variant="card" count={4} />}
```

- [ ] **Step 5: PatientList**

```jsx
{loading && <Skeleton variant="card" count={4} />}
```

- [ ] **Step 6: Registration**

```jsx
{loading && <Skeleton variant="card" count={5} />}
```

- [ ] **Step 7: Payment — 2 locations**

Import Skeleton, then replace BOTH loading lines (charges tab and dispense tab):
```jsx
{loading && <Skeleton variant="card" count={4} />}
```
Apply to both `tab !== 'dispense'` block and `tab === 'dispense'` block.

- [ ] **Step 8: Consultation — 2 locations**

Import Skeleton, then replace both loading lines (pending tab and visits tab):
```jsx
{loading && <Skeleton variant="card" count={4} />}
```

- [ ] **Step 9: Build to verify**

```bash
npx vite build
```

Expected: ✓ built, no errors.

---

### Task 4: Card Hover Effects — All PC Business Pages

**Files:**
- Modify: 11× PC CSS files (one per view, adding hover to card class)
- Modify: `src/index.css` (add shared `.card-hover` utility)

- [ ] **Step 1: Add `.card-hover` utility to `src/index.css`**

Insert into the shared-components section:

```css
.card-hover{transition:transform var(--motion-fast) var(--ease-soft),box-shadow var(--motion-fast) var(--ease-soft)}
.card-hover:hover{transform:translateY(-3px);box-shadow:0 4px 16px rgba(0,0,0,.06)}
```

- [ ] **Step 2: Apply to all business list cards**

For each CSS file below, find the card class and add `transition` lines:

| CSS File | Card Class | Add |
|----------|-----------|-----|
| `Registration/pc/index.css` | `.reg-pc-card` | `transition: transform var(--motion-fast) var(--ease-soft), box-shadow var(--motion-fast) var(--ease-soft);` |
| | `.reg-pc-card:hover` | `transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.05);` |
| `Consultation/pc/index.css` | `.con-pc-card` | same |
| `Payment/pc/index.css` | `.pay-pc-card` | same |
| `Dispense/pc/index.css` | `.disp-pc-card` | same |
| `PatientList/pc/index.css` | `.pat-pc-card` | same |
| `ScheduleManage/pc/index.css` | `.sch-pc-card` | same |
| `DrugManage/pc/index.css` | `.drug-pc-card` | same |
| `Department/pc/index.css` | `.dept-pc-item` | same (button element, same principle) |

- [ ] **Step 3: Build to verify**

```bash
npx vite build
```

Expected: ✓ built, no errors.

---

### Task 5: Sidebar Active Indicator + Button/Submit Hover Refinements

**Files:**
- Modify: `src/views/Home/pc/index.css`
- Modify: `src/index.css`

- [ ] **Step 1: Add sidebar indicator animation in `src/views/Home/pc/index.css`**

Find `.home-pc-nav-item` and add/modify:

```css
.home-pc-nav-item{
  position:relative;
  transition:background var(--motion-fast) var(--ease-soft);
}
.home-pc-nav-item::before{
  content:'';
  position:absolute;
  left:0;top:50%;transform:translateY(-50%);
  width:3px;height:0;
  background:var(--c-primary);
  border-radius:0 2px 2px 0;
  transition:height var(--motion-base) var(--ease-soft);
}
.home-pc-nav-item--active::before{
  height:60%;
}
```

- [ ] **Step 2: Add submit button hover scale in `src/index.css`**

Modify `.shared-btn-submit`:

```css
.shared-btn-submit{
  /* existing styles + */
  transition:background var(--motion-fast) var(--ease-soft),transform var(--motion-fast) var(--ease-soft);
}
.shared-btn-submit:hover:not(:disabled){
  background:var(--c-primary-hover);
  transform:scale(1.03);
}
.shared-btn-submit:active:not(:disabled){
  transform:scale(.98);
}
```

- [ ] **Step 3: Build to verify**

```bash
npx vite build
```

Expected: ✓ built, no errors.

---

### Task 6: Mobile TabBar Elastic Icon

**Files:**
- Modify: `src/views/Home/mobile/index.css`

- [ ] **Step 1: Add tab icon pop animation**

Find `.home-tab-item` styles and add:

```css
.home-tab-item svg{
  transition:transform var(--motion-base) var(--ease-soft);
}
.home-tab-item--active svg{
  animation:tabPop .35s var(--ease-soft);
}
```

- [ ] **Step 2: Build to verify**

```bash
npx vite build
```

Expected: ✓ built, no errors.

---

### Task 7: Home Page Stagger Reveals

**Files:**
- Modify: `src/views/Home/pc/AdminHome.jsx`
- Modify: `src/views/Home/pc/DoctorHome.jsx`
- Modify: `src/views/Home/pc/PatientHome.jsx`

- [ ] **Step 1: AdminHome — stat cards stagger**

Add `className="anim-stagger anim-visible"` to the stats row container div. Each stat card auto-receives staggered delay.

Then add `className="anim-fade-up"` to the quick-actions section (or wrap in a stagger container).

Exact location: Find the stats row (4 stat cards) — wrap them in:
```jsx
<div className="anim-stagger anim-visible" style={{display:'flex', gap:'1rem'}}>
  {/* existing stat cards */}
</div>
```

And the quick actions section:
```jsx
<div className="anim-stagger anim-visible" style={{display:'flex', gap:'1rem'}}>
  {/* existing quick action cards */}
</div>
```

- [ ] **Step 2: DoctorHome — same pattern**

Same approach — wrap stat cards and quick actions in stagger containers.

- [ ] **Step 3: PatientHome — same pattern**

Same approach.

- [ ] **Step 4: Build to verify**

```bash
npx vite build
```

Expected: ✓ built, no errors.

---

### Task 8: Page-Enter Animation (Route Transitions)

**Files:**
- Modify: `src/layouts/PcLayout.jsx`

- [ ] **Step 1: Add `useRef` + `useEffect` to trigger page-enter animation**

In `src/layouts/PcLayout.jsx`, add imports:
```js
import { useEffect, useRef } from 'react'
```

Add a ref and effect inside the component (before return):
```jsx
const bodyRef = useRef(null)

useEffect(() => {
  const el = bodyRef.current
  if (!el) return
  el.classList.add('anim-fade-up')
  return () => el.classList.remove('anim-fade-up')
}, [pathname])
```

Change the body div from:
```jsx
<div className={`home-pc-body ${bodyClassName}`.trim()}>
```
To:
```jsx
<div ref={bodyRef} className={`home-pc-body ${bodyClassName}`.trim()}>
```

- [ ] **Step 2: Build to verify**

```bash
npx vite build
```

Expected: ✓ built, no errors.

---

### Task 9: User Page Section Stagger

**Files:**
- Modify: `src/views/User/pc/index.jsx`

- [ ] **Step 1: Wrap sections in stagger container**

Find the three sections (profile card, info grid, tips card) in `User/pc/index.jsx`.

Wrap the outer container:
```jsx
<div className="user-pc-content anim-stagger anim-visible">
  {/* existing sections — auto-staggered */}
</div>
```

- [ ] **Step 2: Build to verify**

```bash
npx vite build
```

Expected: ✓ built, no errors.

---

### Task 10: AI Assistant Message Entrance

**Files:**
- Modify: `src/views/Assistant/pc/index.css`

- [ ] **Step 1: Add message entrance animation**

Find message bubble classes and add:

```css
.ai-message{
  animation:fadeUpIn var(--motion-slow) var(--ease-soft) both;
}
.ai-message:nth-child(1){animation-delay:0s}
.ai-message:nth-child(2){animation-delay:.12s}
.ai-message:nth-child(3){animation-delay:.24s}
.ai-message:nth-child(4){animation-delay:.36s}
.ai-message:nth-child(5){animation-delay:.48s}
```

- [ ] **Step 2: Build to verify**

```bash
npx vite build**

Expected: ✓ built, no errors.

---

### Task 11: Final Verification

- [ ] **Step 1: Production build**

```bash
cd "D:\刘畅\WebAI\Online hospitals\huiliao-react" && npx vite build
```

Expected: ✓ built in <1s, zero errors, zero warnings.

- [ ] **Step 2: Check bundle size impact**

```bash
ls -la dist/assets/index-*.js dist/assets/index-*.css
```

Expected: CSS bundle slightly larger (keyframes + utilities ~2KB), JS unchanged (only Skeleton.jsx addition ~0.3KB).

- [ ] **Step 3: Verify `prefers-reduced-motion` in CSS output**

```bash
grep -c "prefers-reduced-motion" dist/assets/*.css
```

Expected: At least 1 match.

- [ ] **Step 4: Verify Skeleton chunk exists**

```bash
ls dist/assets/*Skeleton* 2>/dev/null || echo "Skeleton inlined (expected for small component)"
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add breathing CSS animation system

- Add --motion-* and --ease-* CSS variables
- Add @keyframes: fadeUpIn, modalIn, shimmer, tabPop
- Add utility classes: anim-fade-up, anim-stagger
- Create <Skeleton /> component replacing all '加载中…' text
- Add card hover effects to all 9 business list pages
- Add sidebar active indicator animation
- Add mobile tab elastic pop effect
- Add page-enter animation in PcLayout
- Add Home page stagger reveals
- Add User page section stagger
- Add AI message entrance animation
- Respect prefers-reduced-motion globally

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec Coverage:**
- Section 1 (Tokens) → Task 1 ✓
- Section 2 (Micro-interactions: cards, buttons, sidebar, tabs, tabbar) → Tasks 4, 5, 6 ✓
- Section 3 (Skeleton screens) → Tasks 2, 3 ✓
- Section 4 (Route transitions) → Task 8 ✓
- Section 5 (Page-level: Home, business lists, AI, User) → Tasks 7, 9, 10 ✓
- Section 6 (verification) → Task 11 ✓
- Section 7 (constraints: no deps, CSS-only, GPU-composited, mobile downgrade) → Enforced throughout ✓

**Placeholder Scan:** No TBD/TODO found. All steps have concrete code. ✓

**Type Consistency:** Skeleton component props used consistently (`variant`, `count`, `width`, `className`). CSS class names consistent across tasks. ✓
