package com.example.huiliao.oauth.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "oauth")
public class OAuthProperties {

    private Jwt jwt = new Jwt();
    private String defaultClientId = "huiliao-web";
    private int maxRefreshTokensPerClient = 3;

    @Data
    public static class Jwt {
        private String secret;
        private String issuer = "huiliao";
    }
}
