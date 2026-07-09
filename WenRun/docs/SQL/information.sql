-- ============================================================
-- 医院管理系统 (HuiLiao) - 初始化基础数据（演示用）
-- ============================================================
-- 说明: 请在 huiliao.sql 建表之后执行，按外键依赖顺序排列
--       使用 ON DUPLICATE KEY UPDATE 保证幂等（可重复执行）
--       演示账号密码均为 123456（BCrypt 密文）
--       日期函数基于 CURDATE()，任意时间执行均可生成合理数据
-- ============================================================


-- ============================================================
-- 公共变量
-- ============================================================
SET @pwd = '$2a$10$bMQjW/K6kckBN/EUXFG89OfByv8BED9YE5GScD2CkRrGCHfctYAO2';   -- BCrypt(123456)
SET @today     = CURDATE();
SET @tomorrow  = DATE_ADD(CURDATE(), INTERVAL 1 DAY);
SET @day2      = DATE_ADD(CURDATE(), INTERVAL 2 DAY);
SET @yesterday = DATE_SUB(CURDATE(), INTERVAL 1 DAY);
SET @last_week = DATE_SUB(CURDATE(), INTERVAL 7 DAY);

-- ============================================================
-- 1. 角色（权限 + 默认门户）
-- ============================================================
INSERT INTO sys_role (role_code, role_name, default_portal) VALUES
('admin',      '系统管理员', 'admin'),
('doctor',     '医生',       'doctor'),
('cashier',    '收费员',     'admin'),
('pharmacist', '药师',       'admin'),
('patient',    '患者',       'patient')
ON DUPLICATE KEY UPDATE
    role_name      = VALUES(role_name),
    default_portal = VALUES(default_portal);

-- ============================================================
-- 2. 系统用户
--    管理员 1 人 | 医生 3 人 | 收费员 2 人 | 药师 2 人 | 患者 5 人
-- ============================================================
INSERT INTO sys_user (username, password, real_name, phone, phone_verified, account_type, status) VALUES
-- 管理员
('admin',     @pwd, '系统管理员', '13800000001', 0, 'internal', 1),
-- 医生（手机端医护登录）
('doctor01',  @pwd, '张伟',      '13800000002', 1, 'staff', 1),
('doctor02',  @pwd, '刘芳',      '13800000102', 1, 'staff', 1),
('doctor03',  @pwd, '陈明',      '13800000103', 1, 'staff', 1),
-- 收费员
('cashier01', @pwd, '李丽',      '13800000003', 0, 'internal', 1),
('cashier02', @pwd, '周芳',      '13800000202', 0, 'internal', 1),
-- 药师
('pharma01',  @pwd, '王强',      '13800000004', 0, 'internal', 1),
('pharma02',  @pwd, '赵敏',      '13800000302', 0, 'internal', 1),
-- 患者（手机端自助登录）
('patient01', @pwd, '王小明',    '13900001111', 1, 'patient', 1),
('patient02', @pwd, '李小红',    '13900002222', 1, 'patient', 1),
('patient03', @pwd, '赵小刚',    '13900003333', 1, 'patient', 1),
('patient04', @pwd, '刘翠花',    '13900004444', 1, 'patient', 1),
('patient05', @pwd, '孙建国',    '13900005555', 1, 'patient', 1)
ON DUPLICATE KEY UPDATE
    real_name      = VALUES(real_name),
    phone          = VALUES(phone),
    phone_verified = VALUES(phone_verified),
    account_type   = VALUES(account_type);

-- ============================================================
-- 3. 用户-角色关联
-- ============================================================
INSERT INTO sys_user_role (user_id, role_id)
SELECT u.id, r.id FROM sys_user u, sys_role r
WHERE (u.username = 'admin'     AND r.role_code = 'admin')
   OR (u.username = 'doctor01'  AND r.role_code = 'doctor')
   OR (u.username = 'doctor02'  AND r.role_code = 'doctor')
   OR (u.username = 'doctor03'  AND r.role_code = 'doctor')
   OR (u.username = 'cashier01' AND r.role_code = 'cashier')
   OR (u.username = 'cashier02' AND r.role_code = 'cashier')
   OR (u.username = 'pharma01'  AND r.role_code = 'pharmacist')
   OR (u.username = 'pharma02'  AND r.role_code = 'pharmacist')
   OR (u.username = 'patient01' AND r.role_code = 'patient')
   OR (u.username = 'patient02' AND r.role_code = 'patient')
   OR (u.username = 'patient03' AND r.role_code = 'patient')
   OR (u.username = 'patient04' AND r.role_code = 'patient')
   OR (u.username = 'patient05' AND r.role_code = 'patient')
ON DUPLICATE KEY UPDATE user_id = VALUES(user_id);

-- ============================================================
-- 4. 科室（含二级科室）
-- ============================================================
INSERT INTO dept (dept_code, dept_name, parent_id, status) VALUES
('NK',  '内科',     0, 1),
('WK',  '外科',     0, 1),
('EK',  '儿科',     0, 1),
('GK',  '骨科',     0, 1),
('FK',  '妇科',     0, 1),
('YF',  '药房',     0, 1)
ON DUPLICATE KEY UPDATE
    dept_name = VALUES(dept_name),
    status    = VALUES(status);

-- ============================================================
-- 5. 医护人员（user_id 绑定手机端登录）
-- ============================================================
INSERT INTO staff (staff_no, name, dept_id, title, user_id, status)
SELECT * FROM (
    SELECT 'D001' staff_no, '张伟' name, d.id dept_id, '主任医师' title, u.id user_id, 1 status
    FROM dept d, sys_user u WHERE d.dept_code = 'NK' AND u.username = 'doctor01'
    UNION ALL
    SELECT 'D002', '刘芳', d.id, '主治医师', u.id, 1
    FROM dept d, sys_user u WHERE d.dept_code = 'WK' AND u.username = 'doctor02'
    UNION ALL
    SELECT 'D003', '陈明', d.id, '副主任医师', u.id, 1
    FROM dept d, sys_user u WHERE d.dept_code = 'EK' AND u.username = 'doctor03'
) t
ON DUPLICATE KEY UPDATE
    name    = VALUES(name),
    title   = VALUES(title),
    user_id = VALUES(user_id);

-- ============================================================
-- 6. 患者档案（5 人，含不同年龄/性别/过敏史）
-- ============================================================
INSERT INTO patient (patient_no, name, gender, birth_date, phone, id_card, allergy_history, address) VALUES
('P20260001', '王小明', 1, '1990-05-12', '13900001111', NULL,                     NULL,       '北京市朝阳区建国路88号'),
('P20260002', '李小红', 0, '1985-08-20', '13900002222', '110101198508202345',     NULL,       '北京市海淀区中关村大街1号'),
('P20260003', '赵小刚', 1, '2018-03-01', '13900003333', NULL,                     '花粉过敏', '北京市西城区复兴门内大街28号'),
('P20260004', '刘翠花', 0, '1955-11-15', '13900004444', '110101195511150026',     '青霉素过敏', '北京市东城区王府井大街200号'),
('P20260005', '孙建国', 1, '1972-06-30', '13900005555', '110101197206300077',     NULL,       '北京市丰台区丽泽路16号')
ON DUPLICATE KEY UPDATE
    name            = VALUES(name),
    phone           = VALUES(phone),
    allergy_history = VALUES(allergy_history);

-- 绑定患者端账号
UPDATE patient p
JOIN sys_user u ON u.username = 'patient01' AND u.account_type = 'patient' AND u.real_name = '王小明'
SET p.user_id = u.id
WHERE p.patient_no = 'P20260001'
  AND (p.user_id IS NULL OR p.user_id <> u.id);

UPDATE patient p
JOIN sys_user u ON u.username = 'patient02' AND u.account_type = 'patient' AND u.real_name = '李小红'
SET p.user_id = u.id
WHERE p.patient_no = 'P20260002'
  AND (p.user_id IS NULL OR p.user_id <> u.id);

UPDATE patient p
JOIN sys_user u ON u.username = 'patient03' AND u.account_type = 'patient' AND u.real_name = '赵小刚'
SET p.user_id = u.id
WHERE p.patient_no = 'P20260003'
  AND (p.user_id IS NULL OR p.user_id <> u.id);

UPDATE patient p
JOIN sys_user u ON u.username = 'patient04' AND u.account_type = 'patient' AND u.real_name = '刘翠花'
SET p.user_id = u.id
WHERE p.patient_no = 'P20260004'
  AND (p.user_id IS NULL OR p.user_id <> u.id);

UPDATE patient p
JOIN sys_user u ON u.username = 'patient05' AND u.account_type = 'patient' AND u.real_name = '孙建国'
SET p.user_id = u.id
WHERE p.patient_no = 'P20260005'
  AND (p.user_id IS NULL OR p.user_id <> u.id);

-- ============================================================
-- 7. 药品字典（10 种，含抗生素/慢病药/儿童药）
-- ============================================================
INSERT INTO drug (drug_code, drug_name, spec, unit, price, manufacturer, status) VALUES
('D001', '阿莫西林胶囊',    '0.25g*24粒',  '盒', 18.50, '华北制药', 1),
('D002', '布洛芬缓释胶囊',  '0.3g*20粒',   '盒', 22.00, '中美史克', 1),
('D003', '感冒灵颗粒',      '10g*9袋',     '盒', 15.00, '三九医药', 1),
('D004', '维生素C片',       '0.1g*100片',  '瓶', 12.00, '东北制药', 1),
('D005', '硝苯地平缓释片',  '30mg*30片',   '盒', 28.50, '拜耳医药', 1),
('D006', '阿托伐他汀钙片',  '20mg*14片',   '盒', 42.00, '辉瑞制药', 1),
('D007', '头孢克肟颗粒',    '50mg*6袋',    '盒', 25.00, '白云山制药', 1),
('D008', '蒙脱石散',        '3g*10袋',     '盒', 16.80, '博福-益普生', 1),
('D009', '氯雷他定片',      '10mg*12片',   '盒', 19.90, '拜耳医药', 1),
('D010', '盐酸氨溴索口服溶液', '100ml:0.6g', '瓶', 13.50, '恒瑞医药', 1)
ON DUPLICATE KEY UPDATE
    drug_name    = VALUES(drug_name),
    price        = VALUES(price),
    manufacturer = VALUES(manufacturer);

-- ============================================================
-- 8. 药品库存（含低于预警线的警示库存）
-- ============================================================
INSERT INTO drug_stock (drug_id, quantity, warn_quantity) VALUES
((SELECT id FROM drug WHERE drug_code = 'D001'), 500, 50),
((SELECT id FROM drug WHERE drug_code = 'D002'), 300, 50),
((SELECT id FROM drug WHERE drug_code = 'D003'), 200, 50),
((SELECT id FROM drug WHERE drug_code = 'D004'), 800, 100),
((SELECT id FROM drug WHERE drug_code = 'D005'), 120, 30),
((SELECT id FROM drug WHERE drug_code = 'D006'), 80,  30),
((SELECT id FROM drug WHERE drug_code = 'D007'), 150, 30),
((SELECT id FROM drug WHERE drug_code = 'D008'), 60,  30),
((SELECT id FROM drug WHERE drug_code = 'D009'), 45,  50),   -- 低于预警线
((SELECT id FROM drug WHERE drug_code = 'D010'), 90,  30)
ON DUPLICATE KEY UPDATE
    quantity      = VALUES(quantity),
    warn_quantity = VALUES(warn_quantity);

-- ============================================================
-- 9. 诊疗项目（检查/检验/治疗三类）
-- ============================================================
INSERT INTO medical_item (item_code, item_name, item_type, price, dept_id, status) VALUES
('EX001', '血常规',              2, 25.00,  NULL, 1),
('EX002', '胸部CT',              1, 280.00, NULL, 1),
('EX003', '肝功能全项',          2, 120.00, NULL, 1),
('EX004', '心电图',              1, 35.00,  NULL, 1),
('EX005', '腹部B超（肝胆胰脾）',  1, 180.00, NULL, 1),
('TR001', '换药处置（小）',      3, 30.00,  NULL, 1),
('TR002', '清创缝合（中）',      3, 150.00, NULL, 1),
('TR003', '骨折手法复位',        3, 200.00, NULL, 1)
ON DUPLICATE KEY UPDATE
    item_name = VALUES(item_name),
    price     = VALUES(price);

-- ============================================================
-- 9B. 更多诊疗项目（丰富检验/检查/治疗）
-- ============================================================
INSERT INTO medical_item (item_code, item_name, item_type, price, dept_id, status) VALUES
-- 检验（2）：常规/生化/免疫
('EX006', '尿常规',                   2, 15.00,  NULL, 1),
('EX007', '大便常规',                 2, 12.00,  NULL, 1),
('EX008', '血脂全项（4项）',           2, 80.00,  NULL, 1),
('EX009', '肾功能三项',               2, 60.00,  NULL, 1),
('EX010', '甲状腺功能五项',           2, 180.00, NULL, 1),
('EX011', '空腹血糖',                 2, 10.00,  NULL, 1),
('EX012', '凝血功能四项',             2, 70.00,  NULL, 1),
('EX013', '肿瘤标志物筛查（男8项）',   2, 380.00, NULL, 1),
('EX014', '肿瘤标志物筛查（女8项）',   2, 420.00, NULL, 1),
('EX015', '超敏C反应蛋白',            2, 45.00,  NULL, 1),
('EX016', '电解质六项',               2, 55.00,  NULL, 1),
('EX017', '心肌酶谱四项',             2, 100.00, NULL, 1),
('EX018', '糖化血红蛋白',             2, 60.00,  NULL, 1),
('EX019', '乙肝五项（定量）',          2, 50.00,  NULL, 1),
('EX020', '梅毒血清学检测',           2, 40.00,  NULL, 1),
('EX021', 'HIV抗体初筛',             2, 35.00,  NULL, 1),
('EX022', '血沉（ESR）',             2, 18.00,  NULL, 1),
('EX023', '降钙素原（PCT）',          2, 120.00, NULL, 1),
('EX024', 'D-二聚体测定',            2, 90.00,  NULL, 1),
('EX025', '凝血酶原时间（PT）',       2, 25.00,  NULL, 1),
-- 检查（1）：影像/内镜/功能
('EX026', '胸部X光（DR正位）',        1, 80.00,  NULL, 1),
('EX027', '颈椎MRI平扫',             1, 650.00, NULL, 1),
('EX028', '腰椎CT平扫',              1, 320.00, NULL, 1),
('EX029', '心脏彩色超声',             1, 250.00, NULL, 1),
('EX030', '甲状腺B超',               1, 150.00, NULL, 1),
('EX031', '乳腺B超',                 1, 140.00, NULL, 1),
('EX032', '胃镜（普通）',            1, 300.00, NULL, 1),
('EX033', '肠镜（普通）',            1, 380.00, NULL, 1),
('EX034', '脑电图',                  1, 120.00, NULL, 1),
('EX035', '肺功能测定',              1, 90.00,  NULL, 1),
('EX036', '骨密度检测',              1, 100.00, NULL, 1),
('EX037', '24小时动态心电图',         1, 200.00, NULL, 1),
('EX038', '颈动脉彩超',              1, 220.00, NULL, 1),
('EX039', '泌尿系B超',               1, 160.00, NULL, 1),
('EX040', '子宫附件B超',             1, 150.00, NULL, 1),
-- 治疗（3）：处置/康复/中医
('TR004', '针灸治疗（次）',           3, 80.00,  NULL, 1),
('TR005', '推拿按摩（次）',           3, 100.00, NULL, 1),
('TR006', '拔罐治疗',                3, 40.00,  NULL, 1),
('TR007', '静脉输液（组）',          3, 25.00,  NULL, 1),
('TR008', '雾化吸入（次）',          3, 35.00,  NULL, 1),
('TR009', '低流量吸氧（小时）',       3, 8.00,   NULL, 1),
('TR010', '心理治疗（30分钟）',       3, 120.00, NULL, 1),
('TR011', '中频脉冲理疗（部位）',     3, 50.00,  NULL, 1),
('TR012', '关节腔穿刺注射',          3, 150.00, NULL, 1),
('TR013', '石膏固定（上肢）',        3, 180.00, NULL, 1),
('TR014', '伤口换药（大）',          3, 55.00,  NULL, 1),
('TR015', '术后拆线',                3, 40.00,  NULL, 1)
ON DUPLICATE KEY UPDATE
    item_name = VALUES(item_name),
    price     = VALUES(price);

-- ============================================================
-- 10. 排班号源（各科室 × 上下午 × 三天）
-- ============================================================
INSERT INTO schedule (dept_id, staff_id, work_date, time_period, total_count, remaining_count, register_fee)
SELECT * FROM (
    -- 内科 张伟 - 今天下午、明天上午、后天上午
    SELECT d.id dept_id, s.id staff_id, @today work_date, '下午' time_period, 15 total_count, 12 remaining_count, 10.00 register_fee FROM dept d, staff s WHERE d.dept_code = 'NK' AND s.staff_no = 'D001'
    UNION ALL SELECT d.id, s.id, @tomorrow, '上午', 20, 20, 10.00 FROM dept d, staff s WHERE d.dept_code = 'NK' AND s.staff_no = 'D001'
    UNION ALL SELECT d.id, s.id, @day2,     '上午', 20, 20, 10.00 FROM dept d, staff s WHERE d.dept_code = 'NK' AND s.staff_no = 'D001'
    -- 外科 刘芳 - 明天上下午、后天上午
    UNION ALL SELECT d.id, s.id, @tomorrow, '上午', 15, 10, 15.00 FROM dept d, staff s WHERE d.dept_code = 'WK' AND s.staff_no = 'D002'
    UNION ALL SELECT d.id, s.id, @tomorrow, '下午', 15, 15, 15.00 FROM dept d, staff s WHERE d.dept_code = 'WK' AND s.staff_no = 'D002'
    UNION ALL SELECT d.id, s.id, @day2,     '上午', 15, 15, 15.00 FROM dept d, staff s WHERE d.dept_code = 'WK' AND s.staff_no = 'D002'
    -- 儿科 陈明 - 今天下午、明天上午
    UNION ALL SELECT d.id, s.id, @today,    '下午', 10,  5, 20.00 FROM dept d, staff s WHERE d.dept_code = 'EK' AND s.staff_no = 'D003'
    UNION ALL SELECT d.id, s.id, @tomorrow, '上午', 10, 10, 20.00 FROM dept d, staff s WHERE d.dept_code = 'EK' AND s.staff_no = 'D003'
) t
ON DUPLICATE KEY UPDATE
    total_count     = VALUES(total_count),
    remaining_count = VALUES(remaining_count);

-- ============================================================
-- 11. 挂号单（多种状态）
--     REG01-03 已就诊（含就诊记录）| REG04 已挂号（待就诊）| REG05 已退号
-- ============================================================
-- 已就诊：内科 王小明（昨日）
INSERT INTO registration (reg_no, patient_id, schedule_id, dept_id, staff_id, reg_time, reg_fee, status, cashier_id, registrant_user_id)
SELECT 'REG20260001', p.id, sch.id, sch.dept_id, sch.staff_id, @yesterday + INTERVAL 8 HOUR, sch.register_fee, 2, u.id, NULL
FROM patient p, sys_user u, schedule sch, dept d, staff s
WHERE p.patient_no = 'P20260001' AND u.username = 'cashier01'
  AND d.dept_code = 'NK' AND s.staff_no = 'D001'
  AND sch.dept_id = d.id AND sch.staff_id = s.id AND sch.work_date = @yesterday
LIMIT 1
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- 已就诊：外科 李小红（昨天下午）
INSERT INTO registration (reg_no, patient_id, schedule_id, dept_id, staff_id, reg_time, reg_fee, status, cashier_id, registrant_user_id)
SELECT 'REG20260002', p.id, sch.id, sch.dept_id, sch.staff_id, @yesterday + INTERVAL 14 HOUR, sch.register_fee, 2, u.id, NULL
FROM patient p, sys_user u, schedule sch, dept d, staff s
WHERE p.patient_no = 'P20260002' AND u.username = 'cashier01'
  AND d.dept_code = 'WK' AND s.staff_no = 'D002'
  AND sch.dept_id = d.id AND sch.staff_id = s.id AND sch.work_date = @yesterday
LIMIT 1
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- 已就诊：儿科 赵小刚（昨天下午）
INSERT INTO registration (reg_no, patient_id, schedule_id, dept_id, staff_id, reg_time, reg_fee, status, cashier_id, registrant_user_id)
SELECT 'REG20260003', p.id, sch.id, sch.dept_id, sch.staff_id, @yesterday + INTERVAL 15 HOUR, sch.register_fee, 2, u.id, NULL
FROM patient p, sys_user u, schedule sch, dept d, staff s
WHERE p.patient_no = 'P20260003' AND u.username = 'cashier02'
  AND d.dept_code = 'EK' AND s.staff_no = 'D003'
  AND sch.dept_id = d.id AND sch.staff_id = s.id AND sch.work_date = @yesterday
LIMIT 1
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- 已挂号（待就诊）：内科 王小明（今天下午的号）
INSERT INTO registration (reg_no, patient_id, schedule_id, dept_id, staff_id, reg_time, reg_fee, status, cashier_id, registrant_user_id)
SELECT 'REG20260004', p.id, sch.id, sch.dept_id, sch.staff_id, NOW(), sch.register_fee, 1, u.id, NULL
FROM patient p, sys_user u, schedule sch, dept d, staff s
WHERE p.patient_no = 'P20260001' AND u.username = 'cashier01'
  AND d.dept_code = 'NK' AND s.staff_no = 'D001'
  AND sch.dept_id = d.id AND sch.staff_id = s.id AND sch.work_date = @today
LIMIT 1
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- 已挂号：儿科 刘翠花（今天下午）
INSERT INTO registration (reg_no, patient_id, schedule_id, dept_id, staff_id, reg_time, reg_fee, status, cashier_id, registrant_user_id)
SELECT 'REG20260005', p.id, sch.id, sch.dept_id, sch.staff_id, NOW(), sch.register_fee, 1, u.id, NULL
FROM patient p, sys_user u, schedule sch, dept d, staff s
WHERE p.patient_no = 'P20260004' AND u.username = 'cashier02'
  AND d.dept_code = 'EK' AND s.staff_no = 'D003'
  AND sch.dept_id = d.id AND sch.staff_id = s.id AND sch.work_date = @today
LIMIT 1
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- 已退号：孙建国（外科 明天上午 → 后来取消了）
INSERT INTO registration (reg_no, patient_id, schedule_id, dept_id, staff_id, reg_time, reg_fee, status, cashier_id, registrant_user_id)
SELECT 'REG20260006', p.id, sch.id, sch.dept_id, sch.staff_id, NOW(), sch.register_fee, 3, u.id, NULL
FROM patient p, sys_user u, schedule sch, dept d, staff s
WHERE p.patient_no = 'P20260005' AND u.username = 'cashier01'
  AND d.dept_code = 'WK' AND s.staff_no = 'D002'
  AND sch.dept_id = d.id AND sch.staff_id = s.id AND sch.work_date = @tomorrow
LIMIT 1
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- 更新已使用号源的剩余数（内科 今天下午已消耗 1，外科 明天上午已消耗 1）
UPDATE schedule sch
JOIN dept d ON d.id = sch.dept_id
SET sch.remaining_count = sch.remaining_count - 1
WHERE d.dept_code = 'NK' AND sch.work_date = @today;

UPDATE schedule sch
JOIN dept d ON d.id = sch.dept_id
SET sch.remaining_count = sch.remaining_count - 1
WHERE d.dept_code = 'WK' AND sch.work_date = @tomorrow;

-- 退号则恢复号源
UPDATE schedule sch
JOIN dept d ON d.id = sch.dept_id
SET sch.remaining_count = sch.remaining_count + 1
WHERE d.dept_code = 'WK' AND sch.work_date = @tomorrow;

-- ============================================================
-- 12. 门诊就诊（对应已就诊的 3 个挂号单）
-- ============================================================
INSERT INTO outpatient_visit (visit_no, registration_id, patient_id, staff_id, visit_time, chief_complaint, diagnosis, status)
SELECT 'VIS20260001', r.id, r.patient_id, r.staff_id, @yesterday + INTERVAL 9 HOUR, '发热、咳嗽3天，咳黄痰', '急性支气管炎', 2
FROM registration r WHERE r.reg_no = 'REG20260001'
LIMIT 1
ON DUPLICATE KEY UPDATE status = VALUES(status);

INSERT INTO outpatient_visit (visit_no, registration_id, patient_id, staff_id, visit_time, chief_complaint, diagnosis, status)
SELECT 'VIS20260002', r.id, r.patient_id, r.staff_id, @yesterday + INTERVAL 14 HOUR, '右前臂外伤1小时，皮肤裂伤约3cm', '前臂皮肤裂伤', 2
FROM registration r WHERE r.reg_no = 'REG20260002'
LIMIT 1
ON DUPLICATE KEY UPDATE status = VALUES(status);

INSERT INTO outpatient_visit (visit_no, registration_id, patient_id, staff_id, visit_time, chief_complaint, diagnosis, status)
SELECT 'VIS20260003', r.id, r.patient_id, r.staff_id, @yesterday + INTERVAL 16 HOUR, '腹泻2天，水样便，每日5-6次', '小儿肠炎', 2
FROM registration r WHERE r.reg_no = 'REG20260003'
LIMIT 1
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- ============================================================
-- 13. 收费结算单（对应 3 个已就诊的挂号费）
-- ============================================================
-- 王小明 - 挂号费（微信支付）
INSERT INTO charge_order (order_no, patient_id, visit_id, total_amount, paid_amount, pay_type, pay_status, cashier_id, pay_time)
SELECT 'CHG20260001', r.patient_id, v.id, r.reg_fee, r.reg_fee, 2, 1, r.cashier_id, @yesterday + INTERVAL 8 HOUR
FROM registration r, outpatient_visit v
WHERE r.reg_no = 'REG20260001' AND v.registration_id = r.id
LIMIT 1
ON DUPLICATE KEY UPDATE pay_status = VALUES(pay_status);

-- 李小红 - 挂号费 + 清创缝合费（支付宝支付，已付）
INSERT INTO charge_order (order_no, patient_id, visit_id, total_amount, paid_amount, pay_type, pay_status, cashier_id, pay_time)
SELECT 'CHG20260002', r.patient_id, v.id, r.reg_fee + 150.00, r.reg_fee + 150.00, 3, 1, r.cashier_id, @yesterday + INTERVAL 14 HOUR
FROM registration r, outpatient_visit v
WHERE r.reg_no = 'REG20260002' AND v.registration_id = r.id
LIMIT 1
ON DUPLICATE KEY UPDATE pay_status = VALUES(pay_status);

-- 赵小刚 - 挂号费 + 检查费 + 药费（现金支付，已付）
-- 明细：挂号费20 + 血常规25 + 药费30.30 = 75.30
INSERT INTO charge_order (order_no, patient_id, visit_id, total_amount, paid_amount, pay_type, pay_status, cashier_id, pay_time)
SELECT 'CHG20260003', r.patient_id, v.id, r.reg_fee + 25.00 + 30.30, r.reg_fee + 25.00 + 30.30, 1, 1, r.cashier_id, @yesterday + INTERVAL 16 HOUR
FROM registration r, outpatient_visit v
WHERE r.reg_no = 'REG20260003' AND v.registration_id = r.id
LIMIT 1
ON DUPLICATE KEY UPDATE pay_status = VALUES(pay_status);

-- 王小明 - 今天挂号费（待支付）
INSERT INTO charge_order (order_no, patient_id, visit_id, total_amount, paid_amount, pay_type, pay_status, cashier_id, pay_time)
SELECT 'CHG20260004', r.patient_id, NULL, r.reg_fee, 0, NULL, 0, r.cashier_id, NULL
FROM registration r WHERE r.reg_no = 'REG20260004'
LIMIT 1
ON DUPLICATE KEY UPDATE pay_status = VALUES(pay_status);

-- ============================================================
-- 14. 费用明细
-- ============================================================
-- CHG20260001：挂号费
INSERT INTO charge_detail (charge_order_id, biz_type, biz_id, item_name, amount)
SELECT o.id, 1, r.id, '挂号费（内科）', r.reg_fee
FROM charge_order o, registration r
WHERE o.order_no = 'CHG20260001' AND r.reg_no = 'REG20260001'
LIMIT 1
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

-- CHG20260002：挂号费 + 清创缝合
INSERT INTO charge_detail (charge_order_id, biz_type, biz_id, item_name, amount)
SELECT o.id, 1, r.id, '挂号费（外科）', r.reg_fee
FROM charge_order o, registration r
WHERE o.order_no = 'CHG20260002' AND r.reg_no = 'REG20260002'
UNION ALL
SELECT o.id, 3, m.id, '清创缝合（中）', 150.00
FROM charge_order o, medical_item m
WHERE o.order_no = 'CHG20260002' AND m.item_code = 'TR002'
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

-- CHG20260003：挂号费 + 血常规 + 药费（感冒灵+蒙脱石散）
INSERT INTO charge_detail (charge_order_id, biz_type, biz_id, item_name, amount)
SELECT o.id, 1, r.id, '挂号费（儿科）', r.reg_fee
FROM charge_order o, registration r
WHERE o.order_no = 'CHG20260003' AND r.reg_no = 'REG20260003'
UNION ALL
SELECT o.id, 3, m.id, '血常规', 25.00
FROM charge_order o, medical_item m
WHERE o.order_no = 'CHG20260003' AND m.item_code = 'EX001'
UNION ALL
SELECT o.id, 2, p.id, '药费', 29.80
FROM charge_order o, prescription p
WHERE o.order_no = 'CHG20260003' AND p.rx_no = 'RX20260003'
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

-- CHG20260004：挂号费（待支付）
INSERT INTO charge_detail (charge_order_id, biz_type, biz_id, item_name, amount)
SELECT o.id, 1, r.id, '挂号费（内科）', r.reg_fee
FROM charge_order o, registration r
WHERE o.order_no = 'CHG20260004' AND r.reg_no = 'REG20260004'
LIMIT 1
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

-- 王小明 - 超敏C反应蛋白 + 胸部X光（已支付）
INSERT INTO charge_order (order_no, patient_id, visit_id, total_amount, paid_amount, pay_type, pay_status, cashier_id, pay_time)
SELECT 'CHG20260005', v.patient_id, v.id, 45.00 + 80.00, 45.00 + 80.00, 2, 1, u.id, @yesterday + INTERVAL 10 HOUR
FROM outpatient_visit v, sys_user u
WHERE v.visit_no = 'VIS20260001' AND u.username = 'cashier02'
LIMIT 1
ON DUPLICATE KEY UPDATE pay_status = VALUES(pay_status);

INSERT INTO charge_detail (charge_order_id, biz_type, biz_id, item_name, amount)
SELECT o.id, 3, m.id, m.item_name, m.price
FROM charge_order o, medical_item m
WHERE o.order_no = 'CHG20260005' AND m.item_code = 'EX015'
UNION ALL
SELECT o.id, 3, m.id, m.item_name, m.price
FROM charge_order o, medical_item m
WHERE o.order_no = 'CHG20260005' AND m.item_code = 'EX026'
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

-- 李小红 - 血常规 + 凝血功能四项（已支付）
INSERT INTO charge_order (order_no, patient_id, visit_id, total_amount, paid_amount, pay_type, pay_status, cashier_id, pay_time)
SELECT 'CHG20260006', v.patient_id, v.id, 25.00 + 70.00, 25.00 + 70.00, 2, 1, u.id, @yesterday + INTERVAL 15 HOUR
FROM outpatient_visit v, sys_user u
WHERE v.visit_no = 'VIS20260002' AND u.username = 'cashier01'
LIMIT 1
ON DUPLICATE KEY UPDATE pay_status = VALUES(pay_status);

INSERT INTO charge_detail (charge_order_id, biz_type, biz_id, item_name, amount)
SELECT o.id, 3, m.id, m.item_name, m.price
FROM charge_order o, medical_item m
WHERE o.order_no = 'CHG20260006' AND m.item_code = 'EX001'
UNION ALL
SELECT o.id, 3, m.id, m.item_name, m.price
FROM charge_order o, medical_item m
WHERE o.order_no = 'CHG20260006' AND m.item_code = 'EX012'
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

-- 赵小刚 - 大便常规 + 电解质六项（已支付）
INSERT INTO charge_order (order_no, patient_id, visit_id, total_amount, paid_amount, pay_type, pay_status, cashier_id, pay_time)
SELECT 'CHG20260007', v.patient_id, v.id, 12.00 + 55.00, 12.00 + 55.00, 1, 1, u.id, @yesterday + INTERVAL 17 HOUR
FROM outpatient_visit v, sys_user u
WHERE v.visit_no = 'VIS20260003' AND u.username = 'cashier02'
LIMIT 1
ON DUPLICATE KEY UPDATE pay_status = VALUES(pay_status);

INSERT INTO charge_detail (charge_order_id, biz_type, biz_id, item_name, amount)
SELECT o.id, 3, m.id, m.item_name, m.price
FROM charge_order o, medical_item m
WHERE o.order_no = 'CHG20260007' AND m.item_code = 'EX007'
UNION ALL
SELECT o.id, 3, m.id, m.item_name, m.price
FROM charge_order o, medical_item m
WHERE o.order_no = 'CHG20260007' AND m.item_code = 'EX016'
ON DUPLICATE KEY UPDATE amount = VALUES(amount);

-- ============================================================
-- 15. 检查检验申请（对应王小明/赵小刚的已就诊记录）
-- ============================================================
-- 王小明 - 血常规 + 胸部CT（已缴费，待执行）
INSERT INTO exam_request (request_no, visit_id, patient_id, item_id, amount, status)
SELECT 'EXR20260001', v.id, v.patient_id, m.id, m.price, 2
FROM outpatient_visit v, medical_item m
WHERE v.visit_no = 'VIS20260001' AND m.item_code = 'EX001'
LIMIT 1
ON DUPLICATE KEY UPDATE status = VALUES(status);

INSERT INTO exam_request (request_no, visit_id, patient_id, item_id, amount, status)
SELECT 'EXR20260002', v.id, v.patient_id, m.id, m.price, 2
FROM outpatient_visit v, medical_item m
WHERE v.visit_no = 'VIS20260001' AND m.item_code = 'EX002'
LIMIT 1
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- 赵小刚 - 血常规（已缴费，已执行，有结果）
INSERT INTO exam_request (request_no, visit_id, patient_id, item_id, amount, status)
SELECT 'EXR20260003', v.id, v.patient_id, m.id, m.price, 3
FROM outpatient_visit v, medical_item m
WHERE v.visit_no = 'VIS20260003' AND m.item_code = 'EX001'
LIMIT 1
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- 赵小刚 - 肝功能全项（已缴费，已完成）
INSERT INTO exam_request (request_no, visit_id, patient_id, item_id, amount, status)
SELECT 'EXR20260004', v.id, v.patient_id, m.id, m.price, 4
FROM outpatient_visit v, medical_item m
WHERE v.visit_no = 'VIS20260003' AND m.item_code = 'EX003'
LIMIT 1
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- ============================================================
-- 16. 检查结果
-- ============================================================
-- 赵小刚 - 血常规结果
INSERT INTO exam_result (request_id, result_text, report_time, technician_id)
SELECT r.id,
       '【血常规】WBC 11.2×10^9/L ↑（参考 4-10），NEUT% 78% ↑（参考 50-70），LYMPH% 18%（参考 20-40），RBC 4.5×10^12/L，Hb 135g/L，PLT 220×10^9/L。提示：细菌感染可能。',
       @yesterday + INTERVAL 17 HOUR, NULL
FROM exam_request r WHERE r.request_no = 'EXR20260003'
LIMIT 1
ON DUPLICATE KEY UPDATE result_text = VALUES(result_text);

-- 赵小刚 - 肝功能结果
INSERT INTO exam_result (request_id, result_text, report_time, technician_id)
SELECT r.id,
       '【肝功能】ALT 25U/L（参考 0-40），AST 22U/L（参考 0-40），TBIL 12μmol/L（参考 3.4-17.1），DBIL 3.5μmol/L，ALB 42g/L。各项指标均在正常范围内。',
       @yesterday + INTERVAL 18 HOUR, NULL
FROM exam_request r WHERE r.request_no = 'EXR20260004'
LIMIT 1
ON DUPLICATE KEY UPDATE result_text = VALUES(result_text);

-- 王小明 - 超敏C反应蛋白（已执行，有结果）
INSERT INTO exam_request (request_no, visit_id, patient_id, item_id, amount, status)
SELECT 'EXR20260005', v.id, v.patient_id, m.id, m.price, 3
FROM outpatient_visit v, medical_item m
WHERE v.visit_no = 'VIS20260001' AND m.item_code = 'EX015'
LIMIT 1
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- 王小明 - 胸部X光（已执行，有结果）
INSERT INTO exam_request (request_no, visit_id, patient_id, item_id, amount, status)
SELECT 'EXR20260006', v.id, v.patient_id, m.id, m.price, 3
FROM outpatient_visit v, medical_item m
WHERE v.visit_no = 'VIS20260001' AND m.item_code = 'EX026'
LIMIT 1
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- 李小红 - 血常规（已缴费，已执行，有结果）
INSERT INTO exam_request (request_no, visit_id, patient_id, item_id, amount, status)
SELECT 'EXR20260007', v.id, v.patient_id, m.id, m.price, 3
FROM outpatient_visit v, medical_item m
WHERE v.visit_no = 'VIS20260002' AND m.item_code = 'EX001'
LIMIT 1
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- 李小红 - 凝血功能四项（已缴费，待执行）
INSERT INTO exam_request (request_no, visit_id, patient_id, item_id, amount, status)
SELECT 'EXR20260008', v.id, v.patient_id, m.id, m.price, 2
FROM outpatient_visit v, medical_item m
WHERE v.visit_no = 'VIS20260002' AND m.item_code = 'EX012'
LIMIT 1
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- 赵小刚 - 大便常规（已缴费，已执行，有结果）
INSERT INTO exam_request (request_no, visit_id, patient_id, item_id, amount, status)
SELECT 'EXR20260009', v.id, v.patient_id, m.id, m.price, 3
FROM outpatient_visit v, medical_item m
WHERE v.visit_no = 'VIS20260003' AND m.item_code = 'EX007'
LIMIT 1
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- 赵小刚 - 电解质六项（已缴费，已执行，有结果）
INSERT INTO exam_request (request_no, visit_id, patient_id, item_id, amount, status)
SELECT 'EXR20260010', v.id, v.patient_id, m.id, m.price, 3
FROM outpatient_visit v, medical_item m
WHERE v.visit_no = 'VIS20260003' AND m.item_code = 'EX016'
LIMIT 1
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- ============================================================
-- 16B. 更多检查结果
-- ============================================================
-- 王小明 - 超敏C反应蛋白结果
INSERT INTO exam_result (request_id, result_text, report_time, technician_id)
SELECT r.id,
       '【超敏C反应蛋白】hs-CRP 28.5 mg/L ↑（参考 < 5.0）。提示：中度急性炎症反应，与临床表现一致。',
       @yesterday + INTERVAL 10 HOUR, NULL
FROM exam_request r WHERE r.request_no = 'EXR20260005'
LIMIT 1
ON DUPLICATE KEY UPDATE result_text = VALUES(result_text);

-- 王小明 - 胸部X光结果
INSERT INTO exam_result (request_id, result_text, report_time, technician_id)
SELECT r.id,
       '【胸部X光（DR正位）】双肺纹理增粗、增多，右下肺野可见片状模糊阴影。心影大小正常，纵隔无增宽，双侧肋膈角清晰。结论：右下肺感染征象，建议结合临床。',
       @yesterday + INTERVAL 10 HOUR, NULL
FROM exam_request r WHERE r.request_no = 'EXR20260006'
LIMIT 1
ON DUPLICATE KEY UPDATE result_text = VALUES(result_text);

-- 李小红 - 血常规结果
INSERT INTO exam_result (request_id, result_text, report_time, technician_id)
SELECT r.id,
       '【血常规】WBC 7.8×10^9/L（参考 4-10），RBC 4.2×10^12/L，Hb 138g/L，PLT 289×10^9/L，NEUT% 62%（参考 50-70），LYMPH% 30%（参考 20-40）。各项指标基本正常，无明显感染征象。',
       @yesterday + INTERVAL 15 HOUR, NULL
FROM exam_request r WHERE r.request_no = 'EXR20260007'
LIMIT 1
ON DUPLICATE KEY UPDATE result_text = VALUES(result_text);

-- 赵小刚 - 大便常规结果
INSERT INTO exam_result (request_id, result_text, report_time, technician_id)
SELECT r.id,
       '【大便常规】颜色：黄色，性状：稀水样，镜检：WBC 3-5/HP ↑（参考 0-2），RBC 0-1/HP，潜血：阴性（-），轮状病毒抗原：阳性（+）。结论：轮状病毒肠炎。',
       @yesterday + INTERVAL 17 HOUR, NULL
FROM exam_request r WHERE r.request_no = 'EXR20260009'
LIMIT 1
ON DUPLICATE KEY UPDATE result_text = VALUES(result_text);

-- 赵小刚 - 电解质六项结果
INSERT INTO exam_result (request_id, result_text, report_time, technician_id)
SELECT r.id,
       '【电解质六项】K+ 3.8 mmol/L（参考 3.5-5.3），Na+ 136 mmol/L ↓（参考 137-147），Cl- 98 mmol/L（参考 99-110），Ca2+ 2.35 mmol/L（参考 2.1-2.6），Mg2+ 0.85 mmol/L（参考 0.7-1.1），P 1.25 mmol/L（参考 0.81-1.45）。结论：轻度低钠血症，建议补液治疗。',
       @yesterday + INTERVAL 17 HOUR, NULL
FROM exam_request r WHERE r.request_no = 'EXR20260010'
LIMIT 1
ON DUPLICATE KEY UPDATE result_text = VALUES(result_text);

-- ============================================================
-- 17. 处方（对应已就诊的 3 位患者）
-- ============================================================
-- 王小明 - 阿莫西林 + 感冒灵（已缴费已发药）
INSERT INTO prescription (rx_no, visit_id, patient_id, staff_id, total_amount, status)
SELECT 'RX20260001', v.id, v.patient_id, v.staff_id, 52.00, 3
FROM outpatient_visit v WHERE v.visit_no = 'VIS20260001'
LIMIT 1
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- 李小红 - 布洛芬 + 头孢克肟（已缴费，未发药）
INSERT INTO prescription (rx_no, visit_id, patient_id, staff_id, total_amount, status)
SELECT 'RX20260002', v.id, v.patient_id, v.staff_id, 69.00, 2
FROM outpatient_visit v WHERE v.visit_no = 'VIS20260002'
LIMIT 1
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- 赵小刚 - 蒙脱石散 + 口服液盐（对应的就是 D008 蒙脱石散 + D007 头孢克肟）（已缴费已发药）
INSERT INTO prescription (rx_no, visit_id, patient_id, staff_id, total_amount, status)
SELECT 'RX20260003', v.id, v.patient_id, v.staff_id, 29.80, 3
FROM outpatient_visit v WHERE v.visit_no = 'VIS20260003'
LIMIT 1
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- ============================================================
-- 18. 处方明细
-- ============================================================
-- RX20260001：阿莫西林 ×2盒 + 感冒灵 ×1盒 = 18.5×2 + 15 = 52.00
INSERT INTO prescription_item (prescription_id, drug_id, quantity, unit_price, amount, usage_desc)
SELECT p.id, d.id, 2, d.price, 2 * d.price, '口服，一次2粒，一日3次，饭后服用'
FROM prescription p, drug d
WHERE p.rx_no = 'RX20260001' AND d.drug_code = 'D001'
UNION ALL
SELECT p.id, d.id, 1, d.price, 1 * d.price, '冲服，一次1袋，一日3次'
FROM prescription p, drug d
WHERE p.rx_no = 'RX20260001' AND d.drug_code = 'D003'
ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), usage_desc = VALUES(usage_desc);

-- RX20260002：布洛芬 ×1盒 + 头孢克肟 ×1盒 + 维生素C ×1瓶 = 22 + 25 + 12 = 59
INSERT INTO prescription_item (prescription_id, drug_id, quantity, unit_price, amount, usage_desc)
SELECT p.id, d.id, 1, d.price, 1 * d.price, '口服，一次1粒，一日2次，疼痛时服用'
FROM prescription p, drug d
WHERE p.rx_no = 'RX20260002' AND d.drug_code = 'D002'
UNION ALL
SELECT p.id, d.id, 1, d.price, 1 * d.price, '口服，一次1袋，一日2次'
FROM prescription p, drug d
WHERE p.rx_no = 'RX20260002' AND d.drug_code = 'D007'
UNION ALL
SELECT p.id, d.id, 1, d.price, 1 * d.price, '口服，一次2片，一日1次'
FROM prescription p, drug d
WHERE p.rx_no = 'RX20260002' AND d.drug_code = 'D004'
ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), usage_desc = VALUES(usage_desc);

-- RX20260003：蒙脱石散 ×1盒 + 盐酸氨溴索口服溶液 ×1瓶 = 16.80 + 13.50 = 30.30
INSERT INTO prescription_item (prescription_id, drug_id, quantity, unit_price, amount, usage_desc)
SELECT p.id, d.id, 1, d.price, 1 * d.price, '冲服，一次1袋，一日3次，餐前服用'
FROM prescription p, drug d
WHERE p.rx_no = 'RX20260003' AND d.drug_code = 'D008'
UNION ALL
SELECT p.id, d.id, 1, d.price, 1 * d.price, '口服，一次10ml，一日3次'
FROM prescription p, drug d
WHERE p.rx_no = 'RX20260003' AND d.drug_code = 'D010'
ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), usage_desc = VALUES(usage_desc);

-- 修正 CHG20260003 费用明细中的药费金额
# --（chg_order 已在插入时使用正确金额，但 charge_detail 中写死的 29.80 需要更新为 30.30）
UPDATE charge_detail cd
JOIN charge_order o ON o.id = cd.charge_order_id
SET cd.amount = 30.30
WHERE o.order_no = 'CHG20260003' AND cd.item_name = '药费';

-- ============================================================
-- 19. 发药记录
-- ============================================================
-- 王小明 - 处方已发药（王强药师）
INSERT INTO dispense_record (prescription_id, pharmacist_id, dispense_time, status)
SELECT p.id, u.id, @yesterday + INTERVAL 10 HOUR, 1
FROM prescription p, sys_user u
WHERE p.rx_no = 'RX20260001' AND u.username = 'pharma01'
LIMIT 1
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- 赵小刚 - 处方已发药（赵敏药师）
INSERT INTO dispense_record (prescription_id, pharmacist_id, dispense_time, status)
SELECT p.id, u.id, @yesterday + INTERVAL 17 HOUR, 1
FROM prescription p, sys_user u
WHERE p.rx_no = 'RX20260003' AND u.username = 'pharma02'
LIMIT 1
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- ============================================================
-- 20. 操作日志（演示最近操作流水）
-- ============================================================
INSERT INTO operation_log (user_id, module, action, request_uri, ip, create_time)
SELECT u.id, '挂号管理', '挂号', '/api/registration', '192.168.1.100', NOW() - INTERVAL 2 HOUR
FROM sys_user u WHERE u.username = 'cashier01'
UNION ALL
SELECT u.id, '收费管理', '收费', '/api/charge/pay', '192.168.1.100', NOW() - INTERVAL 1 HOUR
FROM sys_user u WHERE u.username = 'cashier01'
UNION ALL
SELECT u.id, '医生工作站', '录入诊断', '/api/visit/diagnosis', '192.168.1.101', NOW() - INTERVAL 30 MINUTE
FROM sys_user u WHERE u.username = 'doctor01'
UNION ALL
SELECT u.id, '处方管理', '开具处方', '/api/prescription', '192.168.1.101', NOW() - INTERVAL 20 MINUTE
FROM sys_user u WHERE u.username = 'doctor01'
UNION ALL
SELECT u.id, '发药管理', '发药', '/api/dispense', '192.168.1.102', NOW() - INTERVAL 10 MINUTE
FROM sys_user u WHERE u.username = 'pharma01'
UNION ALL
-- 检查检验日志
SELECT u.id, '检查检验', '开具检查申请', '/api/exam-request', '192.168.1.101', @yesterday + INTERVAL 9 HOUR
FROM sys_user u WHERE u.username = 'doctor01'
UNION ALL
SELECT u.id, '检查检验', '执行血常规', '/api/exam/result', '192.168.1.103', @yesterday + INTERVAL 9 HOUR
FROM sys_user u WHERE u.username = 'cashier01'
UNION ALL
SELECT u.id, '检查检验', '执行胸部X光', '/api/exam/result', '192.168.1.103', @yesterday + INTERVAL 10 HOUR
FROM sys_user u WHERE u.username = 'cashier01'
UNION ALL
SELECT u.id, '检查检验', '开具检查申请', '/api/exam-request', '192.168.1.101', @yesterday + INTERVAL 16 HOUR
FROM sys_user u WHERE u.username = 'doctor03'
UNION ALL
SELECT u.id, '检查检验', '执行大便常规', '/api/exam/result', '192.168.1.103', @yesterday + INTERVAL 17 HOUR
FROM sys_user u WHERE u.username = 'cashier02'
UNION ALL
SELECT u.id, '检查检验', '录入肝功能结果', '/api/exam/result', '192.168.1.103', @yesterday + INTERVAL 18 HOUR
FROM sys_user u WHERE u.username = 'cashier02'
UNION ALL
SELECT u.id, '收费管理', '收取检查费', '/api/charge/pay', '192.168.1.100', @yesterday + INTERVAL 10 HOUR
FROM sys_user u WHERE u.username = 'cashier02'
ON DUPLICATE KEY UPDATE action = VALUES(action);
