package com.example.huiliao.oauth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TokenResponseDTO {

    @JsonProperty("access_token")
    private String accessToken;

    @JsonProperty("token_type")
    private String tokenType;

    @JsonProperty("expires_in")
    private int expiresIn;

    @JsonProperty("refresh_token")
    private String refreshToken;

    private String scope;

    public static TokenResponseDTO from(TokenPair pair) {
        return TokenResponseDTO.builder()
                .accessToken(pair.getAccessToken())
                .tokenType("Bearer")
                .expiresIn(pair.getExpiresIn())
                .refreshToken(pair.getRefreshToken())
                .scope(pair.getScope())
                .build();
    }
}
