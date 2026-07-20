-- ============================================================
-- 温润 WenRun — 基础种子数据（建表 wenrun.sql 之后执行）
-- 演示账号密码均为 password
-- ============================================================

USE wenrun;

SET @pwd = '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG';

-- 角色（注册接口依赖 patient 角色）
INSERT INTO sys_role (role_code, role_name, default_portal) VALUES
('admin',      '系统管理员', 'admin'),
('doctor',     '医生',       'doctor'),
('cashier',    '收费员',     'admin'),
('pharmacist', '药师',       'admin'),
('patient',    '患者',       'patient')
ON DUPLICATE KEY UPDATE
    role_name      = VALUES(role_name),
    default_portal = VALUES(default_portal);

-- 演示患者账号
INSERT INTO sys_user (username, password, real_name, phone, phone_verified, account_type, status) VALUES
('patient01', @pwd, '王小明', '13900001111', 1, 'patient', 1)
ON DUPLICATE KEY UPDATE
    real_name      = VALUES(real_name),
    phone          = VALUES(phone),
    phone_verified = VALUES(phone_verified),
    account_type   = VALUES(account_type);

INSERT INTO sys_user_role (user_id, role_id)
SELECT u.id, r.id FROM sys_user u, sys_role r
WHERE u.username = 'patient01' AND r.role_code = 'patient'
ON DUPLICATE KEY UPDATE user_id = VALUES(user_id);

INSERT INTO patient (patient_no, name, gender, phone, user_id)
SELECT 'P20260001', '王小明', 1, '13900001111', u.id
FROM sys_user u
WHERE u.username = 'patient01'
  AND NOT EXISTS (SELECT 1 FROM patient p WHERE p.user_id = u.id);
