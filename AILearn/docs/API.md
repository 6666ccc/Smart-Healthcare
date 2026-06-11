# HuiLiao 后端 API 速查

> 基址：`http://localhost:8080`  
> 除 **健康检查**、**登录** 外，请求头需带：`Authorization: Bearer <token>` 或 `X-Token: <token>`

## 通用说明

**统一响应体** `Result<T>`：

```json
{
  "code": 200,
  "message": "success",
  "data": { }
}
```

- `code = 200` 表示成功；失败时 `data` 为 `null`，`message` 为错误说明
- 带 `@Valid` 的接口会对请求体做校验，字段缺失/非法时返回 400

---

## 健康检查

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/health` | 否 | 服务存活检查，返回 `{status: "UP", app: "HuiLiao"}` |

---

## 认证

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/api/auth/login` | 否 | 登录 |
| POST | `/api/auth/logout` | 是 | 退出（从 Header 读取 token 并失效） |

**POST `/api/auth/login` 请求体**

```json
{
  "username": "admin",
  "password": "password"
}
```

**响应 `data`**：`LoginVO`（含 token、用户信息）

演示账号（`demo_data.sql`）：`admin` / `doctor01` / `cashier01` / `pharma01`，密码均为 **`password`**

---

## 患者 `/api/patients`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/patients` | 列表，Query：`name`、`phone`、`idCard`（均可选） |
| GET | `/api/patients/{id}` | 详情 |
| POST | `/api/patients` | 建档，body：`Patient` 实体 |
| PUT | `/api/patients/{id}` | 更新，body：`Patient` 实体 |

---

## 科室 `/api/depts`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/depts` | 列表，Query：`status`（可选） |
| GET | `/api/depts/{id}` | 详情 |
| POST | `/api/depts` | 新增，body：`Dept` 实体 |
| PUT | `/api/depts/{id}` | 更新，body：`Dept` 实体 |

---

## 员工 `/api/staff`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/staff` | 列表，Query：`deptId`、`status`（均可选） |
| GET | `/api/staff/{id}` | 详情 |
| POST | `/api/staff` | 新增，body：`Staff` 实体 |
| PUT | `/api/staff/{id}` | 更新，body：`Staff` 实体 |

---

## 药品 `/api/drugs`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/drugs` | 列表，Query：`keyword`、`status`（均可选） |
| GET | `/api/drugs/{id}` | 详情 |
| POST | `/api/drugs` | 新增，body：`Drug` 实体 |
| PUT | `/api/drugs/{id}` | 更新，body：`Drug` 实体 |

---

## 医疗项目 `/api/medical-items`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/medical-items` | 列表，Query：`itemType`、`status`（均可选） |
| GET | `/api/medical-items/{id}` | 详情 |
| POST | `/api/medical-items` | 新增，body：`MedicalItem` 实体 |
| PUT | `/api/medical-items/{id}` | 更新，body：`MedicalItem` 实体 |

---

## 排班 `/api/schedules`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/schedules` | 列表，Query：`deptId`、`workDate`（ISO 日期，如 `2026-05-23`）、`staffId`（均可选） |
| GET | `/api/schedules/{id}` | 详情 |
| POST | `/api/schedules` | 新增，body：`Schedule` 实体 |
| PUT | `/api/schedules/{id}` | 更新，body：`Schedule` 实体 |

---

## 挂号 `/api/registrations`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/registrations` | 列表，Query：`patientId`、`status`（均可选） |
| GET | `/api/registrations/pending` | 待诊挂号列表（已挂号、未接诊） |
| POST | `/api/registrations` | 挂号 |
| POST | `/api/registrations/{id}/cancel` | 取消挂号 |

**POST `/api/registrations` 请求体**

```json
{
  "patientId": 1,
  "scheduleId": 1
}
```

---

## 接诊 `/api/visits`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/visits` | 列表，Query：`status`、`staffId`（均可选） |
| GET | `/api/visits/{id}` | 详情 |
| POST | `/api/visits/start/{registrationId}` | 根据挂号单开始接诊，返回 visitId |
| PUT | `/api/visits/{id}` | 录入/更新接诊信息 |

**PUT `/api/visits/{id}` 请求体**

```json
{
  "chiefComplaint": "头痛三天",
  "diagnosis": "感冒",
  "complete": true
}
```

- `complete: true` 表示完成接诊

---

## 检查申请 `/api/exam-requests`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/exam-requests` | 按就诊单查询，Query：`visitId`（必填） |
| POST | `/api/exam-requests` | 开立检查申请 |

**POST `/api/exam-requests` 请求体**

```json
{
  "visitId": 1,
  "itemId": 1
}
```

---

## 处方 `/api/prescriptions`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/prescriptions` | 按就诊单查询，Query：`visitId`（必填） |
| GET | `/api/prescriptions/pending-dispense` | 待发药处方列表 |
| GET | `/api/prescriptions/{id}` | 详情 |
| POST | `/api/prescriptions` | 开处方 |
| POST | `/api/prescriptions/{id}/cancel` | 作废处方 |

**POST `/api/prescriptions` 请求体**

```json
{
  "visitId": 1,
  "items": [
    {
      "drugId": 1,
      "quantity": 2,
      "usageDesc": "一日三次，饭后服用"
    }
  ]
}
```

---

## 收费 `/api/charges`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/charges` | 列表，Query：`payStatus`、`patientId`（均可选） |
| GET | `/api/charges/pending` | 待收费列表 |
| GET | `/api/charges/{id}` | 详情 |
| POST | `/api/charges/from-visit/{visitId}` | 根据就诊单生成收费单，返回 chargeId |
| POST | `/api/charges/{id}/pay` | 支付 |

**POST `/api/charges/{id}/pay` 请求体**

```json
{
  "payType": 1,
  "paidAmount": 128.50
}
```

---

## 发药 `/api/dispense`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/dispense/{prescriptionId}` | 按处方发药 |

---

## 药品库存 `/api/drug-stocks`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/drug-stocks` | 库存列表，Query：`lowStockOnly=true` 可只看低库存预警 |

---

## 仪表盘 `/api/dashboard`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/dashboard` | 今日统计摘要，返回 `DashboardVO` |

---

## 门诊闭环（答辩演示顺序）

1. `POST /api/patients` — 患者建档  
2. `GET /api/schedules` — 查排班  
3. `POST /api/registrations` — 挂号 `{patientId, scheduleId}`  
4. `POST /api/visits/start/{registrationId}` — 开始接诊  
5. `PUT /api/visits/{id}` — 录入主诉/诊断，`complete: true` 完成  
6. `POST /api/exam-requests` — （可选）开立检查 `{visitId, itemId}`  
7. `POST /api/prescriptions` — 开处方 `{visitId, items:[{drugId, quantity}]}`  
8. `POST /api/charges/from-visit/{visitId}` — 生成收费单  
9. `POST /api/charges/{id}/pay` — 支付 `{payType, paidAmount}`  
10. `POST /api/dispense/{prescriptionId}` — 发药  

**辅助查询**

- `GET /api/registrations/pending` — 待诊挂号  
- `GET /api/charges/pending` — 待收费  
- `GET /api/prescriptions/pending-dispense` — 待发药  
- `GET /api/drug-stocks?lowStockOnly=true` — 库存预警  
- `GET /api/dashboard` — 今日统计  
