# 患者端双模式 Agent 互联网医院 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将前端收敛为患者专属的双模式互联网医院：传统自助服务与以 AI 为中心的移动优先“随身诊室”。

**Architecture:** 登录后进入模式选择页；传统模式复用现有患者页面，新模式采用拆分后的 Agent 工作台。模式偏好、会话持久化和任务白名单使用独立纯函数；组件只消费这些状态与现有患者 API。医生前端路由和页面删除，后端不改动。

**Tech Stack:** React 19、React Router 7、Vite、原生 CSS、Node 内置 node:test。

---

## Execution record (2026-07-19)

- [x] 建立患者模式、会话与任务白名单测试。
- [x] 新增模式选择页、患者守卫及传统/新版路由。
- [x] 拆分 Agent 状态、对话和上下文加载逻辑。
- [x] 实现移动优先 Agent 工作台、挂号/缴费/记录任务面板。
- [x] 加入传统模式切换，并删除五个医生端 React 文件。
- [x] 通过全量 lint、Vite 构建、8 个 Node 测试与医生端引用检查。
- [ ] 在真实患者账号下完成 360px、390px、768px、1024px、1440px 的浏览器交互验收。

## 文件结构

- Create: React/src/features/experience/mode.js — 模式常量、持久化与患者门户判断。
- Create: React/src/features/assistant/session.js — 会话的读取、规范化、创建与安全存储。
- Create: React/src/features/assistant/task.js — 白名单任务解析与安全降级。
- Create: React/src/views/ModeSelect/index.jsx — 登录后的体验选择页。
- Create: React/src/views/Assistant/components.jsx — Agent 工作台展示组件。
- Create: React/src/views/Assistant/useAssistant.js — 对话、上下文和任务状态 Hook。
- Create: React/test/experience.test.js — 模式、会话和任务纯函数测试。
- Modify: React/src/router/index.jsx、React/src/router/guards.jsx、React/src/utils/portal.js、React/src/views/Login/index.jsx。
- Modify: React/src/views/Assistant/index.jsx、React/src/views/Home/index.jsx、React/src/views/Home/pc/PcLayout.jsx、React/src/views/Home/mobile/MobileTabbar.jsx、React/src/index.css、React/src/views/shared/views.css。
- Delete: React/src/views/doctor/Home/index.jsx、React/src/views/doctor/Queue/index.jsx、React/src/views/doctor/Consultation/index.jsx、React/src/views/doctor/layout/DoctorPcLayout.jsx、React/src/views/doctor/layout/DoctorMobileTabbar.jsx。

### Task 1: 为体验模式、会话和任务边界建立测试

**Files:**

- Create: React/test/experience.test.js
- Create: React/src/features/experience/mode.js
- Create: React/src/features/assistant/session.js
- Create: React/src/features/assistant/task.js

- [ ] **Step 1: 写失败测试**

~~~js
import test from 'node:test'
import assert from 'node:assert/strict'
import { MODE_AGENT, MODE_CLASSIC, normalizeMode } from '../src/features/experience/mode.js'
import { normalizeSessions } from '../src/features/assistant/session.js'
import { toTask } from '../src/features/assistant/task.js'

test('normalizeMode only accepts the two patient experiences', () => {
  assert.equal(normalizeMode('agent'), MODE_AGENT)
  assert.equal(normalizeMode('classic'), MODE_CLASSIC)
  assert.equal(normalizeMode('doctor'), MODE_AGENT)
})

test('normalizeSessions recovers a safe default after corrupt storage', () => {
  assert.deepEqual(normalizeSessions('{broken json'), [{ id: 'default', title: '新的问诊', messages: [] }])
})

test('toTask only exposes approved patient task types', () => {
  assert.deepEqual(toTask({ type: 'registration', title: '预约挂号' }), { type: 'registration', title: '预约挂号' })
  assert.equal(toTask({ type: 'prescription' }), null)
})
~~~

- [ ] **Step 2: 运行 RED**

Run: node --test test/experience.test.js  
Expected: FAIL，因为模块尚不存在。

- [ ] **Step 3: 实现最小纯函数**

~~~js
export const MODE_AGENT = 'agent'
export const MODE_CLASSIC = 'classic'
export const MODE_STORAGE_KEY = 'wenrun_patient_mode'

export function normalizeMode(value) {
  return value === MODE_CLASSIC ? MODE_CLASSIC : MODE_AGENT
}
~~~

实现 normalizeSessions：捕获 JSON 解析失败、过滤无字符串 id 的会话、结果为空时返回默认会话。实现 toTask：只接受 registration、payment、records，保留其安全标识字段。

- [ ] **Step 4: 运行 GREEN**

Run: node --test test/experience.test.js  
Expected: PASS，3 个测试通过。

- [ ] **Step 5: 提交**

~~~bash
git add React/test/experience.test.js React/src/features/experience/mode.js React/src/features/assistant/session.js React/src/features/assistant/task.js
git commit -m "feat: add patient experience state helpers"
~~~

### Task 2: 新建患者模式入口并删除医生路由

**Files:**

- Modify: React/src/utils/portal.js
- Modify: React/src/router/guards.jsx
- Modify: React/src/router/index.jsx
- Modify: React/src/views/Login/index.jsx
- Create: React/src/views/ModeSelect/index.jsx
- Test: React/test/experience.test.js

- [ ] **Step 1: 添加入口规则失败测试**

~~~js
import { patientHomePath, isPatientPortal } from '../src/features/experience/mode.js'

test('patient entry always starts with the experience selector', () => {
  assert.equal(patientHomePath(), '/mode-select')
  assert.equal(isPatientPortal({ portalType: 'patient' }), true)
  assert.equal(isPatientPortal({ portalType: 'doctor' }), false)
})
~~~

- [ ] **Step 2: 运行 RED**

Run: node --test test/experience.test.js  
Expected: FAIL，patientHomePath 与 isPatientPortal 尚未导出。

- [ ] **Step 3: 实现路由和页面**

在 mode.js 导出 patientHomePath 与 isPatientPortal；在 guards.jsx 为非患者账号显示“当前版本仅提供患者端服务”的受控拒绝页与退出按钮。GuestOnly、登录成功和注册成功全部跳转 /mode-select。

在 router/index.jsx 添加：

~~~jsx
{ path: '/mode-select', element: <ModeSelect /> },
{ path: '/assistant', element: <Assistant /> },
{ path: '/home', element: <Home /> },
~~~

移除所有 /doctor 路由和医生组件导入，保留现有患者业务路由。ModeSelect 用两张卡保存 agent 或 classic 偏好并跳转；上次偏好仅作高亮，不自动跳转。

- [ ] **Step 4: 运行 GREEN 和构建**

Run: node --test test/experience.test.js && npm run build  
Expected: 测试通过，构建成功。

- [ ] **Step 5: 提交**

~~~bash
git add React/src/features/experience/mode.js React/src/router React/src/utils/portal.js React/src/views/Login/index.jsx React/src/views/ModeSelect
git commit -m "feat: add patient experience selector"
~~~

### Task 3: 拆分 Agent 状态与 SSE 任务事件

**Files:**

- Modify: React/src/api/modules/ai.js
- Create: React/src/views/Assistant/useAssistant.js
- Modify: React/src/views/Assistant/index.jsx
- Modify: React/test/ai.test.js
- Modify: React/test/experience.test.js

- [ ] **Step 1: 写 SSE 任务事件失败测试**

~~~js
import { taskFromChatEvent } from '../src/api/modules/ai.js'

test('taskFromChatEvent ignores unknown and clinician-only events', () => {
  assert.equal(taskFromChatEvent({ type: 'tool', task: { type: 'prescription' } }), null)
  assert.deepEqual(taskFromChatEvent({ type: 'tool', task: { type: 'payment', chargeId: 8 } }), { type: 'payment', chargeId: 8 })
})
~~~

- [ ] **Step 2: 运行 RED**

Run: node --test test/ai.test.js test/experience.test.js  
Expected: FAIL，taskFromChatEvent 未导出。

- [ ] **Step 3: 实现 Hook**

在 ai.js 中实现 taskFromChatEvent，复用 toTask 白名单。useAssistant 负责会话持久化、Promise.allSettled 加载预约/费用/就诊记录、SSE 发送、AbortController 停止生成、上下文刷新、任务打开和关闭。Assistant/index.jsx 只组装 Hook 和展示组件。

- [ ] **Step 4: 运行 GREEN**

Run: node --test test/ai.test.js test/experience.test.js  
Expected: 全部 PASS。

- [ ] **Step 5: 提交**

~~~bash
git add React/src/api/modules/ai.js React/src/views/Assistant/useAssistant.js React/src/views/Assistant/index.jsx React/test/ai.test.js React/test/experience.test.js
git commit -m "refactor: split patient assistant state"
~~~

### Task 4: 实现手机优先的随身诊室和任务面板

**Files:**

- Create: React/src/views/Assistant/components.jsx
- Modify: React/src/views/Assistant/index.jsx
- Modify: React/src/views/shared/views.css
- Modify: React/src/index.css
- Modify: React/test/experience.test.js

- [ ] **Step 1: 扩展任务保留字段失败测试**

~~~js
test('toTask keeps payment identifiers for the task sheet', () => {
  assert.deepEqual(toTask({ type: 'payment', chargeId: 12, title: '待缴费用' }), {
    type: 'payment', chargeId: 12, title: '待缴费用',
  })
})
~~~

- [ ] **Step 2: 运行 RED**

Run: node --test test/experience.test.js  
Expected: FAIL，toTask 未保留 chargeId。

- [ ] **Step 3: 实现组件与交互**

components.jsx 导出 AssistantHeader、ConversationHistory、ConversationThread、ContextSummary、ChatComposer、TaskSheet、TaskResultCard。视觉使用深海青 #102E3B、护理绿 #137D75、暖米白 #F6F2E8、琥珀 #DFA548。

390px 使用单列、安全区底部输入器与 44px 以上触控目标；768px 展开上下文；1180px 展开历史、对话、上下文三栏。添加 prefers-reduced-motion 降级。

TaskSheet 的 registration 任务加载 listSchedules，使用 createRegistration({ patientId, scheduleId }) 最终提交；payment 任务从上下文展示待缴账单并跳转现有 /payment/:id；records 任务跳转 /registration 或 /user。所有未知任务显示安全降级卡，不生成任意表单。

- [ ] **Step 4: 运行 GREEN、lint 与构建**

Run: node --test test/experience.test.js && npm run lint && npm run build  
Expected: 全部通过。

- [ ] **Step 5: 手动尺寸验证**

Run: npm run dev -- --host 127.0.0.1  
Expected: 360px、390px、768px、1024px、1440px 无水平滚动；Enter 发送、Shift+Enter 换行；任务面板可打开、关闭、返回。

- [ ] **Step 6: 提交**

~~~bash
git add React/src/views/Assistant React/src/views/shared/views.css React/src/index.css React/test/experience.test.js
git commit -m "feat: build mobile-first patient agent workspace"
~~~

### Task 5: 完成传统模式切换并移除医生文件

**Files:**

- Modify: React/src/views/Home/index.jsx
- Modify: React/src/views/Home/pc/PcLayout.jsx
- Modify: React/src/views/Home/mobile/MobileTabbar.jsx
- Delete: React/src/views/doctor/Home/index.jsx
- Delete: React/src/views/doctor/Queue/index.jsx
- Delete: React/src/views/doctor/Consultation/index.jsx
- Delete: React/src/views/doctor/layout/DoctorPcLayout.jsx
- Delete: React/src/views/doctor/layout/DoctorMobileTabbar.jsx

- [ ] **Step 1: 写模式持久化失败测试**

~~~js
import { readMode, writeMode, MODE_STORAGE_KEY } from '../src/features/experience/mode.js'

test('mode preference round-trips through storage', () => {
  const storage = new Map()
  const local = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }
  writeMode('classic', local)
  assert.equal(local.getItem(MODE_STORAGE_KEY), 'classic')
  assert.equal(readMode(local), 'classic')
})
~~~

- [ ] **Step 2: 运行 RED**

Run: node --test test/experience.test.js  
Expected: FAIL，readMode 与 writeMode 未实现。

- [ ] **Step 3: 实现切换和精确删除**

传统首页、PC 侧栏和移动底栏加入“体验 AI 新版”，写入 agent 后去 /assistant。新版头部与降级卡写入 classic 后去 /home。

仅删除本任务列出的五个 React 医生端文件；不得删除 WenRun、AI 或后端接口。删除后运行：

~~~bash
rg -n "path: '/doctor|DoctorPcLayout|DoctorMobileTabbar" React/src
~~~

Expected: 无匹配。

- [ ] **Step 4: 运行 GREEN、完整验证**

Run: node --test test/ai.test.js test/experience.test.js && npm run lint && npm run build  
Expected: 所有测试和构建均通过。

- [ ] **Step 5: 提交**

~~~bash
git add React/src React/test
git commit -m "feat: keep patient modes and remove doctor frontend"
~~~

### Task 6: 最终验收和文档状态

**Files:**

- Modify: docs/superpowers/plans/2026-07-19-patient-dual-mode-agent-hospital.md

- [ ] **Step 1: 执行最终自动验证**

Run: npm run lint && npm run build && node --test test/ai.test.js test/experience.test.js  
Expected: 三个命令均以 exit code 0 结束。

- [ ] **Step 2: 审查实现范围**

Run: git diff --check HEAD~1..HEAD && rg -n "path: '/doctor|DoctorPcLayout|DoctorMobileTabbar" React/src  
Expected: diff 无空白错误；医生端路由与布局无匹配。

- [ ] **Step 3: 勾选实际完成步骤并提交**

~~~bash
git add docs/superpowers/plans/2026-07-19-patient-dual-mode-agent-hospital.md
git commit -m "docs: record patient agent implementation verification"
~~~
