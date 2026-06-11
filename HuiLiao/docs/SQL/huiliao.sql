-- ============================================================
-- 医院管理系统 (HuiLiao) - 数据库建表脚本
-- ============================================================
-- 说明: 该脚本会先删除已有表再重建，请谨慎执行
-- ============================================================

SET NAMES utf8mb4;

-- ============================================================
-- 删除已有表（按依赖关系倒序，避免外键约束冲突）
-- ============================================================
DROP TABLE IF EXISTS sys_user_role;
DROP TABLE IF EXISTS dispense_record;
DROP TABLE IF EXISTS prescription_item;
DROP TABLE IF EXISTS prescription;
DROP TABLE IF EXISTS exam_result;
DROP TABLE IF EXISTS exam_request;
DROP TABLE IF EXISTS charge_detail;
DROP TABLE IF EXISTS charge_order;
DROP TABLE IF EXISTS outpatient_visit;
DROP TABLE IF EXISTS registration;
DROP TABLE IF EXISTS schedule;
DROP TABLE IF EXISTS drug_stock;
DROP TABLE IF EXISTS staff;
DROP TABLE IF EXISTS patient;
DROP TABLE IF EXISTS medical_item;
DROP TABLE IF EXISTS operation_log;
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS sys_sms_code;
DROP TABLE IF EXISTS sys_user;
DROP TABLE IF EXISTS sys_role;
DROP TABLE IF EXISTS drug;
DROP TABLE IF EXISTS dept;

-- ============================================================
-- 1. 系统基础
-- ============================================================

-- 角色（权限 + 默认门户）
create table sys_role
(
    id             bigint auto_increment
        primary key,
    role_code      varchar(30)                        not null comment '角色编码: admin/doctor/cashier/pharmacist/patient',
    role_name      varchar(50)                        not null comment '角色名称',
    default_portal varchar(20)                        null comment '默认前端门户: admin/doctor/patient',
    create_time    datetime default CURRENT_TIMESTAMP not null,
    update_time    datetime default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP,
    constraint role_code
        unique (role_code)
) comment '角色（权限 + 默认门户）';

-- 系统登录账号（PC/手机共用）
create table sys_user
(
    id             bigint auto_increment
        primary key,
    username       varchar(50)                           not null comment '登录名（院内工号或手机号）',
    password       varchar(100)                          not null comment 'BCrypt',
    real_name      varchar(50)                           null,
    phone          varchar(20)                           null comment '手机号，移动登录主标识',
    phone_verified tinyint     default 0                 not null comment '0未验证 1已验证（短信等）',
    account_type   varchar(20) default 'internal'        not null comment '账号类型: internal院内 staff医护 patient患者',
    status         tinyint     default 1                 not null comment '0停用 1正常',
    create_time    datetime    default CURRENT_TIMESTAMP not null,
    update_time    datetime    default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP,
    constraint uk_user_phone
        unique (phone),
    constraint username
        unique (username),
    constraint chk_user_account_type
        check (account_type in ('internal', 'staff', 'patient'))
) comment '系统登录账号（PC/手机共用）';

create index idx_user_account_type
    on sys_user (account_type);

-- 用户-角色关联（RBAC 权限）
create table sys_user_role
(
    user_id bigint not null,
    role_id bigint not null,
    primary key (user_id, role_id),
    constraint fk_ur_user
        foreign key (user_id) references sys_user (id),
    constraint fk_ur_role
        foreign key (role_id) references sys_role (id)
) comment '用户-角色（RBAC 权限）';

-- AI 对话消息记录（前端回显 & 审计，与 Qdrant 向量记忆互补）
create table chat_messages
(
    id              bigint auto_increment
        primary key,
    conversation_id varchar(36)                           not null comment '会话ID，与传给AI服务的conversationId一致',
    user_id         bigint                                null comment '发送者用户ID',
    role            varchar(16)                           not null comment 'user / assistant',
    content         text                                  not null comment '消息纯文本',
    create_time     datetime    default CURRENT_TIMESTAMP not null,
    constraint fk_chat_msg_user
        foreign key (user_id) references sys_user (id)
) comment 'AI对话消息记录（前端回显 & 审计，Qdrant向量记忆互补）';

create index idx_chat_msg_conv
    on chat_messages (conversation_id, create_time);

create index idx_chat_msg_user
    on chat_messages (user_id, create_time);

-- 短信验证码（患者/医护手机登录，演示可 mock）
create table sys_sms_code
(
    id          bigint auto_increment
        primary key,
    phone       varchar(20)                        not null,
    code        varchar(10)                        not null,
    scene       varchar(20)                        not null comment 'login/register/bind',
    expire_at   datetime                           not null,
    used        tinyint  default 0                 not null comment '0未使用 1已使用',
    create_time datetime default CURRENT_TIMESTAMP not null
) comment '短信验证码（患者/医护手机登录，演示可 mock）';

create index idx_sms_phone_scene
    on sys_sms_code (phone, scene, expire_at);

-- 操作日志
create table operation_log
(
    id          bigint auto_increment
        primary key,
    user_id     bigint                             null,
    module      varchar(50)                        null,
    action      varchar(100)                       null,
    request_uri varchar(200)                       null,
    ip          varchar(50)                        null,
    create_time datetime default CURRENT_TIMESTAMP not null
) comment '操作日志';

create index idx_log_user_time
    on operation_log (user_id, create_time);

-- ============================================================
-- 2. 组织架构
-- ============================================================

-- 科室
create table dept
(
    id          bigint auto_increment
        primary key,
    dept_code   varchar(20)                        not null,
    dept_name   varchar(50)                        not null,
    parent_id   bigint   default 0                 not null,
    status      tinyint  default 1                 not null,
    create_time datetime default CURRENT_TIMESTAMP not null,
    update_time datetime default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP,
    constraint dept_code
        unique (dept_code)
) comment '科室';

-- 医护人员
create table staff
(
    id          bigint auto_increment
        primary key,
    staff_no    varchar(20)                        not null,
    name        varchar(50)                        not null,
    dept_id     bigint                             not null,
    title       varchar(30)                        null,
    user_id     bigint                             null comment '绑定 sys_user（医生手机端登录）',
    status      tinyint  default 1                 not null,
    create_time datetime default CURRENT_TIMESTAMP not null,
    update_time datetime default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP,
    constraint staff_no
        unique (staff_no),
    constraint uk_staff_user
        unique (user_id),
    constraint fk_staff_dept
        foreign key (dept_id) references dept (id),
    constraint fk_staff_user
        foreign key (user_id) references sys_user (id)
) comment '医护人员';

-- ============================================================
-- 3. 患者档案
-- ============================================================

create table patient
(
    id              bigint auto_increment
        primary key,
    patient_no      varchar(32)                        not null,
    name            varchar(50)                        not null,
    gender          tinyint  default 2                 not null comment '0女1男2未知',
    birth_date      date                               null,
    id_card         varchar(18)                        null,
    phone           varchar(20)                        null comment '联系电话（可与 sys_user.phone 一致）',
    user_id         bigint                             null comment '绑定 sys_user（患者手机端登录，可后开通）',
    allergy_history varchar(500)                       null,
    address         varchar(200)                       null,
    create_time     datetime default CURRENT_TIMESTAMP not null,
    update_time     datetime default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP,
    constraint patient_no
        unique (patient_no),
    constraint uk_patient_user
        unique (user_id),
    constraint fk_patient_user
        foreign key (user_id) references sys_user (id)
) comment '患者档案';

create index idx_patient_name
    on patient (name);

create index idx_patient_phone
    on patient (phone);

-- ============================================================
-- 4. 药品字典 & 诊疗项目
-- ============================================================

-- 药品字典
create table drug
(
    id           bigint auto_increment
        primary key,
    drug_code    varchar(30)                              not null,
    drug_name    varchar(100)                             not null,
    spec         varchar(50)                              null,
    unit         varchar(20)                              null,
    price        decimal(10, 2) default 0.00              not null,
    manufacturer varchar(100)                             null,
    status       tinyint        default 1                 not null,
    create_time  datetime       default CURRENT_TIMESTAMP not null,
    update_time  datetime       default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP,
    constraint drug_code
        unique (drug_code)
) comment '药品字典';

-- 药品库存
create table drug_stock
(
    id            bigint auto_increment
        primary key,
    drug_id       bigint                                   not null,
    quantity      decimal(10, 2) default 0.00              not null,
    warn_quantity decimal(10, 2) default 10.00             not null,
    update_time   datetime       default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP,
    constraint drug_id
        unique (drug_id),
    constraint fk_stock_drug
        foreign key (drug_id) references drug (id)
) comment '药品库存';

-- 诊疗项目
create table medical_item
(
    id          bigint auto_increment
        primary key,
    item_code   varchar(30)                              not null,
    item_name   varchar(100)                             not null,
    item_type   tinyint                                  not null comment '1检查 2检验 3治疗',
    price       decimal(10, 2) default 0.00              not null,
    dept_id     bigint                                   null,
    status      tinyint        default 1                 not null,
    create_time datetime       default CURRENT_TIMESTAMP not null,
    update_time datetime       default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP,
    constraint item_code
        unique (item_code)
) comment '诊疗项目';

-- ============================================================
-- 5. 排班 & 挂号 & 就诊
-- ============================================================

-- 排班号源
create table schedule
(
    id              bigint auto_increment
        primary key,
    dept_id         bigint                                   not null,
    staff_id        bigint                                   not null,
    work_date       date                                     not null,
    time_period     varchar(20)                              not null comment '上午/下午/晚上',
    total_count     int            default 0                 not null,
    remaining_count int            default 0                 not null,
    register_fee    decimal(10, 2) default 0.00              not null,
    create_time     datetime       default CURRENT_TIMESTAMP not null,
    update_time     datetime       default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP,
    constraint fk_sch_dept
        foreign key (dept_id) references dept (id),
    constraint fk_sch_staff
        foreign key (staff_id) references staff (id)
) comment '排班号源';

create index idx_schedule_date
    on schedule (work_date, dept_id);

-- 挂号单
create table registration
(
    id          bigint auto_increment
        primary key,
    reg_no      varchar(32)                              not null,
    patient_id  bigint                                   not null,
    schedule_id bigint                                   not null,
    dept_id     bigint                                   not null,
    staff_id    bigint                                   not null,
    reg_time    datetime                                 not null,
    reg_fee     decimal(10, 2) default 0.00              not null,
    status      tinyint        default 1                 not null comment '1已挂号 2已就诊 3已退号',
    cashier_id  bigint                                   null,
    create_time datetime       default CURRENT_TIMESTAMP not null,
    update_time datetime       default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP,
    constraint reg_no
        unique (reg_no),
    constraint fk_reg_patient
        foreign key (patient_id) references patient (id),
    constraint fk_reg_schedule
        foreign key (schedule_id) references schedule (id)
) comment '挂号单';

create index idx_reg_patient
    on registration (patient_id, reg_time);

-- 门诊就诊
create table outpatient_visit
(
    id              bigint auto_increment
        primary key,
    visit_no        varchar(32)                        not null,
    registration_id bigint                             not null,
    patient_id      bigint                             not null,
    staff_id        bigint                             not null,
    visit_time      datetime                           not null,
    chief_complaint varchar(500)                       null,
    diagnosis       varchar(500)                       null,
    status          tinyint  default 1                 not null comment '1进行中 2已完成',
    create_time     datetime default CURRENT_TIMESTAMP not null,
    update_time     datetime default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP,
    constraint registration_id
        unique (registration_id),
    constraint visit_no
        unique (visit_no),
    constraint fk_visit_patient
        foreign key (patient_id) references patient (id),
    constraint fk_visit_reg
        foreign key (registration_id) references registration (id)
) comment '门诊就诊';

-- ============================================================
-- 6. 收费结算
-- ============================================================

-- 收费结算单
create table charge_order
(
    id           bigint auto_increment
        primary key,
    order_no     varchar(32)                              not null,
    patient_id   bigint                                   not null,
    visit_id     bigint                                   null,
    total_amount decimal(10, 2) default 0.00              not null,
    paid_amount  decimal(10, 2) default 0.00              not null,
    pay_type     tinyint                                  null comment '1现金 2微信 3支付宝 4银行卡',
    pay_status   tinyint        default 0                 not null comment '0待支付 1已支付 2已退款',
    cashier_id   bigint                                   null,
    pay_time     datetime                                 null,
    create_time  datetime       default CURRENT_TIMESTAMP not null,
    update_time  datetime       default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP,
    constraint order_no
        unique (order_no),
    constraint fk_charge_patient
        foreign key (patient_id) references patient (id)
) comment '收费结算单';

create index idx_charge_patient
    on charge_order (patient_id, pay_time);

-- 费用明细
create table charge_detail
(
    id              bigint auto_increment
        primary key,
    charge_order_id bigint         not null,
    biz_type        tinyint        not null comment '1挂号 2处方 3检查',
    biz_id          bigint         not null,
    item_name       varchar(100)   not null,
    amount          decimal(10, 2) not null,
    constraint fk_cd_order
        foreign key (charge_order_id) references charge_order (id)
) comment '费用明细';

-- ============================================================
-- 7. 检查检验
-- ============================================================

-- 检查检验申请
create table exam_request
(
    id          bigint auto_increment
        primary key,
    request_no  varchar(32)                              not null,
    visit_id    bigint                                   not null,
    patient_id  bigint                                   not null,
    item_id     bigint                                   not null,
    amount      decimal(10, 2) default 0.00              not null,
    status      tinyint        default 1                 not null comment '1待缴费 2已缴费 3已执行 4已完成',
    create_time datetime       default CURRENT_TIMESTAMP not null,
    update_time datetime       default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP,
    constraint request_no
        unique (request_no),
    constraint fk_exam_item
        foreign key (item_id) references medical_item (id),
    constraint fk_exam_visit
        foreign key (visit_id) references outpatient_visit (id)
) comment '检查检验申请';

-- 检查结果
create table exam_result
(
    id            bigint auto_increment
        primary key,
    request_id    bigint                             not null,
    result_text   text                               null,
    report_time   datetime                           null,
    technician_id bigint                             null,
    create_time   datetime default CURRENT_TIMESTAMP not null,
    constraint request_id
        unique (request_id),
    constraint fk_result_req
        foreign key (request_id) references exam_request (id)
) comment '检查结果';

-- ============================================================
-- 8. 处方 & 发药
-- ============================================================

-- 处方
create table prescription
(
    id           bigint auto_increment
        primary key,
    rx_no        varchar(32)                              not null,
    visit_id     bigint                                   not null,
    patient_id   bigint                                   not null,
    staff_id     bigint                                   not null,
    total_amount decimal(10, 2) default 0.00              not null,
    status       tinyint        default 1                 not null comment '1待缴费 2已缴费 3已发药 4已作废',
    create_time  datetime       default CURRENT_TIMESTAMP not null,
    update_time  datetime       default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP,
    constraint rx_no
        unique (rx_no),
    constraint fk_rx_visit
        foreign key (visit_id) references outpatient_visit (id)
) comment '处方';

create index idx_rx_status
    on prescription (status);

create index idx_rx_visit
    on prescription (visit_id);

-- 处方明细
create table prescription_item
(
    id              bigint auto_increment
        primary key,
    prescription_id bigint         not null,
    drug_id         bigint         not null,
    quantity        decimal(10, 2) not null,
    unit_price      decimal(10, 2) not null,
    amount          decimal(10, 2) not null,
    usage_desc      varchar(200)   null,
    constraint fk_rxi_drug
        foreign key (drug_id) references drug (id),
    constraint fk_rxi_rx
        foreign key (prescription_id) references prescription (id)
) comment '处方明细';

-- 发药记录
create table dispense_record
(
    id              bigint auto_increment
        primary key,
    prescription_id bigint            not null,
    pharmacist_id   bigint            not null,
    dispense_time   datetime          not null,
    status          tinyint default 1 not null,
    constraint prescription_id
        unique (prescription_id),
    constraint fk_disp_rx
        foreign key (prescription_id) references prescription (id)
) comment '发药记录';
