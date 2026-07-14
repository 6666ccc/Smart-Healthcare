# WenRun（温润）—— API 接口按角色分工

> 基于 `API.md` v2.0（2026-06-09）整理
> 三端划分：**患者端** / **医生端** / **工作人员端**（管理端，含管理员、收费员、药师）

---

## 目录

1. [角色与门户说明](#角色与门户说明)
2. [公共接口（所有端通用）](#公共接口所有端通用)
3. [患者端](#患者端-patient)
4. [医生端](#医生端-doctor)
5. [工作人员端](#工作人员端-admin)
6. [接口-角色对照总表](#接口-角色对照总表)

---

## 角色与门户说明

| 门户 | portalType | 角色编码 | 说明 |
|------|------------|----------|------|
| 患者端 | `patient` | `patient` | 患者自助操作：挂号、查看处方、支付、AI 咨询等 |
| 医生端 | `doctor` | `doctor` | 医生诊疗操作：接诊、开方、开检查、录入诊断等 |
| 工作人员端 | `admin` | `admin` / `cashier` / `pharmacist` | 院内管理：建档、排班、收费、发药、库存、统计等 |

---

## 公共接口（所有端通用）

无需鉴权或所有角色均可使用的接口。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 服务存活检查（无需鉴权） |
| POST | `/api/auth/login` | 用户登录（无需鉴权） |
| POST | `/api/auth/logout` | 退出登录 |

---

## 患者端 (patient)

### 🔐 认证
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 登录 |
| POST | `/api/auth/logout` | 退出 |

### 👤 个人档案
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/patients/{id}` | 查看自己的患者档案 |
| PUT | `/api/patients/{id}` | 更新自己的档案信息 |
| POST | `/api/patients` | 自助注册建档 |

### 🏥 科室 & 医生
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/depts` | 查看科室列表 |
| GET | `/api/depts/{id}` | 查看科室详情 |
| GET | `/api/staff` | 查看医生列表 |
| GET | `/api/staff/{id}` | 查看医生详情 |

### 📅 排班 & 挂号
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/schedules` | 查看排班信息（选医生/时段） |
| GET | `/api/schedules/{id}` | 查看排班详情 |
| POST | `/api/registrations` | 自助挂号 |
| GET | `/api/registrations` | 查看自己的挂号记录 |
| POST | `/api/registrations/{id}/cancel` | 取消挂号（退号） |

### 🩺 就诊记录
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/visits/{id}` | 查看自己的就诊详情（含诊断结果） |

### 💊 处方
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/prescriptions` | 查看自己的处方（按就诊单） |
| GET | `/api/prescriptions/{id}` | 查看处方详情 |

### 🔬 检查
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/medical-items` | 查看医疗项目列表（检查/检验） |
| GET | `/api/exam-requests` | 查看自己的检查申请 |

### 💰 收费 & 支付
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/charges` | 查看自己的收费单 |
| GET | `/api/charges/{id}` | 查看收费单详情 |
| POST | `/api/charges/{id}/pay` | 自助支付 |

### 🤖 AI 咨询（仅患者端）
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/ai/chat` | 发送消息给 AI 并获取回复 |

> **注意**：AI 对话接口目前 **仅对患者端开放**。

---

## 医生端 (doctor)

### 🔐 认证
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 登录 |
| POST | `/api/auth/logout` | 退出 |

### 👤 患者查询
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/patients` | 查询患者列表（按姓名/手机/身份证） |
| GET | `/api/patients/{id}` | 查看患者详情（含过敏史） |

### 🏥 科室 & 排班
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/depts` | 查看科室列表 |
| GET | `/api/depts/{id}` | 查看科室详情 |
| GET | `/api/staff` | 查看医护人员列表 |
| GET | `/api/staff/{id}` | 查看医护人员详情 |
| GET | `/api/schedules` | 查看排班（自己的出诊安排） |
| GET | `/api/schedules/{id}` | 查看排班详情 |

### 📋 挂号 & 待诊
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/registrations` | 查看挂号列表 |
| GET | `/api/registrations/pending` | 查看待诊患者列表 |

### 🩺 接诊（核心诊疗流程）
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/visits/start/{registrationId}` | 开始接诊（将挂号→就诊） |
| PUT | `/api/visits/{id}` | 录入主诉/诊断/完成接诊 |
| GET | `/api/visits` | 查看自己的就诊记录列表 |
| GET | `/api/visits/{id}` | 查看就诊详情 |

### 💊 处方管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/drugs` | 查询药品列表（开方时选药） |
| GET | `/api/drugs/{id}` | 查看药品详情 |
| POST | `/api/prescriptions` | 开立处方 |
| GET | `/api/prescriptions` | 查询处方（按就诊单） |
| GET | `/api/prescriptions/{id}` | 查看处方详情 |
| POST | `/api/prescriptions/{id}/cancel` | 作废处方（仅待缴费状态） |

### 🔬 检查申请
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/medical-items` | 查看医疗项目列表（开检查时选项目） |
| GET | `/api/medical-items/{id}` | 查看医疗项目详情 |
| POST | `/api/exam-requests` | 开立检查申请 |
| GET | `/api/exam-requests` | 查询检查申请（按就诊单） |

### 💰 收费查看
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/charges` | 查看收费单列表 |
| GET | `/api/charges/{id}` | 查看收费单详情 |

---

## 工作人员端 (admin)

> 含：管理员（admin）、收费员（cashier）、药师（pharmacist）

### 🔐 认证
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 登录 |
| POST | `/api/auth/logout` | 退出 |

---

### 👤 管理员 (admin) — 基础数据维护

#### 患者管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/patients` | 查询患者列表 |
| GET | `/api/patients/{id}` | 查看患者详情 |
| POST | `/api/patients` | 新建患者档案（现场建档） |
| PUT | `/api/patients/{id}` | 更新患者信息 |

#### 科室管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/depts` | 科室列表 |
| GET | `/api/depts/{id}` | 科室详情 |
| POST | `/api/depts` | 新增科室 |
| PUT | `/api/depts/{id}` | 更新科室 |

#### 员工管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/staff` | 员工列表 |
| GET | `/api/staff/{id}` | 员工详情 |
| POST | `/api/staff` | 新增员工（医护人员） |
| PUT | `/api/staff/{id}` | 更新员工信息 |

#### 药品管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/drugs` | 药品列表 |
| GET | `/api/drugs/{id}` | 药品详情 |
| POST | `/api/drugs` | 新增药品 |
| PUT | `/api/drugs/{id}` | 更新药品 |

#### 医疗项目管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/medical-items` | 医疗项目列表 |
| GET | `/api/medical-items/{id}` | 医疗项目详情 |
| POST | `/api/medical-items` | 新增医疗项目 |
| PUT | `/api/medical-items/{id}` | 更新医疗项目 |

#### 排班管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/schedules` | 排班列表 |
| GET | `/api/schedules/{id}` | 排班详情 |
| POST | `/api/schedules` | 新增排班 |
| PUT | `/api/schedules/{id}` | 更新排班 |

#### 挂号管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/registrations` | 挂号列表（全部） |
| GET | `/api/registrations/pending` | 待诊挂号列表 |
| POST | `/api/registrations` | 现场挂号 |
| POST | `/api/registrations/{id}/cancel` | 退号 |

#### 就诊查看
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/visits` | 就诊列表（全部） |
| GET | `/api/visits/{id}` | 就诊详情 |

#### 处方查看
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/prescriptions` | 处方列表 |
| GET | `/api/prescriptions/{id}` | 处方详情 |

#### 检查查看
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/exam-requests` | 检查申请列表 |

#### 仪表盘
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/dashboard` | 今日运营统计摘要 |

---

### 💰 收费员 (cashier)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/registrations/pending` | 查看待诊挂号列表 |
| GET | `/api/visits` | 查看就诊列表 |
| POST | `/api/registrations` | 现场挂号 |
| POST | `/api/registrations/{id}/cancel` | 退号 |
| GET | `/api/charges` | 收费单列表 |
| GET | `/api/charges/pending` | 待收费列表 |
| GET | `/api/charges/{id}` | 收费单详情 |
| POST | `/api/charges/from-visit/{visitId}` | 根据就诊单生成收费单（汇总待收费项目） |
| POST | `/api/charges/{id}/pay` | 收费确认（支付） |

---

### 💊 药师 (pharmacist)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/drugs` | 药品列表 |
| GET | `/api/drugs/{id}` | 药品详情 |
| GET | `/api/drug-stocks` | 库存列表 |
| GET | `/api/drug-stocks?lowStockOnly=true` | 查看低库存预警 |
| GET | `/api/prescriptions/pending-dispense` | 待发药处方列表 |
| GET | `/api/prescriptions/{id}` | 处方详情 |
| POST | `/api/dispense/{prescriptionId}` | 按处方发药 |

---

## 接口-角色对照总表

| # | 方法 | 路径 | 患者端 | 医生端 | 工作人员端 | 备注 |
|---|------|------|:---:|:---:|:---:|------|
| 1 | GET | `/api/health` | ✅ | ✅ | ✅ | 公共，无需鉴权 |
| 2 | POST | `/api/auth/login` | ✅ | ✅ | ✅ | 公共，无需鉴权 |
| 3 | POST | `/api/auth/logout` | ✅ | ✅ | ✅ | 公共 |
| 4 | GET | `/api/patients` | — | ✅ | ✅ | 查询患者列表 |
| 5 | GET | `/api/patients/{id}` | ✅ | ✅ | ✅ | 患者仅看自己 |
| 6 | POST | `/api/patients` | ✅ | — | ✅ | 自助注册/现场建档 |
| 7 | PUT | `/api/patients/{id}` | ✅ | — | ✅ | 患者仅改自己 |
| 8 | GET | `/api/depts` | ✅ | ✅ | ✅ | 查看科室列表 |
| 9 | GET | `/api/depts/{id}` | ✅ | ✅ | ✅ | 查看科室详情 |
| 10 | POST | `/api/depts` | — | — | ✅ | 新增科室 |
| 11 | PUT | `/api/depts/{id}` | — | — | ✅ | 更新科室 |
| 12 | GET | `/api/staff` | ✅ | ✅ | ✅ | 查看医生/员工列表 |
| 13 | GET | `/api/staff/{id}` | ✅ | ✅ | ✅ | 查看员工详情 |
| 14 | POST | `/api/staff` | — | — | ✅ | 新增员工 |
| 15 | PUT | `/api/staff/{id}` | — | — | ✅ | 更新员工 |
| 16 | GET | `/api/drugs` | — | ✅ | ✅ | 医生开方选药/药师查看 |
| 17 | GET | `/api/drugs/{id}` | — | ✅ | ✅ | 药品详情 |
| 18 | POST | `/api/drugs` | — | — | ✅ | 新增药品 |
| 19 | PUT | `/api/drugs/{id}` | — | — | ✅ | 更新药品 |
| 20 | GET | `/api/drug-stocks` | — | — | ✅ | 库存查询（药师） |
| 21 | GET | `/api/medical-items` | ✅ | ✅ | ✅ | 查看医疗项目 |
| 22 | GET | `/api/medical-items/{id}` | ✅ | ✅ | ✅ | 项目详情 |
| 23 | POST | `/api/medical-items` | — | — | ✅ | 新增医疗项目 |
| 24 | PUT | `/api/medical-items/{id}` | — | — | ✅ | 更新医疗项目 |
| 25 | GET | `/api/schedules` | ✅ | ✅ | ✅ | 查看排班 |
| 26 | GET | `/api/schedules/{id}` | ✅ | ✅ | ✅ | 排班详情 |
| 27 | POST | `/api/schedules` | — | — | ✅ | 新增排班 |
| 28 | PUT | `/api/schedules/{id}` | — | — | ✅ | 更新排班 |
| 29 | GET | `/api/registrations` | ✅ | ✅ | ✅ | 挂号列表 |
| 30 | GET | `/api/registrations/pending` | — | ✅ | ✅ | 待诊列表 |
| 31 | POST | `/api/registrations` | ✅ | — | ✅ | 挂号（自助/现场） |
| 32 | POST | `/api/registrations/{id}/cancel` | ✅ | — | ✅ | 退号 |
| 33 | GET | `/api/visits` | — | ✅ | ✅ | 就诊列表 |
| 34 | GET | `/api/visits/{id}` | ✅ | ✅ | ✅ | 就诊详情 |
| 35 | POST | `/api/visits/start/{registrationId}` | — | ✅ | — | 开始接诊（医生专属） |
| 36 | PUT | `/api/visits/{id}` | — | ✅ | — | 录入诊断（医生专属） |
| 37 | GET | `/api/prescriptions` | ✅ | ✅ | ✅ | 处方列表 |
| 38 | GET | `/api/prescriptions/pending-dispense` | — | — | ✅ | 待发药（药师） |
| 39 | GET | `/api/prescriptions/{id}` | ✅ | ✅ | ✅ | 处方详情 |
| 40 | POST | `/api/prescriptions` | — | ✅ | — | 开立处方（医生专属） |
| 41 | POST | `/api/prescriptions/{id}/cancel` | — | ✅ | — | 作废处方（医生专属） |
| 42 | GET | `/api/exam-requests` | ✅ | ✅ | ✅ | 检查申请列表 |
| 43 | POST | `/api/exam-requests` | — | ✅ | — | 开立检查（医生专属） |
| 44 | GET | `/api/charges` | ✅ | ✅ | ✅ | 收费单列表 |
| 45 | GET | `/api/charges/pending` | — | — | ✅ | 待收费列表（收费员） |
| 46 | GET | `/api/charges/{id}` | ✅ | ✅ | ✅ | 收费单详情 |
| 47 | POST | `/api/charges/from-visit/{visitId}` | — | — | ✅ | 生成收费单（收费员） |
| 48 | POST | `/api/charges/{id}/pay` | ✅ | — | ✅ | 支付（自助/收费员代收） |
| 49 | POST | `/api/dispense/{prescriptionId}` | — | — | ✅ | 发药（药师专属） |
| 50 | GET | `/api/dashboard` | — | — | ✅ | 运营统计（管理员） |
| 51 | POST | `/api/ai/chat` | ✅ | — | — | AI 咨询（仅患者端） |

---

## 角色专属接口汇总

### 仅供患者端
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/ai/chat` | AI 智能咨询 |

### 仅供医生端
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/visits/start/{registrationId}` | 开始接诊 |
| PUT | `/api/visits/{id}` | 录入诊断/完成接诊 |
| POST | `/api/prescriptions` | 开立处方 |
| POST | `/api/prescriptions/{id}/cancel` | 作废处方 |
| POST | `/api/exam-requests` | 开立检查申请 |

### 仅供工作人员端
| 方法 | 路径 | 说明 | 角色 |
|------|------|------|------|
| POST | `/api/depts` | 新增科室 | 管理员 |
| PUT | `/api/depts/{id}` | 更新科室 | 管理员 |
| POST | `/api/staff` | 新增员工 | 管理员 |
| PUT | `/api/staff/{id}` | 更新员工 | 管理员 |
| POST | `/api/drugs` | 新增药品 | 管理员 |
| PUT | `/api/drugs/{id}` | 更新药品 | 管理员 |
| GET | `/api/drug-stocks` | 查看库存 | 药师 |
| POST | `/api/medical-items` | 新增医疗项目 | 管理员 |
| PUT | `/api/medical-items/{id}` | 更新医疗项目 | 管理员 |
| POST | `/api/schedules` | 新增排班 | 管理员 |
| PUT | `/api/schedules/{id}` | 更新排班 | 管理员 |
| GET | `/api/prescriptions/pending-dispense` | 待发药列表 | 药师 |
| GET | `/api/charges/pending` | 待收费列表 | 收费员 |
| POST | `/api/charges/from-visit/{visitId}` | 生成收费单 | 收费员 |
| POST | `/api/dispense/{prescriptionId}` | 发药 | 药师 |
| GET | `/api/dashboard` | 运营仪表盘 | 管理员 |

---

## 门诊闭环流程中的角色分工

```
  患者端               医生端               工作人员端
  ──────              ──────              ────────
                      【管理员：排班】     POST /api/schedules
  GET /api/schedules   GET /api/schedules
  (查看排班)           (查看排班)

  POST /api/patients                       POST /api/patients
  (自助建档)                               (现场建档)

  POST /api/registrations                  POST /api/registrations
  (自助挂号)                               (现场挂号)

                      GET /api/registrations/pending
                      (查看待诊患者)

                      POST /api/visits/start/{id}
                      (开始接诊)

                      PUT /api/visits/{id}
                      (录入诊断)

                      POST /api/prescriptions
                      POST /api/exam-requests
                      (开处方 / 开检查)

                                           POST /api/charges/from-visit/{id}
                                           (生成收费单)

  POST /api/charges/{id}/pay              POST /api/charges/{id}/pay
  (自助支付)                               (窗口收费)

                                           POST /api/dispense/{id}
                                           (药师发药)

  GET /api/prescriptions/{id}
  (查看处方)

  POST /api/ai/chat
  (AI 用药咨询)
```

---

> 文档版本：v1.0
> 整理日期：2026-06-16
> 基于：`docs/API.md` v2.0
