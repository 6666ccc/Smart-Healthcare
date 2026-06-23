-- 更新 ai-service 客户端密钥（若已存在旧记录）
-- 开发环境明文: ai-service-dev-secret-2026

UPDATE oauth_client
SET client_secret = '$2a$10$LxhoF0A22G.GE6Sv7t2NB.TXNcocj0LYuMG8UG0CSQJJ0MeNGGLtu',
    grant_types   = 'client_credentials',
    scopes        = 'ai:invoke',
    access_token_ttl = 3600,
    refresh_token_ttl = 0
WHERE client_id = 'ai-service';
