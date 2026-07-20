-- 幂等：补建 JWT 登出黑名单表（启动时 BlacklistCleanupRunner 依赖此表）

USE wenrun;

CREATE TABLE IF NOT EXISTS oauth_token_blacklist
(
    id          bigint auto_increment
        primary key,
    jti         varchar(64)                        not null comment 'JWT ID',
    expires_at  datetime                           not null comment '与 access token 同步过期，便于清理',
    create_time datetime default CURRENT_TIMESTAMP null,
    constraint uk_blacklist_jti
        unique (jti)
)
    comment 'JWT 登出黑名单';
