package com.example.huiliao.oauth.entity;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 客户端实体类
 */
@Data
public class OAuthClient {
    private Long id;
    private String clientId;
    private String clientSecret;
    private String clientName;
    private String grantTypes;
    private String scopes;
    private Integer accessTokenTtl;//访问令牌过期时间
    private Integer refreshTokenTtl;//刷新令牌过期时间
    private Integer status;//状态
    private LocalDateTime createTime;//创建时间
}
