package com.example.huiliao.oauth.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class UserTokenContext {
    private Long userId;
    private String username;
    private String accountType;
    private String portalType;
    private List<String> roles;
    private Long staffId;
    private Long patientId;
    private String clientId;
    private String jti;
    /** user | client */
    private String tokenType;
    private String scope;
}
