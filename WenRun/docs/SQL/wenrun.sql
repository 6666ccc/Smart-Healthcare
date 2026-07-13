-- ============================================================
-- 医院管理系统 (WenRun) - 建表脚本
-- 说明: 字段注释与 Java 实体 / 业务状态码对齐
-- ============================================================

create table dept
(
    id          bigint auto_increment comment '自增主键'
        primary key,
    dept_code   varchar(20)                        not null comment '科室编码',
    dept_name   varchar(50)                        not null comment '科室名称',
    parent_id   bigint   default 0                 not null comment '上级科室 ID，0 表示顶级',
    status      tinyint  default 1                 not null comment '0停用 1正常',
    create_time datetime default CURRENT_TIMESTAMP not null comment '创建时间',
    update_time datetime default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP comment '更新时间',
    constraint dept_code
        unique (dept_code)
)
    comment '科室';

create table drug
(
    id           bigint auto_increment comment '自增主键'
        primary key,
    drug_code    varchar(30)                              not null comment '药品编码',
    drug_name    varchar(100)                             not null comment '药品名称',
    spec         varchar(50)                              null comment '规格',
    unit         varchar(20)                              null comment '单位',
    price        decimal(10, 2) default 0.00              not null comment '单价',
    manufacturer varchar(100)                             null comment '生产厂家',
    status       tinyint        default 1                 not null comment '0停用 1正常',
    create_time  datetime       default CURRENT_TIMESTAMP not null comment '创建时间',
    update_time  datetime       default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP comment '更新时间',
    constraint drug_code
        unique (drug_code)
)
    comment '药品字典';

create table drug_stock
(
    id            bigint auto_increment comment '自增主键'
        primary key,
    drug_id       bigint                                   not null comment '药品 ID',
    quantity      decimal(10, 2) default 0.00              not null comment '当前库存数量',
    warn_quantity decimal(10, 2) default 10.00             not null comment '库存预警阈值',
    update_time   datetime       default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP comment '更新时间',
    constraint drug_id
        unique (drug_id),
    constraint fk_stock_drug
        foreign key (drug_id) references drug (id)
)
    comment '药品库存';

create table medical_item
(
    id          bigint auto_increment comment '自增主键'
        primary key,
    item_code   varchar(30)                              not null comment '项目编码',
    item_name   varchar(100)                             not null comment '项目名称',
    item_type   tinyint                                  not null comment '1检查 2检验 3治疗',
    price       decimal(10, 2) default 0.00              not null comment '项目价格',
    dept_id     bigint                                   null comment '执行科室 ID',
    status      tinyint        default 1                 not null comment '0停用 1正常',
    create_time datetime       default CURRENT_TIMESTAMP not null comment '创建时间',
    update_time datetime       default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP comment '更新时间',
    constraint item_code
        unique (item_code)
)
    comment '诊疗项目';

create table operation_log
(
    id          bigint auto_increment comment '自增主键'
        primary key,
    user_id     bigint                             null comment '操作用户 ID',
    module      varchar(50)                        null comment '业务模块',
    action      varchar(100)                       null comment '操作描述',
    request_uri varchar(200)                       null comment '请求 URI',
    ip          varchar(50)                        null comment '客户端 IP',
    create_time datetime default CURRENT_TIMESTAMP not null comment '操作时间'
)
    comment '操作日志';

create index idx_log_user_time
    on operation_log (user_id, create_time);

create table sys_role
(
    id             bigint auto_increment comment '自增主键'
        primary key,
    role_code      varchar(30)                        not null comment '角色编码: admin/doctor/cashier/pharmacist/patient',
    role_name      varchar(50)                        not null comment '角色名称',
    default_portal varchar(20)                        null comment '默认前端门户: admin/doctor/patient',
    create_time    datetime default CURRENT_TIMESTAMP not null comment '创建时间',
    update_time    datetime default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP comment '更新时间',
    constraint role_code
        unique (role_code)
)
    comment '角色（权限 + 默认门户）';

create table sys_sms_code
(
    id          bigint auto_increment comment '自增主键'
        primary key,
    phone       varchar(20)                        not null comment '手机号',
    code        varchar(10)                        not null comment '验证码',
    scene       varchar(20)                        not null comment '场景: login/register/bind',
    expire_at   datetime                           not null comment '过期时间',
    used        tinyint  default 0                 not null comment '0未使用 1已使用',
    create_time datetime default CURRENT_TIMESTAMP not null comment '创建时间'
)
    comment '短信验证码（患者/医护手机登录，演示可 mock）';

create index idx_sms_phone_scene
    on sys_sms_code (phone, scene, expire_at);

create table sys_user
(
    id             bigint auto_increment comment '自增主键'
        primary key,
    username       varchar(50)                           not null comment '登录名（院内工号或手机号）',
    password       varchar(100)                          not null comment 'BCrypt 密文',
    real_name      varchar(50)                           null comment '真实姓名',
    phone          varchar(20)                           null comment '手机号，移动登录主标识',
    phone_verified tinyint     default 0                 not null comment '0未验证 1已验证（短信等）',
    account_type   varchar(20) default 'internal'        not null comment '账号类型: internal院内 staff医护 patient患者',
    status         tinyint     default 1                 not null comment '0停用 1正常',
    create_time    datetime    default CURRENT_TIMESTAMP not null comment '创建时间',
    update_time    datetime    default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP comment '更新时间',
    constraint uk_user_phone
        unique (phone),
    constraint username
        unique (username),
    constraint chk_user_account_type
        check (`account_type` in (_utf8mb4'internal', _utf8mb4'staff', _utf8mb4'patient'))
)
    comment '系统登录账号（PC/手机共用）';

create table patient
(
    id              bigint auto_increment comment '自增主键'
        primary key,
    patient_no      varchar(32)                        not null comment '患者编号',
    name            varchar(50)                        not null comment '姓名',
    gender          tinyint  default 2                 not null comment '0女 1男 2未知',
    birth_date      date                               null comment '出生日期',
    id_card         varchar(18)                        null comment '身份证号',
    phone           varchar(20)                        null comment '联系电话（可与 sys_user.phone 一致）',
    user_id         bigint                             null comment '绑定 sys_user（患者手机端登录，可后开通）',
    allergy_history varchar(500)                       null comment '过敏史',
    address         varchar(200)                       null comment '联系地址',
    create_time     datetime default CURRENT_TIMESTAMP not null comment '创建时间',
    update_time     datetime default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP comment '更新时间',
    constraint patient_no
        unique (patient_no),
    constraint uk_patient_user
        unique (user_id),
    constraint fk_patient_user
        foreign key (user_id) references sys_user (id)
)
    comment '患者档案';

create table charge_order
(
    id           bigint auto_increment comment '自增主键'
        primary key,
    order_no     varchar(32)                              not null comment '收费单号',
    patient_id   bigint                                   not null comment '患者 ID',
    visit_id     bigint                                   null comment '关联就诊 ID（门诊收费时填写）',
    total_amount decimal(10, 2) default 0.00              not null comment '应收总金额',
    paid_amount  decimal(10, 2) default 0.00              not null comment '实收金额',
    pay_type     tinyint                                  null comment '1现金 2微信 3支付宝 4银行卡',
    pay_status   tinyint        default 0                 not null comment '0待支付 1已支付 2已退款',
    cashier_id   bigint                                   null comment '收费员用户 ID',
    pay_time     datetime                                 null comment '支付时间',
    create_time  datetime       default CURRENT_TIMESTAMP not null comment '创建时间',
    update_time  datetime       default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP comment '更新时间',
    constraint order_no
        unique (order_no),
    constraint fk_charge_patient
        foreign key (patient_id) references patient (id)
)
    comment '收费结算单';

create table charge_detail
(
    id              bigint auto_increment comment '自增主键'
        primary key,
    charge_order_id bigint         not null comment '收费单 ID',
    biz_type        tinyint        not null comment '1挂号 2处方 3检查',
    biz_id          bigint         not null comment '业务单据 ID',
    item_name       varchar(100)   not null comment '费用项目名称',
    amount          decimal(10, 2) not null comment '费用金额',
    constraint fk_cd_order
        foreign key (charge_order_id) references charge_order (id)
)
    comment '费用明细';

create index idx_charge_patient
    on charge_order (patient_id, pay_time);

create index idx_patient_name
    on patient (name);

create index idx_patient_phone
    on patient (phone);

create table staff
(
    id          bigint auto_increment comment '自增主键'
        primary key,
    staff_no    varchar(20)                        not null comment '工号',
    name        varchar(50)                        not null comment '姓名',
    dept_id     bigint                             not null comment '所属科室 ID',
    title       varchar(30)                        null comment '职称',
    user_id     bigint                             null comment '绑定 sys_user（医生手机端登录）',
    status      tinyint  default 1                 not null comment '0停用 1正常',
    create_time datetime default CURRENT_TIMESTAMP not null comment '创建时间',
    update_time datetime default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP comment '更新时间',
    constraint staff_no
        unique (staff_no),
    constraint uk_staff_user
        unique (user_id),
    constraint fk_staff_dept
        foreign key (dept_id) references dept (id),
    constraint fk_staff_user
        foreign key (user_id) references sys_user (id)
)
    comment '医护人员';

create table schedule
(
    id              bigint auto_increment comment '自增主键'
        primary key,
    dept_id         bigint                                   not null comment '科室 ID',
    staff_id        bigint                                   not null comment '医生 ID',
    work_date       date                                     not null comment '出诊日期',
    time_period     varchar(20)                              not null comment '时段: 上午/下午/晚上',
    total_count     int            default 0                 not null comment '总号源数',
    remaining_count int            default 0                 not null comment '剩余号源数',
    register_fee    decimal(10, 2) default 0.00              not null comment '挂号费',
    create_time     datetime       default CURRENT_TIMESTAMP not null comment '创建时间',
    update_time     datetime       default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP comment '更新时间',
    constraint fk_sch_dept
        foreign key (dept_id) references dept (id),
    constraint fk_sch_staff
        foreign key (staff_id) references staff (id)
)
    comment '排班号源';

create table registration
(
    id                 bigint auto_increment comment '自增主键'
        primary key,
    reg_no             varchar(32)                              not null comment '挂号单号',
    patient_id         bigint                                   not null comment '患者 ID',
    schedule_id        bigint                                   not null comment '排班 ID',
    dept_id            bigint                                   not null comment '科室 ID',
    staff_id           bigint                                   not null comment '医生 ID',
    reg_time           datetime                                 not null comment '挂号时间',
    reg_fee            decimal(10, 2) default 0.00              not null comment '挂号费',
    status             tinyint        default 1                 not null comment '1已挂号 2已就诊 3已退号',
    cashier_id         bigint                                   null comment '收费员用户 ID（现场挂号时填写）',
    registrant_user_id bigint                                   null comment '挂号人用户 ID（谁帮忙挂的号，前端查自己的+帮别人挂的）',
    create_time        datetime       default CURRENT_TIMESTAMP not null comment '创建时间',
    update_time        datetime       default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP comment '更新时间',
    constraint reg_no
        unique (reg_no),
    constraint fk_reg_patient
        foreign key (patient_id) references patient (id),
    constraint fk_reg_schedule
        foreign key (schedule_id) references schedule (id)
)
    comment '挂号单';

create table outpatient_visit
(
    id              bigint auto_increment comment '自增主键'
        primary key,
    visit_no        varchar(32)                        not null comment '就诊单号',
    registration_id bigint                             not null comment '挂号单 ID',
    patient_id      bigint                             not null comment '患者 ID',
    staff_id        bigint                             not null comment '接诊医生 ID',
    visit_time      datetime                           not null comment '就诊时间',
    chief_complaint varchar(500)                       null comment '主诉',
    diagnosis       varchar(500)                       null comment '诊断',
    status          tinyint  default 1                 not null comment '1进行中 2已完成',
    create_time     datetime default CURRENT_TIMESTAMP not null comment '创建时间',
    update_time     datetime default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP comment '更新时间',
    constraint registration_id
        unique (registration_id),
    constraint visit_no
        unique (visit_no),
    constraint fk_visit_patient
        foreign key (patient_id) references patient (id),
    constraint fk_visit_reg
        foreign key (registration_id) references registration (id)
)
    comment '门诊就诊';

create table exam_request
(
    id          bigint auto_increment comment '自增主键'
        primary key,
    request_no  varchar(32)                              not null comment '申请单号',
    visit_id    bigint                                   not null comment '就诊 ID',
    patient_id  bigint                                   not null comment '患者 ID',
    item_id     bigint                                   not null comment '诊疗项目 ID',
    amount      decimal(10, 2) default 0.00              not null comment '申请金额',
    status      tinyint        default 1                 not null comment '1待缴费 2已缴费 3已执行 4已完成',
    create_time datetime       default CURRENT_TIMESTAMP not null comment '创建时间',
    update_time datetime       default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP comment '更新时间',
    constraint request_no
        unique (request_no),
    constraint fk_exam_item
        foreign key (item_id) references medical_item (id),
    constraint fk_exam_visit
        foreign key (visit_id) references outpatient_visit (id)
)
    comment '检查检验申请';

create table exam_result
(
    id            bigint auto_increment comment '自增主键'
        primary key,
    request_id    bigint                             not null comment '检查申请 ID',
    result_text   text                               null comment '结果文本/报告内容',
    report_time   datetime                           null comment '报告时间',
    technician_id bigint                             null comment '检验技师用户 ID',
    create_time   datetime default CURRENT_TIMESTAMP not null comment '创建时间',
    constraint request_id
        unique (request_id),
    constraint fk_result_req
        foreign key (request_id) references exam_request (id)
)
    comment '检查结果';

create table prescription
(
    id           bigint auto_increment comment '自增主键'
        primary key,
    rx_no        varchar(32)                              not null comment '处方单号',
    visit_id     bigint                                   not null comment '就诊 ID',
    patient_id   bigint                                   not null comment '患者 ID',
    staff_id     bigint                                   not null comment '开方医生 ID',
    total_amount decimal(10, 2) default 0.00              not null comment '处方总金额',
    status       tinyint        default 1                 not null comment '1待缴费 2已缴费 3已发药 4已作废',
    create_time  datetime       default CURRENT_TIMESTAMP not null comment '创建时间',
    update_time  datetime       default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP comment '更新时间',
    constraint rx_no
        unique (rx_no),
    constraint fk_rx_visit
        foreign key (visit_id) references outpatient_visit (id)
)
    comment '处方';

create table dispense_record
(
    id              bigint auto_increment comment '自增主键'
        primary key,
    prescription_id bigint            not null comment '处方 ID',
    pharmacist_id   bigint            not null comment '药师用户 ID',
    dispense_time   datetime          not null comment '发药时间',
    status          tinyint default 1 not null comment '1正常',
    constraint prescription_id
        unique (prescription_id),
    constraint fk_disp_rx
        foreign key (prescription_id) references prescription (id)
)
    comment '发药记录';

create index idx_rx_status
    on prescription (status);

create index idx_rx_visit
    on prescription (visit_id);

create table prescription_item
(
    id              bigint auto_increment comment '自增主键'
        primary key,
    prescription_id bigint         not null comment '处方 ID',
    drug_id         bigint         not null comment '药品 ID',
    quantity        decimal(10, 2) not null comment '数量',
    unit_price      decimal(10, 2) not null comment '单价',
    amount          decimal(10, 2) not null comment '金额',
    usage_desc      varchar(200)   null comment '用法用量',
    constraint fk_rxi_drug
        foreign key (drug_id) references drug (id),
    constraint fk_rxi_rx
        foreign key (prescription_id) references prescription (id)
)
    comment '处方明细';

create index idx_reg_patient
    on registration (patient_id, reg_time);

create index idx_schedule_date
    on schedule (work_date, dept_id);

create index idx_user_account_type
    on sys_user (account_type);

create table ai_knowledge_documents
(
    id             bigint auto_increment primary key,
    document_id    varchar(64)                         not null,
    knowledge_base varchar(32)                         not null,
    original_name  varchar(255)                        not null,
    storage_path   varchar(500)                        not null,
    content_type   varchar(100)                        not null,
    file_size      bigint                              not null,
    file_sha256    varchar(64)                         not null,
    status         varchar(32)                         not null,
    chunk_count    int       default 0                 not null,
    error_message  varchar(1000)                       null,
    uploaded_by    bigint                              not null,
    created_at     datetime  default CURRENT_TIMESTAMP not null,
    updated_at     datetime  default CURRENT_TIMESTAMP not null on update CURRENT_TIMESTAMP,
    completed_at   datetime                            null,
    deleted_at     datetime                            null,
    constraint uk_ai_knowledge_document_id unique (document_id)
)
    comment 'AI RAG 知识库文档管理元数据';

create index idx_ai_knowledge_base_status
    on ai_knowledge_documents (knowledge_base, status);

create index idx_ai_knowledge_base_digest
    on ai_knowledge_documents (knowledge_base, file_sha256);

create index idx_ai_knowledge_processing_time
    on ai_knowledge_documents (status, updated_at);

create table sys_user_role
(
    user_id bigint not null comment '用户 ID',
    role_id bigint not null comment '角色 ID',
    primary key (user_id, role_id),
    constraint fk_ur_role
        foreign key (role_id) references sys_role (id),
    constraint fk_ur_user
        foreign key (user_id) references sys_user (id)
)
    comment '用户-角色（RBAC 权限）';
