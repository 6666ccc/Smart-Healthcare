package com.example.huiliao.oauth.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TokenPair {
    private String accessToken;
    private String refreshToken;
    private int expiresIn;
    private String scope;
    private String jti;
}
