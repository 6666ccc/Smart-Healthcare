-- ============================================================
-- 迁移: 给 registration 表添加 registrant_user_id 字段
-- 用途: 记录挂号人（谁帮忙挂的号），前端据此同时展示
--       自己的挂号 + 曾帮别人挂的号（如家长给子女挂号）
-- ============================================================

USE wenrun;

ALTER TABLE registration
    ADD COLUMN registrant_user_id bigint DEFAULT NULL
    COMMENT '挂号人用户ID（谁帮忙挂的号）'
    AFTER cashier_id;
