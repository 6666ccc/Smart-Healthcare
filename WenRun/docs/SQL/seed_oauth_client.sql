-- OAuth 客户端种子数据（幂等：按 client_id 跳过已存在记录）

INSERT INTO oauth_client (client_id, client_secret, client_name, grant_types, scopes, access_token_ttl, refresh_token_ttl, status)
SELECT 'huiliao-web', NULL, '温润 Web 前端', 'password,refresh_token', 'read write', 1800, 604800, 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM oauth_client WHERE client_id = 'huiliao-web');

INSERT INTO oauth_client (client_id, client_secret, client_name, grant_types, scopes, access_token_ttl, refresh_token_ttl, status)
SELECT 'huiliao-mobile', NULL, '温润 移动端', 'password,refresh_token', 'read write', 1800, 2592000, 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM oauth_client WHERE client_id = 'huiliao-mobile');

INSERT INTO oauth_client (client_id, client_secret, client_name, grant_types, scopes, access_token_ttl, refresh_token_ttl, status)
SELECT 'ai-service', '$2a$10$LxhoF0A22G.GE6Sv7t2NB.TXNcocj0LYuMG8UG0CSQJJ0MeNGGLtu', 'AI 内部服务', 'client_credentials', 'ai:invoke', 3600, 0, 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM oauth_client WHERE client_id = 'ai-service');

-- ai-service 开发环境明文密钥: ai-service-dev-secret-2026（生产环境请更换并写入环境变量）
