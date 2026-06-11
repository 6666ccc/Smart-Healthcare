# HuiLiao（惠疗）—— 门诊管理系统 API 文档

> 项目名称：HuiLiao（惠疗）—— 智能门诊管理系统
> 基址：`http://localhost:8080`
> 除 **健康检查**、**登录** 外，请求头需带：`Authorization: Bearer <token>` 或 `X-Token: <token>`

---

## 目录

1. [通用说明](#通用说明)
2. [系统架构与模块](#系统架构与模块)
3. [公共组件](#公共组件)
4. [数据实体总览](#数据实体总览)
5. [接口详情](#接口详情)
    - [健康检查](#健康检查)
    - [认证](#认证)
    - [患者管理](#患者管理-apipatients)
    - [科室管理](#科室-apiwaibudepts)
    - [员工管理](#员工-apiwaibustaff)
    - [药品管理](#药品-apiwaibudrugs)
    - [药品库存](#药品库存-apiwaibudrug-stocks)
    - [医疗项目管理](#医疗项目-apiwaibumedical-items)
    - [排班管理](#排班-apiwaibuschedules)
    - [挂号管理](#挂号-apiwaiburegistrations)
    - [接诊管理](#接诊-apiwaibuvisits)
    - [处方管理](#处方-apiwaibuprescriptions)
    - [检查申请](#检查申请-apiwaibuexam-requests)
    - [收费管理](#收费-apiwaibucharges)
    - [发药管理](#发药-apiwaibudispense)
    - [仪表盘](#仪表盘-apiwaibudashboard)
    - [AI 对话](#ai-对话-apiwaibuai)
6. [配置信息](#配置信息)
7. [门诊闭环流程（答辩演示顺序）](#门诊闭环流程答辩演示顺序)
8. [演示账号](#演示账号)
9. [状态码速查](#状态码速查)

---

## 通用说明

**统一响应体** `Result<T>`：

```json
{
  "code": 200,
  "message": "success",
  "data": { }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| code | int | 状态码（200 成功，4xx 客户端错误，5xx 服务端错误） |
| message | string | 提示信息 |
| data | T | 业务数据（失败时为 null） |

- `code = 200` 表示成功；`code != 200` 时 `data` 为 `null`，`message` 为错误说明
- 带 `@Valid` 的接口会对请求体做校验，字段缺失/非法时返回 400
- 所有列表接口目前返回 `List<T>`（非分页），分页扩展见 `PageResult<T>`

---

## 系统架构与模块

```
┌─────────────────────────────────────────────────┐
│                 HuiLiao Backend                  │
│  Spring Boot 3 + MyBatis + MySQL + BCrypt        │
├─────────────────────────────────────────────────┤
│                                                   │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐ │
│  │ 认证模块  │  │ 门诊模块  │  │  AI 模块       │ │
│  │ Auth     │  │ Patient  │  │  AiChat        │ │
│  │          │  │ Reg/Vst  │  │  → Python      │ │
│  │ Token    │  │ Rx/Chrg  │  │    FastAPI     │ │
│  └──────────┘  └──────────┘  └────────────────┘ │
│                                                   │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐ │
│  │ 基础数据  │  │ 药房模块  │  │ 公共组件       │ │
│  │ Dept     │  │ Drug     │  │ Result         │ │
│  │ Staff    │  │ Stock    │  │ BizStatus      │ │
│  │ Schedule │  │ Dispense │  │ UserContext    │ │
│  └──────────┘  └──────────┘  └────────────────┘ │
│                                                   │
└─────────────────────────────────────────────────┘
```

**技术栈**：

| 组件 | 技术 |
|------|------|
| 框架 | Spring Boot 3.x |
| ORM | MyBatis（XML 映射） |
| 数据库 | MySQL 8.x（`huiliao`） |
| 密码加密 | BCryptPasswordEncoder |
| 认证 | Token（内存存储） |
| AI 客户端 | Spring RestClient → Python FastAPI |
| 构建 | Maven |

---

## 公共组件

### 统一响应 `Result<T>`

- `Result.success(data)` — 成功响应（code=200）
- `Result.success()` — 成功响应无数据
- `Result.fail(code, message)` — 失败响应
- `Result.fail(message)` — 默认 400 失败

### 分页结果 `PageResult<T>`

```json
{
  "total": 100,
  "records": []
}
```

### 状态码 `ResultCode`

| 常量 | 值 | 说明 |
|------|-----|------|
| SUCCESS | 200 | 成功 |
| BAD_REQUEST | 400 | 请求参数错误 |
| UNAUTHORIZED | 401 | 未登录/Token 无效 |
| FORBIDDEN | 403 | 无权限 |
| NOT_FOUND | 404 | 资源不存在 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |
| SERVICE_UNAVAILABLE | 503 | 服务不可用 |

### 登录上下文 `UserContext`

- 基于 `ThreadLocal` 存储当前登录用户 ID
- `AuthInterceptor` 拦截 `/api/**`（排除 `/api/health`、`/api/auth/login`）后自动装配
- 支持两种认证方式：
    - **用户 Token**：`Authorization: Bearer <token>` 或 `X-Token: <token>`
    - **内部 API Key**：`X-Api-Key: <key>` + `X-User-Id: <userId>`（供 AI 服务回调使用）

### 全局异常处理 `GlobalExceptionHandler`

| 异常类型 | 响应码 | 说明 |
|----------|--------|------|
| `BusinessException` | 自定义（默认 400） | 业务异常，返回自定义 code 和 message |
| `MethodArgumentNotValidException` / `BindException` | 400 | 参数校验失败，返回字段级错误信息 |
| `Exception` | 500 | 未捕获系统异常 |

### 业务常量 `BizStatus`

| 分类 | 常量 | 值 | 说明 |
|------|------|-----|------|
| 挂号 | REG_REGISTERED | 1 | 已挂号 |
| 挂号 | REG_VISITED | 2 | 已就诊 |
| 挂号 | REG_CANCELLED | 3 | 已退号 |
| 就诊 | VISIT_IN_PROGRESS | 1 | 进行中 |
| 就诊 | VISIT_COMPLETED | 2 | 已完成 |
| 处方 | RX_PENDING_PAY | 1 | 待缴费 |
| 处方 | RX_PAID | 2 | 已缴费 |
| 处方 | RX_DISPENSED | 3 | 已发药 |
| 处方 | RX_CANCELLED | 4 | 已作废 |
| 收费 | PAY_PENDING | 0 | 待支付 |
| 收费 | PAY_PAID | 1 | 已支付 |
| 收费 | PAY_REFUNDED | 2 | 已退款 |
| 费用明细 | CHARGE_REG | 1 | 挂号费 |
| 费用明细 | CHARGE_RX | 2 | 处方费 |
| 费用明细 | CHARGE_EXAM | 3 | 检查费 |
| 检查 | EXAM_PENDING_PAY | 1 | 待缴费 |
| 检查 | EXAM_PAID | 2 | 已缴费 |
| 通用 | ENABLED | 1 | 启用 |
| 通用 | DISABLED | 0 | 停用 |

### 账号类型 `AccountType`

| 常量 | 值 | 说明 |
|------|-----|------|
| INTERNAL | internal | 院内用户（管理员、收费员、药师） |
| STAFF | staff | 医护人员 |
| PATIENT | patient | 患者 |

### 门户类型 `PortalType`

| 常量 | 值 | 说明 |
|------|-----|------|
| ADMIN | admin | 管理端（管理员、收费员、药师） |
| DOCTOR | doctor | 医生端 |
| PATIENT | patient | 患者端 |

---

## 数据实体总览

| 实体 | 对应表 | 说明 |
|------|--------|------|
| `SysUser` | sys_user | 系统用户（登录账号） |
| `SysRole` | sys_role | 角色（admin/doctor/patient/cashier/pharmacist） |
| `Patient` | patient | 患者档案 |
| `Staff` | staff | 医护人员 |
| `Dept` | dept | 科室 |
| `Schedule` | schedule | 医生排班 |
| `Registration` | registration | 挂号单 |
| `OutpatientVisit` | outpatient_visit | 就诊记录 |
| `Drug` | drug | 药品目录 |
| `DrugStock` | drug_stock | 药品库存 |
| `Prescription` | prescription | 处方 |
| `PrescriptionItem` | prescription_item | 处方明细 |
| `DispenseRecord` | dispense_record | 发药记录 |
| `ChargeOrder` | charge_order | 收费单 |
| `ChargeDetail` | charge_detail | 收费明细 |
| `ExamRequest` | exam_request | 检查申请 |
| `MedicalItem` | medical_item | 医疗项目（检查/检验项目） |

### 实体字段说明

#### SysUser（系统用户）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| username | String | 登录名 |
| password | String | BCrypt 加密密码 |
| realName | String | 真实姓名 |
| phone | String | 手机号 |
| phoneVerified | Integer | 手机验证状态（0 未验证 / 1 已验证） |
| accountType | String | 账号类型（internal/staff/patient） |
| status | Integer | 状态（0 停用 / 1 启用） |

#### SysRole（角色）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| roleCode | String | 角色编码（admin/doctor/patient/cashier/pharmacist） |
| roleName | String | 角色名称 |
| defaultPortal | String | 默认门户（admin/doctor/patient） |

#### Patient（患者）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| patientNo | String | 患者编号 |
| name | String | 姓名 |
| gender | Integer | 性别（0 女 / 1 男 / 2 未知） |
| birthDate | LocalDate | 出生日期 |
| idCard | String | 身份证号 |
| phone | String | 手机号 |
| userId | Long | 绑定系统用户 ID |
| allergyHistory | String | 过敏史 |
| address | String | 地址 |

#### Staff（医护人员）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| staffNo | String | 工号 |
| name | String | 姓名 |
| deptId | Long | 所属科室 ID |
| title | String | 职称 |
| userId | Long | 绑定系统用户 ID |
| status | Integer | 状态（0 停用 / 1 启用） |

#### Dept（科室）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| deptCode | String | 科室编码 |
| deptName | String | 科室名称 |
| parentId | Long | 父科室 ID |
| status | Integer | 状态（0 停用 / 1 启用） |

#### Schedule（排班）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| deptId | Long | 科室 ID |
| staffId | Long | 医生 ID |
| workDate | LocalDate | 工作日期 |
| timePeriod | String | 时段（如 morning/afternoon） |
| totalCount | Integer | 总号源数 |
| remainingCount | Integer | 剩余号源数 |
| registerFee | BigDecimal | 挂号费 |

#### Registration（挂号单）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| regNo | String | 挂号编号 |
| patientId | Long | 患者 ID |
| scheduleId | Long | 排班 ID |
| deptId | Long | 科室 ID |
| staffId | Long | 医生 ID |
| regTime | LocalDateTime | 挂号时间 |
| regFee | BigDecimal | 挂号费 |
| status | Integer | 状态（1 已挂号 / 2 已就诊 / 3 已退号） |
| cashierId | Long | 收费员 ID |

#### OutpatientVisit（就诊记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| visitNo | String | 就诊编号 |
| registrationId | Long | 关联挂号单 ID |
| patientId | Long | 患者 ID |
| staffId | Long | 接诊医生 ID |
| visitTime | LocalDateTime | 就诊时间 |
| chiefComplaint | String | 主诉 |
| diagnosis | String | 诊断结果 |
| status | Integer | 状态（1 进行中 / 2 已完成） |

#### Drug（药品）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| drugCode | String | 药品编码 |
| drugName | String | 药品名称 |
| spec | String | 规格 |
| unit | String | 单位（盒/瓶/袋） |
| price | BigDecimal | 单价 |
| manufacturer | String | 生产厂家 |
| status | Integer | 状态（0 停用 / 1 启用） |

#### DrugStock（药品库存）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| drugId | Long | 药品 ID |
| quantity | BigDecimal | 当前库存量 |
| warnQuantity | BigDecimal | 预警库存量 |

#### Prescription（处方）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| rxNo | String | 处方编号 |
| visitId | Long | 就诊 ID |
| patientId | Long | 患者 ID |
| staffId | Long | 开方医生 ID |
| totalAmount | BigDecimal | 总金额 |
| status | Integer | 状态（1 待缴费 / 2 已缴费 / 3 已发药 / 4 已作废） |

#### PrescriptionItem（处方明细）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| prescriptionId | Long | 处方 ID |
| drugId | Long | 药品 ID |
| quantity | BigDecimal | 数量 |
| unitPrice | BigDecimal | 单价 |
| amount | BigDecimal | 金额 |
| usageDesc | String | 用法说明 |

#### ChargeOrder（收费单）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| orderNo | String | 订单编号 |
| patientId | Long | 患者 ID |
| visitId | Long | 就诊 ID |
| totalAmount | BigDecimal | 总金额 |
| paidAmount | BigDecimal | 实付金额 |
| payType | Integer | 支付方式 |
| payStatus | Integer | 支付状态（0 待支付 / 1 已支付 / 2 已退款） |
| cashierId | Long | 收费员 ID |
| payTime | LocalDateTime | 支付时间 |

#### ChargeDetail（收费明细）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| chargeOrderId | Long | 收费单 ID |
| bizType | Integer | 业务类型（1 挂号 / 2 处方 / 3 检查） |
| bizId | Long | 业务 ID |
| itemName | String | 项目名称 |
| amount | BigDecimal | 金额 |

#### ExamRequest（检查申请）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| requestNo | String | 申请编号 |
| visitId | Long | 就诊 ID |
| patientId | Long | 患者 ID |
| itemId | Long | 检查项目 ID |
| amount | BigDecimal | 费用 |
| status | Integer | 状态（1 待缴费 / 2 已缴费） |

#### MedicalItem（医疗项目）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| itemCode | String | 项目编码 |
| itemName | String | 项目名称 |
| itemType | Integer | 项目类型（如检查、检验） |
| price | BigDecimal | 价格 |
| deptId | Long | 所属科室 ID |
| status | Integer | 状态（0 停用 / 1 启用） |

---

## 接口详情

### 健康检查

无需认证。

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/health` | 否 | 服务存活检查 |

**响应 `data`**：

```json
{
  "status": "UP",
  "app": "HuiLiao"
}
```

---

### 认证

`/api/auth`

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/api/auth/login` | 否 | 用户登录 |
| POST | `/api/auth/logout` | 是 | 退出登录（使 Token 失效） |

#### POST `/api/auth/login`

**请求体**：

```json
{
  "username": "admin",
  "password": "password"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 是 | 登录名 |
| password | string | 是 | 密码（明文，BCrypt 校验） |

**响应 `data`**：`LoginVO`

```json
{
  "token": "xxx",
  "userId": 2,
  "username": "doctor01",
  "realName": "张医生",
  "roleCode": "doctor",
  "roleName": "医生",
  "portalType": "doctor",
  "userType": "doctor",
  "staffId": 1,
  "patientId": null,
  "roles": ["doctor"]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| token | string | 登录令牌（UUID，内存存储） |
| userId | number | 系统用户 ID |
| username | string | 登录名 |
| realName | string | 真实姓名 |
| roleCode | string | 主角色编码（取优先级最高角色：patient < doctor < admin < cashier < pharmacist） |
| roleName | string | 主角色名称 |
| portalType | string | 前端门户类型（admin / doctor / patient） |
| userType | string | 同 portalType，兼容字段 |
| staffId | number \| null | 医生端绑定医护人员 ID（非医护用户为 null） |
| patientId | number \| null | 患者端绑定患者档案 ID（非患者用户为 null） |
| roles | string[] | 全部角色编码列表 |

**角色优先级**（用于决定主角色和门户）：`patient(0) < doctor(1) < admin(2) < cashier(3) < pharmacist(4)`

**门户解析规则**：
1. `accountType = patient` → portalType = patient
2. `accountType = staff` → portalType = doctor
3. 角色的 `defaultPortal` 字段
4. 角色编码回退映射（doctor→doctor, patient→patient, admin/cashier/pharmacist→admin）

---

### 患者管理 `/api/patients`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/patients` | 查询患者列表 |
| GET | `/api/patients/{id}` | 查询患者详情 |
| POST | `/api/patients` | 新建患者档案 |
| PUT | `/api/patients/{id}` | 更新患者信息 |

#### GET `/api/patients`

Query 参数（均可选）：

| 参数 | 类型 | 说明 |
|------|------|------|
| name | string | 按姓名模糊查询 |
| phone | string | 按手机号精确查询 |
| idCard | string | 按身份证号精确查询 |

**响应 `data`**：`PatientVO[]`

```json
[
  {
    "id": 1,
    "patientNo": "P20260001",
    "name": "张三",
    "gender": 1,
    "birthDate": "1990-05-20",
    "idCard": "110101199005201234",
    "phone": "13800138000",
    "userId": null,
    "allergyHistory": "青霉素过敏",
    "address": "北京市朝阳区",
    "createTime": "2026-01-01T08:00:00",
    "updateTime": "2026-01-01T08:00:00"
  }
]
```

#### GET `/api/patients/{id}`

路径参数：

| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 患者 ID |

**响应 `data`**：`PatientVO`

#### POST `/api/patients`

**请求体**：`Patient` 实体（无需传 id、createTime、updateTime）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| patientNo | string | - | 患者编号（系统生成或传入） |
| name | string | - | 姓名 |
| gender | number | - | 性别（0 女/1 男/2 未知） |
| birthDate | string (date) | - | 出生日期 |
| idCard | string | - | 身份证号 |
| phone | string | - | 手机号 |
| userId | number | - | 绑定系统用户 ID |
| allergyHistory | string | - | 过敏史 |
| address | string | - | 地址 |

**响应 `data`**：`Long` — 新建患者 ID

#### PUT `/api/patients/{id}`

**请求体**：同 POST，可只传需要更新的字段

**响应**：无 data

---

### 科室 `/api/depts`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/depts` | 科室列表 |
| GET | `/api/depts/{id}` | 科室详情 |
| POST | `/api/depts` | 新增科室 |
| PUT | `/api/depts/{id}` | 更新科室 |

#### GET `/api/depts`

Query 参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | number | 否 | 状态筛选（0 停用 / 1 启用） |

**响应 `data`**：`Dept[]`

```json
[
  {
    "id": 1,
    "deptCode": "1001",
    "deptName": "内科",
    "parentId": null,
    "status": 1,
    "createTime": "...",
    "updateTime": "..."
  }
]
```

#### GET `/api/depts/{id}`

**响应 `data`**：`Dept`

#### POST `/api/depts`

**请求体**：`Dept` 实体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| deptCode | string | - | 科室编码 |
| deptName | string | - | 科室名称 |
| parentId | number | - | 父科室 ID（支持树形结构） |
| status | number | - | 状态 |

**响应 `data`**：`Long` — 新建科室 ID

#### PUT `/api/depts/{id}`

**响应**：无 data

---

### 员工 `/api/staff`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/staff` | 员工列表 |
| GET | `/api/staff/{id}` | 员工详情 |
| POST | `/api/staff` | 新增员工 |
| PUT | `/api/staff/{id}` | 更新员工 |

#### GET `/api/staff`

Query 参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| deptId | number | 否 | 按科室筛选 |
| status | number | 否 | 按状态筛选（0 停用 / 1 启用） |

**响应 `data`**：`StaffVO[]`

```json
[
  {
    "id": 1,
    "staffNo": "D001",
    "name": "张医生",
    "deptId": 1,
    "deptName": "内科",
    "title": "主任医师",
    "userId": 2,
    "status": 1
  }
]
```

#### GET `/api/staff/{id}`

**响应 `data`**：`Staff`（不含 deptName）

#### POST `/api/staff`

**请求体**：`Staff` 实体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| staffNo | string | - | 工号 |
| name | string | - | 姓名 |
| deptId | number | - | 所属科室 ID |
| title | string | - | 职称 |
| userId | number | - | 绑定系统用户 ID |
| status | number | - | 状态 |

**响应 `data`**：`Long` — 新建员工 ID

#### PUT `/api/staff/{id}`

**响应**：无 data

---

### 药品 `/api/drugs`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/drugs` | 药品列表 |
| GET | `/api/drugs/{id}` | 药品详情 |
| POST | `/api/drugs` | 新增药品 |
| PUT | `/api/drugs/{id}` | 更新药品 |

#### GET `/api/drugs`

Query 参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| keyword | string | 否 | 按编码/名称模糊搜索 |
| status | number | 否 | 按状态筛选（0 停用 / 1 启用） |

**响应 `data`**：`Drug[]`

```json
[
  {
    "id": 1,
    "drugCode": "YP00001",
    "drugName": "阿莫西林胶囊",
    "spec": "0.5g*24粒",
    "unit": "盒",
    "price": 12.50,
    "manufacturer": "某制药厂",
    "status": 1,
    "createTime": "...",
    "updateTime": "..."
  }
]
```

#### GET `/api/drugs/{id}`

**响应 `data`**：`Drug`

#### POST `/api/drugs`

**请求体**：`Drug` 实体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| drugCode | string | - | 药品编码 |
| drugName | string | - | 药品名称 |
| spec | string | - | 规格 |
| unit | string | - | 单位 |
| price | number | - | 单价 |
| manufacturer | string | - | 生产厂家 |
| status | number | - | 状态 |

**响应 `data`**：`Long` — 新建药品 ID

#### PUT `/api/drugs/{id}`

**响应**：无 data

---

### 药品库存 `/api/drug-stocks`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/drug-stocks` | 库存列表 |

#### GET `/api/drug-stocks`

Query 参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| lowStockOnly | boolean | 否 | `true` 只返回低库存预警项 |

**响应 `data`**：`DrugStockVO[]`

```json
[
  {
    "drugId": 1,
    "drugCode": "YP00001",
    "drugName": "阿莫西林胶囊",
    "spec": "0.5g*24粒",
    "unit": "盒",
    "quantity": 100,
    "warnQuantity": 20,
    "lowStock": false
  }
]
```

| 字段 | 类型 | 说明 |
|------|------|------|
| drugId | number | 药品 ID |
| drugCode | string | 药品编码 |
| drugName | string | 药品名称 |
| spec | string | 规格 |
| unit | string | 单位 |
| quantity | number | 当前库存量 |
| warnQuantity | number | 预警库存量 |
| lowStock | boolean | 是否低库存（quantity < warnQuantity） |

---

### 医疗项目 `/api/medical-items`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/medical-items` | 项目列表 |
| GET | `/api/medical-items/{id}` | 项目详情 |
| POST | `/api/medical-items` | 新增项目 |
| PUT | `/api/medical-items/{id}` | 更新项目 |

#### GET `/api/medical-items`

Query 参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| itemType | number | 否 | 按项目类型筛选 |
| status | number | 否 | 按状态筛选（0 停用 / 1 启用） |

**响应 `data`**：`MedicalItem[]`

```json
[
  {
    "id": 1,
    "itemCode": "XM001",
    "itemName": "血常规",
    "itemType": 1,
    "price": 30.00,
    "deptId": 2,
    "status": 1,
    "createTime": "...",
    "updateTime": "..."
  }
]
```

#### POST `/api/medical-items`

**请求体**：`MedicalItem` 实体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| itemCode | string | - | 项目编码 |
| itemName | string | - | 项目名称 |
| itemType | number | - | 项目类型 |
| price | number | - | 价格 |
| deptId | number | - | 所属科室 ID |
| status | number | - | 状态 |

**响应 `data`**：`Long` — 新建项目 ID

---

### 排班 `/api/schedules`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/schedules` | 排班列表 |
| GET | `/api/schedules/{id}` | 排班详情 |
| POST | `/api/schedules` | 新增排班 |
| PUT | `/api/schedules/{id}` | 更新排班 |

#### GET `/api/schedules`

Query 参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| deptId | number | 否 | 按科室筛选 |
| workDate | string (ISO date) | 否 | 按工作日筛选（如 `2026-05-23`） |
| staffId | number | 否 | 按医生筛选 |

**响应 `data`**：`ScheduleVO[]`

```json
[
  {
    "id": 1,
    "deptId": 1,
    "deptName": "内科",
    "staffId": 1,
    "staffName": "张医生",
    "workDate": "2026-05-23",
    "timePeriod": "morning",
    "totalCount": 30,
    "remainingCount": 15,
    "registerFee": 20.00
  }
]
```

#### POST `/api/schedules`

**请求体**：`Schedule` 实体

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| deptId | number | - | 科室 ID |
| staffId | number | - | 医生 ID |
| workDate | string (date) | - | 工作日期 |
| timePeriod | string | - | 时段（morning/afternoon） |
| totalCount | number | - | 总号源数 |
| remainingCount | number | - | 剩余号源数 |
| registerFee | number | - | 挂号费 |

**响应 `data`**：`Long` — 新建排班 ID

---

### 挂号 `/api/registrations`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/registrations` | 挂号列表 |
| GET | `/api/registrations/pending` | 待诊挂号列表 |
| POST | `/api/registrations` | 新建挂号 |
| POST | `/api/registrations/{id}/cancel` | 取消挂号（退号） |

#### GET `/api/registrations`

Query 参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| patientId | number | 否 | 按患者筛选 |
| status | number | 否 | 按状态筛选（1 已挂号 / 2 已就诊 / 3 已退号） |

**响应 `data`**：`RegistrationVO[]`

```json
[
  {
    "id": 1,
    "regNo": "R20260001",
    "patientId": 1,
    "patientName": "张三",
    "deptId": 1,
    "deptName": "内科",
    "staffId": 1,
    "staffName": "张医生",
    "regTime": "2026-06-09T08:00:00",
    "regFee": 20.00,
    "status": 1
  }
]
```

#### GET `/api/registrations/pending`

返回 `status = 1`（已挂号）的列表，等价于 `GET /api/registrations?status=1`。

#### POST `/api/registrations`

**请求体**：

```json
{
  "patientId": 1,
  "scheduleId": 1
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| patientId | number | 是 | 患者 ID |
| scheduleId | number | 是 | 排班 ID |

**业务逻辑**：
- 从 Schedule 获取 deptId、staffId、registerFee
- 扣减 Schedule.remainingCount
- 生成挂号编号
- 生成一条收费明细（bizType = CHARGE_REG）

**响应 `data`**：`Long` — 新建挂号 ID

#### POST `/api/registrations/{id}/cancel`

将状态设为 `REG_CANCELLED(3)`，恢复排班剩余号源。

**响应**：无 data

---

### 接诊 `/api/visits`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/visits` | 就诊列表 |
| GET | `/api/visits/{id}` | 就诊详情 |
| POST | `/api/visits/start/{registrationId}` | 开始接诊 |
| PUT | `/api/visits/{id}` | 更新接诊信息 |

#### GET `/api/visits`

Query 参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | number | 否 | 按状态筛选（1 进行中 / 2 已完成） |
| staffId | number | 否 | 按医生筛选 |

**响应 `data`**：`VisitVO[]`

```json
[
  {
    "id": 1,
    "visitNo": "V20260001",
    "registrationId": 1,
    "regNo": "R20260001",
    "patientId": 1,
    "patientName": "张三",
    "staffId": 1,
    "staffName": "张医生",
    "visitTime": "2026-06-09T09:00:00",
    "chiefComplaint": null,
    "diagnosis": null,
    "status": 1
  }
]
```

#### POST `/api/visits/start/{registrationId}`

**业务逻辑**：
- 将对应挂号单状态更新为 `REG_VISITED(2)`
- 新建一条就诊记录，状态 `VISIT_IN_PROGRESS(1)`

**响应 `data`**：`Long` — 新建就诊 ID

#### PUT `/api/visits/{id}`

**请求体**：

```json
{
  "chiefComplaint": "头痛三天",
  "diagnosis": "感冒",
  "complete": true
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| chiefComplaint | string | 否 | 主诉 |
| diagnosis | string | 否 | 诊断结果 |
| complete | boolean | 否 | `true` 表示完成接诊（状态→VISIT_COMPLETED） |

**响应**：无 data

---

### 处方 `/api/prescriptions`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/prescriptions` | 按就诊单查询 |
| GET | `/api/prescriptions/pending-dispense` | 待发药处方列表 |
| GET | `/api/prescriptions/{id}` | 处方详情 |
| POST | `/api/prescriptions` | 开立处方 |
| POST | `/api/prescriptions/{id}/cancel` | 作废处方 |

#### GET `/api/prescriptions`

Query 参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| visitId | number | 是 | 就诊 ID |

**响应 `data`**：`PrescriptionVO[]`

```json
[
  {
    "id": 1,
    "rxNo": "RX20260001",
    "visitId": 1,
    "patientId": 1,
    "patientName": "张三",
    "totalAmount": 25.00,
    "status": 1,
    "createTime": "2026-06-09T09:30:00",
    "items": [
      {
        "id": 1,
        "prescriptionId": 1,
        "drugId": 1,
        "quantity": 2,
        "unitPrice": 12.50,
        "amount": 25.00,
        "usageDesc": "一日三次，饭后服用"
      }
    ]
  }
]
```

#### GET `/api/prescriptions/pending-dispense`

返回 `status = RX_PAID(2)`（已缴费待发药）的处方列表。

#### POST `/api/prescriptions`

**请求体**：

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

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| visitId | number | 是 | 就诊 ID |
| items | array | 是 | 处方明细列表 |
| items[].drugId | number | 是 | 药品 ID |
| items[].quantity | number | 是 | 数量 |
| items[].usageDesc | string | 否 | 用法说明 |

**业务逻辑**：
- 从 Visit 获取 patientId 和 staffId
- 从 Drug 获取单价，计算各明细金额及总金额
- 状态初始为 `RX_PENDING_PAY(1)`

**响应 `data`**：`Long` — 新建处方 ID

#### POST `/api/prescriptions/{id}/cancel`

将处方状态设为 `RX_CANCELLED(4)`（仅允许待缴费状态的处方作废）。

**响应**：无 data

---

### 检查申请 `/api/exam-requests`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/exam-requests` | 按就诊单查询检查申请 |
| POST | `/api/exam-requests` | 开立检查申请 |

#### GET `/api/exam-requests`

Query 参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| visitId | number | 是 | 就诊 ID |

**响应 `data`**：`ExamRequest[]`

```json
[
  {
    "id": 1,
    "requestNo": "E20260001",
    "visitId": 1,
    "patientId": 1,
    "itemId": 1,
    "amount": 30.00,
    "status": 1,
    "createTime": "...",
    "updateTime": "..."
  }
]
```

#### POST `/api/exam-requests`

**请求体**：

```json
{
  "visitId": 1,
  "itemId": 1
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| visitId | number | 是 | 就诊 ID |
| itemId | number | 是 | 医疗项目 ID |

**业务逻辑**：
- 从 Visit 获取 patientId
- 从 MedicalItem 获取价格

**响应 `data`**：`Long` — 新建检查申请 ID

---

### 收费 `/api/charges`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/charges` | 收费单列表 |
| GET | `/api/charges/pending` | 待收费列表 |
| GET | `/api/charges/{id}` | 收费单详情 |
| POST | `/api/charges/from-visit/{visitId}` | 根据就诊单生成收费单 |
| POST | `/api/charges/{id}/pay` | 支付 |

#### GET `/api/charges`

Query 参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| payStatus | number | 否 | 支付状态（0 待支付 / 1 已支付 / 2 已退款） |
| patientId | number | 否 | 按患者筛选 |

**响应 `data`**：`ChargeOrderVO[]`

```json
[
  {
    "id": 1,
    "orderNo": "C20260001",
    "patientId": 1,
    "patientName": "张三",
    "visitId": 1,
    "totalAmount": 75.00,
    "paidAmount": null,
    "payType": null,
    "payStatus": 0,
    "payTime": null,
    "createTime": "2026-06-09T10:00:00",
    "details": [
      { "id": 1, "chargeOrderId": 1, "bizType": 2, "bizId": 1, "itemName": "处方费(RX20260001)", "amount": 25.00 },
      { "id": 2, "chargeOrderId": 1, "bizType": 3, "bizId": 1, "itemName": "检查费-血常规", "amount": 30.00 },
      { "id": 3, "chargeOrderId": 1, "bizType": 1, "bizId": 1, "itemName": "挂号费", "amount": 20.00 }
    ]
  }
]
```

#### GET `/api/charges/pending`

返回 `payStatus = PAY_PENDING(0)` 的列表。

#### POST `/api/charges/from-visit/{visitId}`

**业务逻辑**：
- 查询该就诊单关联的所有未收费项目：
    - 挂号费（Registration 中该就诊对应挂号单）
    - 处方（status = RX_PENDING_PAY）
    - 检查申请（status = EXAM_PENDING_PAY）
- 汇总生成 ChargeOrder + ChargeDetail 列表

**响应 `data`**：`Long` — 新建收费单 ID

#### POST `/api/charges/{id}/pay`

**请求体**：

```json
{
  "payType": 1,
  "paidAmount": 75.00
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| payType | number | 是 | 支付方式（如 1 现金 / 2 微信 / 3 支付宝 / 4 医保） |
| paidAmount | number | 否 | 实付金额（不传则按 totalAmount 支付） |

**业务逻辑**：
- 更新 ChargeOrder：payStatus=PAY_PAID, payTime, paidAmount, payType
- 关联的处方 → status=RX_PAID
- 关联的检查申请 → status=EXAM_PAID
- 减扣对应药品库存

**响应**：无 data

---

### 发药 `/api/dispense`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/dispense/{prescriptionId}` | 按处方发药 |

#### POST `/api/dispense/{prescriptionId}`

**业务逻辑**：
- 仅允许已缴费（RX_PAID）的处方发药
- 新建 DispenseRecord
- 更新处方状态为 `RX_DISPENSED(3)`

**响应**：无 data

---

### 仪表盘 `/api/dashboard`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/dashboard` | 今日统计摘要 |

**响应 `data`**：`DashboardVO`

```json
{
  "todayRegistrations": 42,
  "todayVisits": 30,
  "todayCharges": 25,
  "todayRevenue": 3250.00,
  "pendingDispense": 8,
  "lowStockDrugs": 3
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| todayRegistrations | number | 今日挂号人次 |
| todayVisits | number | 今日就诊人次 |
| todayCharges | number | 今日收费笔数 |
| todayRevenue | number | 今日收入总额 |
| pendingDispense | number | 待发药处方数 |
| lowStockDrugs | number | 低库存药品数 |

---

### AI 对话 `/api/ai`

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/api/ai/chat` | 是 | 发送消息给 AI 并获取回复 |

#### POST `/api/ai/chat`

**请求体（客户端发送）**：

```json
{
  "message": "高血压患者应该注意什么？"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| message | string | 是 | 用户消息内容 |

**实际发给 AI 服务（Python FastAPI）的请求体**：

Java 后端自动从当前登录用户上下文提取信息，注入请求体后转发给 AI 服务：

```json
{
  "message": "高血压患者应该注意什么？",
  "apiKey": "huiliao-ai-internal-key-2026",
  "userId": 2,
  "username": "doctor01",
  "realName": "张医生",
  "roleCode": "doctor",
  "portalType": "doctor",
  "staffId": 1,
  "patientId": null,
  "patientNo": null,
  "patientName": null,
  "patientGender": null,
  "patientBirthDate": null,
  "patientAllergyHistory": null
}
```

| 字段 | 类型 | 来源 | 说明 |
|------|------|------|------|
| message | string | 客户端 | 用户消息 |
| apiKey | string | 配置 | 内部 API Key，供 AI 服务回调鉴权 |
| userId | number \| null | Token | 当前登录用户 ID |
| username | string \| null | Token | 登录名 |
| realName | string \| null | Token | 真实姓名 |
| roleCode | string \| null | Token | 主角色编码 |
| portalType | string \| null | Token | 门户类型（admin/doctor/patient） |
| staffId | number \| null | Token+查询 | 医生端：医护人员 ID（非医生用户为 null） |
| patientId | number \| null | Token+查询 | 患者端：患者档案 ID（非患者用户为 null） |
| patientNo | string \| null | Token+查询 | 患者编号 |
| patientName | string \| null | Token+查询 | 患者姓名 |
| patientGender | number \| null | Token+查询 | 患者性别（0 女 / 1 男 / 2 未知） |
| patientBirthDate | string \| null | Token+查询 | 患者出生日期（ISO 格式） |
| patientAllergyHistory | string \| null | Token+查询 | 患者过敏史 |

**响应 `data`**：`ChatResponseVO`

```json
{
  "reply": "高血压患者应注意低盐饮食、规律服药、定期监测血压..."
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| reply | string | AI 回复内容 |

**AI 模块架构**：

```
┌──────────────┐     POST /api/ai/chat     ┌────────────────┐
│  前端/客户端   │ ──────────────────────→  │  Java Backend  │
│              │ ←──────────────────────  │  AiChatController│
└──────────────┘    ChatResponseVO        │  + enrichContext │
                                           └───────┬────────┘
                                                   │ POST /v1/chat
                                                   │ (带用户上下文)
                                                   ↓
                                           ┌────────────────┐
                                           │ Python FastAPI  │
                                           │  AI 服务        │
                                           └────────────────┘
```

**AI 模块组件**：

| 组件 | 说明 |
|------|------|
| `AiChatController` | 接收客户端请求，注入用户上下文后转发 |
| `AiChatService` | 聊天服务接口，实现类调用 `AiServiceClient` |
| `AiServiceClient` | RestClient 封装，调用 FastAPI 的 `/v1/chat` 和 `/health` |
| `AiServiceProperties` | 配置属性（baseUrl、chatPath、healthPath、apiKey、超时时间） |
| `AiHttpClientConfig` | 创建 RestClient Bean 并配置连接/读取超时 |
| `AiServiceException` | AI 服务异常类 |
| `AiExceptionHandler` | AI 异常处理器（继承 `ResponseEntityExceptionHandler`） |

**AI 服务配置**（`application.yml`）：

```yaml
ai:
  service:
    base-url: http://127.0.0.1:8000      # FastAPI 地址
    chat-path: /v1/chat                   # 聊天接口路径
    health-path: /health                  # 健康检查路径
    api-key: huiliao-ai-internal-key-2026 # 内部 API Key
    connect-timeout: 5s                   # 连接超时
    read-timeout: 120s                    # 读取超时（AI 回复可能较长）
```

---

## 配置信息

### 服务器配置

```yaml
server:
  port: 8080

spring:
  application:
    name: HuiLiao
  datasource:
    url: jdbc:mysql://localhost:3306/huiliao?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai
    username: root
    password: 123456789

mybatis:
  mapper-locations: classpath:mapper/**/*.xml
  type-aliases-package: com.example.huiliao.entity
  configuration:
    map-underscore-to-camel-case: true
```

### CORS 配置

```java
registry.addMapping("/api/**")
    .allowedOriginPatterns("*")
    .allowedMethods("GET", POST, PUT, DELETE, OPTIONS)
    .allowedHeaders("*")
    .allowCredentials(true)
    .maxAge(3600);
```

### 密码加密

使用 `BCryptPasswordEncoder`（Spring Security Crypto）。

### 拦截器

`AuthInterceptor` 拦截 `/api/**`，排除路径：

| 排除路径 | 说明 |
|----------|------|
| `/api/health` | 健康检查（无需登录） |
| `/api/auth/login` | 登录接口（无需登录） |

---

## 门诊闭环流程（答辩演示顺序）

此流程覆盖一个完整的门诊患者从建档到取药的全部环节：

```
                   ┌──────────────┐
                   │ 1. 患者建档   │  POST /api/patients
                   └──────┬───────┘
                          ↓
                   ┌──────────────┐
                   │ 2. 查看排班   │  GET /api/schedules
                   └──────┬───────┘
                          ↓
                   ┌──────────────┐
                   │ 3. 挂号      │  POST /api/registrations {patientId, scheduleId}
                   └──────┬───────┘
                          ↓
                   ┌──────────────┐
                   │ 4. 开始接诊   │  POST /api/visits/start/{registrationId}
                   └──────┬───────┘
                          ↓
                   ┌──────────────┐
                   │ 5. 录入诊断   │  PUT /api/visits/{id} {chiefComplaint, diagnosis, complete:true}
                   └──────┬───────┘
                          ↓
              ┌───────────┴───────────┐
              ↓                       ↓
    ┌──────────────────┐   ┌──────────────────┐
    │ 6a. 开立检查      │   │ 6b. 开立处方      │
    │ POST /exam-req   │   │ POST /presc      │
    └────────┬─────────┘   └────────┬─────────┘
              └───────────┬──────────┘
                          ↓
                   ┌──────────────┐
                   │ 7. 生成收费单  │  POST /api/charges/from-visit/{visitId}
                   └──────┬───────┘
                          ↓
                   ┌──────────────┐
                   │ 8. 支付      │  POST /api/charges/{id}/pay {payType, paidAmount}
                   └──────┬───────┘
                          ↓
                   ┌──────────────┐
                   │ 9. 发药      │  POST /api/dispense/{prescriptionId}
                   └──────────────┘
```

| 步骤 | 操作 | 接口 | 说明 |
|------|------|------|------|
| 1 | 患者建档 | `POST /api/patients` | 录入患者基本信息 |
| 2 | 查排班 | `GET /api/schedules` | 查询可选科室和医生 |
| 3 | 挂号 | `POST /api/registrations` | `{patientId, scheduleId}` |
| 4 | 开始接诊 | `POST /api/visits/start/{registrationId}` | 医生开始看诊 |
| 5 | 录入诊断 | `PUT /api/visits/{id}` | `{diagnosis, complete: true}` |
| 6a | 开立检查 | `POST /api/exam-requests` | `{visitId, itemId}`（可选） |
| 6b | 开立处方 | `POST /api/prescriptions` | `{visitId, items: [...]}` |
| 7 | 生成收费单 | `POST /api/charges/from-visit/{visitId}` | 汇总未缴费项目 |
| 8 | 支付 | `POST /api/charges/{id}/pay` | `{payType, paidAmount}` |
| 9 | 发药 | `POST /api/dispense/{prescriptionId}` | 已缴费处方发药 |

**辅助查询接口**：

| 接口 | 用途 |
|------|------|
| `GET /api/registrations/pending` | 查看待诊患者 |
| `GET /api/charges/pending` | 查看待收费列表 |
| `GET /api/prescriptions/pending-dispense` | 查看待发药处方 |
| `GET /api/drug-stocks?lowStockOnly=true` | 查看库存预警 |
| `GET /api/dashboard` | 今日运营统计 |

---

## 演示账号

密码均为 **`password`**：

| 用户名 | portalType | 角色 | 说明 |
|--------|------------|------|------|
| admin | admin | 管理员 | 管理端，系统管理 |
| cashier01 | admin | 收费员 | 收费操作 |
| pharma01 | admin | 药师 | 发药操作 |
| doctor01 | doctor | 医生 | 医生端，接诊开方 |
| patient01 | patient | 患者 | 患者端（绑定 P20260001） |
| pt20261001 等 | patient | 患者 | random_data 中患者移动端账号 |

---

## 状态码速查

### HTTP 状态码（Result.code）

| 值 | 常量 | 说明 |
|-----|------|------|
| 200 | SUCCESS | 成功 |
| 400 | BAD_REQUEST | 参数错误/校验失败 |
| 401 | UNAUTHORIZED | 未登录/Token 无效/登录过期 |
| 403 | FORBIDDEN | 无权限 |
| 404 | NOT_FOUND | 资源不存在 |
| 500 | INTERNAL_ERROR | 服务器内部错误 |
| 503 | SERVICE_UNAVAILABLE | 服务不可用 |

### 挂号状态

| 值 | 常量 | 说明 |
|-----|------|------|
| 1 | REG_REGISTERED | 已挂号（待诊） |
| 2 | REG_VISITED | 已就诊 |
| 3 | REG_CANCELLED | 已退号 |

### 就诊状态

| 值 | 常量 | 说明 |
|-----|------|------|
| 1 | VISIT_IN_PROGRESS | 进行中 |
| 2 | VISIT_COMPLETED | 已完成 |

### 处方状态

| 值 | 常量 | 说明 |
|-----|------|------|
| 1 | RX_PENDING_PAY | 待缴费 |
| 2 | RX_PAID | 已缴费 |
| 3 | RX_DISPENSED | 已发药 |
| 4 | RX_CANCELLED | 已作废 |

### 收费状态

| 值 | 常量 | 说明 |
|-----|------|------|
| 0 | PAY_PENDING | 待支付 |
| 1 | PAY_PAID | 已支付 |
| 2 | PAY_REFUNDED | 已退款 |

### 费用明细类型

| 值 | 常量 | 说明 |
|-----|------|------|
| 1 | CHARGE_REG | 挂号费 |
| 2 | CHARGE_RX | 处方费 |
| 3 | CHARGE_EXAM | 检查费 |

### 检查申请状态

| 值 | 常量 | 说明 |
|-----|------|------|
| 1 | EXAM_PENDING_PAY | 待缴费 |
| 2 | EXAM_PAID | 已缴费 |

---

> 文档版本：v2.0  
> 最后更新：2026-06-09  
> 项目地址：`D:\刘畅\WebAI\HuiLiao`
