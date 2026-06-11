# HuiLiao 医院管理系统 — 数据库设计建议

> 数据库：MySQL 8.x，字符集 `utf8mb4`，排序规则 `utf8mb4_unicode_ci`  
> 命名：表名小写蛇形，主键 `id`（BIGINT），时间字段 `create_time` / `update_time`  
> 对应 SQL 脚本：`docs/sql/schema.sql`

---

## 1. 设计原则

1. **患者主索引唯一**：患者信息集中在 `patient`，门诊/住院通过 `visit` 或业务表关联。
2. **业务单据可追溯**：挂号、就诊、处方、收费、发药均保留状态字段与操作人。
3. **金额用 DECIMAL**：如 `DECIMAL(10,2)`，避免浮点误差。
4. **软删除可选**：毕设可用 `status`（启用/停用）代替物理删除。
5. **范围裁剪**：住院、医技、库存表标记为「扩展」，第一期可只建 P0 表。

---

## 2. 模块与表清单

### 2.1 P0 — 必建（支撑门诊闭环）

| 模块 | 表名 | 说明 |
|------|------|------|
| 系统 | `sys_user` | 系统账号 |
| 系统 | `sys_role` | 角色 |
| 系统 | `sys_user_role` | 用户-角色关联 |
| 基础 | `dept` | 科室 |
| 基础 | `staff` | 医护人员 |
| 基础 | `patient` | 患者 |
| 基础 | `drug` | 药品字典 |
| 基础 | `medical_item` | 诊疗/检查项目价表 |
| 门诊 | `schedule` | 排班/号源 |
| 门诊 | `registration` | 挂号单 |
| 门诊 | `outpatient_visit` | 门诊就诊记录 |
| 门诊 | `prescription` | 处方主表 |
| 门诊 | `prescription_item` | 处方明细 |
| 收费 | `charge_order` | 收费结算单 |
| 收费 | `charge_detail` | 费用明细 |
| 药房 | `drug_stock` | 药品库存 |
| 药房 | `dispense_record` | 发药记录 |

### 2.2 P1 — 建议建（论文加分）

| 模块 | 表名 | 说明 |
|------|------|------|
| 系统 | `operation_log` | 操作日志 |
| 医技 | `exam_request` | 检查检验申请 |
| 医技 | `exam_result` | 检查结果 |

### 2.3 P2 — 扩展（住院 / 库房）

| 模块 | 表名 | 说明 |
|------|------|------|
| 住院 | `bed` | 床位 |
| 住院 | `admission` | 入院记录 |
| 住院 | `inpatient_order` | 住院医嘱 |
| 住院 | `inpatient_order_exec` | 医嘱执行 |
| 住院 | `deposit` | 押金 |
| 住院 | `discharge_settlement` | 出院结算 |
| 库房 | `stock_in` / `stock_out` | 入出库单 |

---

## 3. E-R 关系概览（门诊主线）

```mermaid
erDiagram
    patient ||--o{ registration : has
    schedule ||--o{ registration : uses
    staff ||--o{ registration : doctor
    dept ||--o{ staff : belongs
    registration ||--o| outpatient_visit : generates
    outpatient_visit ||--o{ prescription : has
    prescription ||--|{ prescription_item : contains
    drug ||--o{ prescription_item : references
    outpatient_visit ||--o{ charge_order : bills
    charge_order ||--|{ charge_detail : contains
    prescription ||--o| dispense_record : dispensed
    drug ||--|| drug_stock : stock
```

---

## 4. 核心表结构说明

### 4.1 系统与权限

#### `sys_user` 系统用户

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | 主键 |
| username | VARCHAR(50) UNIQUE | 登录名 |
| password | VARCHAR(100) | BCrypt 密文 |
| real_name | VARCHAR(50) | 姓名 |
| phone | VARCHAR(20) | 手机 |
| status | TINYINT | 0停用 1正常 |
| create_time / update_time | DATETIME | 审计 |

#### `sys_role`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT PK | |
| role_code | VARCHAR(30) UNIQUE | 如 admin、doctor、cashier、pharmacist |
| role_name | VARCHAR(50) | 显示名 |

#### `sys_user_role`

| 字段 | 类型 | 说明 |
|------|------|------|
| user_id | BIGINT | FK → sys_user |
| role_id | BIGINT | FK → sys_role |

**建议初始角色**：`admin` 管理员、`doctor` 医生、`cashier` 收费员、`pharmacist` 药师。

---

### 4.2 基础字典

#### `dept` 科室

| 字段 | 类型 | 说明 |
|------|------|------|
| dept_code | VARCHAR(20) UNIQUE | 科室编码 |
| dept_name | VARCHAR(50) | 名称 |
| parent_id | BIGINT | 父科室，0 为顶级 |
| status | TINYINT | 启用状态 |

#### `staff` 医护人员

| 字段 | 类型 | 说明 |
|------|------|------|
| staff_no | VARCHAR(20) UNIQUE | 工号 |
| name | VARCHAR(50) | 姓名 |
| dept_id | BIGINT | 所属科室 |
| title | VARCHAR(30) | 职称 |
| user_id | BIGINT NULL | 绑定登录账号 |
| status | TINYINT | |

#### `patient` 患者

| 字段 | 类型 | 说明 |
|------|------|------|
| patient_no | VARCHAR(32) UNIQUE | 院内患者编号（可 UUID 短码） |
| name | VARCHAR(50) | 姓名 |
| gender | TINYINT | 0女 1男 2未知 |
| birth_date | DATE | 出生日期 |
| id_card | VARCHAR(18) | 身份证 |
| phone | VARCHAR(20) | |
| allergy_history | VARCHAR(500) | 过敏史 |
| address | VARCHAR(200) | 地址 |

#### `drug` 药品

| 字段 | 类型 | 说明 |
|------|------|------|
| drug_code | VARCHAR(30) UNIQUE | 编码 |
| drug_name | VARCHAR(100) | 名称 |
| spec | VARCHAR(50) | 规格 |
| unit | VARCHAR(20) | 单位 |
| price | DECIMAL(10,2) | 零售价 |
| manufacturer | VARCHAR(100) | 生产厂家 |
| status | TINYINT | |

#### `medical_item` 诊疗项目

| 字段 | 类型 | 说明 |
|------|------|------|
| item_code | VARCHAR(30) UNIQUE | |
| item_name | VARCHAR(100) | |
| item_type | TINYINT | 1检查 2检验 3治疗 |
| price | DECIMAL(10,2) | |
| dept_id | BIGINT NULL | 执行科室 |

---

### 4.3 门诊业务

#### `schedule` 排班号源

| 字段 | 类型 | 说明 |
|------|------|------|
| dept_id | BIGINT | 科室 |
| staff_id | BIGINT | 医生 |
| work_date | DATE | 出诊日期 |
| time_period | VARCHAR(20) | 上午/下午/晚上 |
| total_count | INT | 总号源 |
| remaining_count | INT | 剩余号源 |
| register_fee | DECIMAL(10,2) | 挂号费 |

#### `registration` 挂号单

| 字段 | 类型 | 说明 |
|------|------|------|
| reg_no | VARCHAR(32) UNIQUE | 挂号流水号 |
| patient_id | BIGINT | 患者 |
| schedule_id | BIGINT | 排班 |
| dept_id / staff_id | BIGINT | 冗余便于查询 |
| reg_time | DATETIME | 挂号时间 |
| reg_fee | DECIMAL(10,2) | |
| status | TINYINT | 见下方枚举 |
| cashier_id | BIGINT NULL | 收费员 user_id |

**挂号状态 `registration.status`**：`1` 已挂号 `2` 已就诊 `3` 已退号

#### `outpatient_visit` 门诊就诊

| 字段 | 类型 | 说明 |
|------|------|------|
| visit_no | VARCHAR(32) UNIQUE | 就诊号 |
| registration_id | BIGINT UNIQUE | 一对一挂号 |
| patient_id | BIGINT | |
| staff_id | BIGINT | 接诊医生 |
| visit_time | DATETIME | |
| chief_complaint | VARCHAR(500) | 主诉 |
| diagnosis | VARCHAR(500) | 诊断 |
| status | TINYINT | 1进行中 2已完成 |

#### `prescription` 处方

| 字段 | 类型 | 说明 |
|------|------|------|
| rx_no | VARCHAR(32) UNIQUE | 处方号 |
| visit_id | BIGINT | 就诊 |
| patient_id | BIGINT | |
| staff_id | BIGINT | 开方医生 |
| total_amount | DECIMAL(10,2) | 处方总金额 |
| status | TINYINT | 见枚举 |
| create_time | DATETIME | |

**处方状态 `prescription.status`**：`1` 待缴费 `2` 已缴费 `3` 已发药 `4` 已作废

#### `prescription_item` 处方明细

| 字段 | 类型 | 说明 |
|------|------|------|
| prescription_id | BIGINT | |
| drug_id | BIGINT | |
| quantity | DECIMAL(10,2) | 数量 |
| unit_price | DECIMAL(10,2) | 单价快照 |
| amount | DECIMAL(10,2) | 小计 |
| usage_desc | VARCHAR(200) | 用法用量 |

---

### 4.4 收费

#### `charge_order` 结算单

| 字段 | 类型 | 说明 |
|------|------|------|
| order_no | VARCHAR(32) UNIQUE | |
| patient_id | BIGINT | |
| visit_id | BIGINT NULL | 门诊关联 |
| total_amount | DECIMAL(10,2) | 应收 |
| paid_amount | DECIMAL(10,2) | 实收 |
| pay_type | TINYINT | 1现金 2微信 3支付宝 4银行卡 |
| pay_status | TINYINT | 0待支付 1已支付 2已退款 |
| cashier_id | BIGINT | |
| pay_time | DATETIME NULL | |

#### `charge_detail` 费用明细

| 字段 | 类型 | 说明 |
|------|------|------|
| charge_order_id | BIGINT | |
| biz_type | TINYINT | 1挂号 2处方 3检查 |
| biz_id | BIGINT | 关联业务主键 |
| item_name | VARCHAR(100) | 项目名称快照 |
| amount | DECIMAL(10,2) | |

---

### 4.5 药房

#### `drug_stock` 库存

| 字段 | 类型 | 说明 |
|------|------|------|
| drug_id | BIGINT UNIQUE | 一种药一条库存 |
| quantity | DECIMAL(10,2) | 当前数量 |
| warn_quantity | DECIMAL(10,2) | 预警阈值 |

#### `dispense_record` 发药记录

| 字段 | 类型 | 说明 |
|------|------|------|
| prescription_id | BIGINT | |
| pharmacist_id | BIGINT | 药师 user_id |
| dispense_time | DATETIME | |
| status | TINYINT | 1已发药 |

---

### 4.6 扩展表（简要）

#### `exam_request` / `exam_result`

- 申请单关联 `visit_id`、`medical_item_id`，状态：待缴费 → 已缴费 → 已执行 → 已出结果。  
- 结果表存 `result_text`、`report_time`、`technician_id`。

#### `bed` / `admission` / `inpatient_order`

- 入院关联患者、床位；医嘱类型：药品/护理/检查；执行记录单独表。

---

## 5. 索引建议

| 表 | 索引 | 用途 |
|----|------|------|
| patient | (name), (phone), (id_card) | 患者检索 |
| registration | (patient_id, reg_time) | 历史挂号 |
| registration | (staff_id, status) | 医生待诊列表 |
| schedule | (work_date, dept_id) | 当日排班 |
| prescription | (visit_id), (status) | 待发药/待缴费 |
| charge_order | (patient_id, pay_time) | 收费查询 |
| operation_log | (user_id, create_time) | 审计查询 |

---

## 6. 状态枚举汇总

```text
registration.status     1已挂号 2已就诊 3已退号
outpatient_visit.status 1进行中 2已完成
prescription.status     1待缴费 2已缴费 3已发药 4已作废
charge_order.pay_status 0待支付 1已支付 2已退款
exam_request.status     1待缴费 2已缴费 3已执行 4已完成
```

---

## 7. 业务约束（应用层保证）

| 规则 | 说明 |
|------|------|
| 号源扣减 | 挂号事务内 `remaining_count - 1`，为 0 拒绝 |
| 收费后发药 | 处方 `status >= 2` 才允许发药 |
| 发药扣库存 | 事务内校验 `drug_stock.quantity >= 处方总量` |
| 就诊与挂号 | 一个挂号单对应一次就诊 |
| 金额快照 | 处方明细、收费明细保存当时单价 |

---

## 8. 与开发阶段对应

| 开发阶段（见 TODO.md） | 涉及表 |
|------------------------|--------|
| 阶段 1 | sys_*、dept、staff、patient、drug、medical_item |
| 阶段 2 | schedule、registration、outpatient_visit、prescription_*、charge_*、drug_stock、dispense_record |
| 阶段 3 | bed、admission、inpatient_*、deposit、discharge_settlement |
| 阶段 4 | exam_*、stock_in/out |
| 阶段 5 | operation_log + 统计 SQL |

---

## 9. 初始化数据建议

- 科室：内科、外科、儿科、药房  
- 角色与账号：admin、doctor01、cashier01、pharma01（密码统一测试值，上线前修改）  
- 药品：10～20 条常用药  
- 排班：未来 7 天、每科室 1 名医生、号源 20  
- 患者：5～10 条测试患者  

脚本位置：`docs/sql/schema.sql`、`docs/sql/demo_data.sql`（阶段 0 可执行）。

---

## 10. 论文撰写提示

- **概念结构设计**：用本文 E-R 图 + 主要实体说明  
- **逻辑结构设计**：每张 P0 表一节，列表字段、类型、约束  
- **物理结构设计**：说明 MySQL、InnoDB、utf8mb4  
- **未实现说明**：医保接口、LIS/PACS、分布式事务等写「展望」

---

## 变更记录

| 日期 | 说明 |
|------|------|
| 2026-05-21 | 初版数据库建议，门诊主线 P0 表 |
