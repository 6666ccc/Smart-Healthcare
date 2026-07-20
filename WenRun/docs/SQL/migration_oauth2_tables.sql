-- OAuth 2.0 令牌相关表（幂等迁移）
-- 若表已存在则跳过

CREATE TABLE IF NOT EXISTS oauth_client
(
    id                bigint auto_increment
        primary key,
    client_id         varchar(64)                        not null comment '客户端标识: huiliao-web / huiliao-mobile / ai-service',
    client_secret     varchar(128)                       null comment '机密客户端密钥（BCrypt），公开客户端可为空',
    client_name       varchar(100)                       not null,
    grant_types       varchar(200)                       not null comment 'password,refresh_token,client_credentials',
    scopes            varchar(200) default 'read write'  null,
    access_token_ttl  int          default 1800          null comment 'Access Token 秒数',
    refresh_token_ttl int          default 604800          null comment 'Refresh Token 秒数',
    status            tinyint      default 1             null,
    create_time       datetime     default CURRENT_TIMESTAMP null,
    constraint client_id
        unique (client_id)
)
    comment 'OAuth2 客户端';

CREATE TABLE IF NOT EXISTS oauth_refresh_token
(
    id          bigint auto_increment
        primary key,
    token_hash  varchar(64)                        not null comment 'SHA-256(refresh_token)，明文不入库',
    user_id     bigint                             not null,
    client_id   varchar(64)                        not null,
    expires_at  datetime                           not null,
    revoked     tinyint  default 0                 not null,
    replaced_by bigint                             null comment '轮转后的新 token id',
    user_agent  varchar(200)                       null,
    ip          varchar(50)                          null,
    create_time datetime default CURRENT_TIMESTAMP null,
    constraint token_hash
        unique (token_hash),
    constraint fk_ort_user
        foreign key (user_id) references sys_user (id)
)
    comment 'OAuth2 Refresh Token';

CREATE INDEX IF NOT EXISTS idx_ort_user_client ON oauth_refresh_token (user_id, client_id, revoked);

CREATE TABLE IF NOT EXISTS oauth_token_blacklist
(
    id          bigint auto_increment
        primary key,
    jti         varchar(64)                        not null comment 'JWT ID',
    expires_at  datetime                           not null comment '与 access token 同步过期，便于清理',
    create_time datetime default CURRENT_TIMESTAMP null,
    constraint jti
        unique (jti)
)
    comment 'Access Token 黑名单（登出/强制下线）';
