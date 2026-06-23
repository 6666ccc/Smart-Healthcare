package com.example.huiliao.oauth.entity;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class OAuthRefreshToken {
    private Long id;
    private String tokenHash;
    private Long userId;
    private String clientId;
    private LocalDateTime expiresAt;
    private Integer revoked;
    private Long replacedBy;
    private String userAgent;
    private String ip;
    private LocalDateTime createTime;
}
