package com.example.huiliao.oauth.service;

import com.example.huiliao.common.ResultCode;
import com.example.huiliao.common.exception.BusinessException;
import com.example.huiliao.oauth.config.OAuthProperties;
import com.example.huiliao.oauth.dto.UserTokenContext;
import com.example.huiliao.oauth.mapper.OAuthTokenBlacklistMapper;
import com.example.huiliao.oauth.support.JwtClaims;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.text.ParseException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.UUID;

/**
 * JWT令牌提供者
 */
@Component
@RequiredArgsConstructor
public class JwtTokenProvider {

    private final OAuthProperties oauthProperties;
    private final OAuthTokenBlacklistMapper blacklistMapper;

    private byte[] secretBytes;
    private MACSigner signer;
    private MACVerifier verifier;

    @PostConstruct
    void init() throws JOSEException {
        String secret = oauthProperties.getJwt().getSecret();
        if (!StringUtils.hasText(secret) || secret.length() < 32) {
            throw new IllegalStateException("oauth.jwt.secret 长度至少 32 字符");
        }
        secretBytes = secret.getBytes(StandardCharsets.UTF_8);
        signer = new MACSigner(secretBytes);
        verifier = new MACVerifier(secretBytes);
    }

    public String createAccessToken(UserTokenContext context, int ttlSeconds) {
        try {
            String jti = UUID.randomUUID().toString().replace("-", "");
            Date now = new Date();
            Date exp = new Date(now.getTime() + ttlSeconds * 1000L);

            JWTClaimsSet.Builder builder = new JWTClaimsSet.Builder()
                    .subject(String.valueOf(context.getUserId()))
                    .issuer(oauthProperties.getJwt().getIssuer())
                    .issueTime(now)
                    .expirationTime(exp)
                    .jwtID(jti)
                    .claim(JwtClaims.USERNAME, context.getUsername())
                    .claim(JwtClaims.ACCOUNT_TYPE, context.getAccountType())
                    .claim(JwtClaims.PORTAL_TYPE, context.getPortalType())
                    .claim(JwtClaims.ROLES, context.getRoles() != null ? context.getRoles() : Collections.emptyList())
                    .claim(JwtClaims.CLIENT_ID, context.getClientId())
                    .claim(JwtClaims.TOKEN_TYPE, JwtClaims.TOKEN_TYPE_USER);

            if (context.getStaffId() != null) {
                builder.claim(JwtClaims.STAFF_ID, context.getStaffId());
            }
            if (context.getPatientId() != null) {
                builder.claim(JwtClaims.PATIENT_ID, context.getPatientId());
            }

            SignedJWT signedJWT = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), builder.build());
            signedJWT.sign(signer);
            return signedJWT.serialize();
        } catch (JOSEException e) {
            throw new IllegalStateException("JWT 签发失败", e);
        }
    }

    /**
     * 创建客户端访问令牌
     * 
     * @param clientId 客户端ID
     * @param scope 作用域
     * @param ttlSeconds 过期时间
     * @return
     */     // 创建客户端访问令牌
    public String createClientAccessToken(String clientId, String scope, int ttlSeconds) {
        try {
            String jti = UUID.randomUUID().toString().replace("-", "");
            Date now = new Date();
            Date exp = new Date(now.getTime() + ttlSeconds * 1000L);

            JWTClaimsSet claims = new JWTClaimsSet.Builder()
                    .subject(clientId)
                    .issuer(oauthProperties.getJwt().getIssuer())
                    .issueTime(now)
                    .expirationTime(exp)
                    .jwtID(jti)
                    .claim(JwtClaims.CLIENT_ID, clientId)
                    .claim(JwtClaims.TOKEN_TYPE, JwtClaims.TOKEN_TYPE_CLIENT)
                    .claim(JwtClaims.SCOPE, scope != null ? scope : "")
                    .build();

            SignedJWT signedJWT = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
            signedJWT.sign(signer);
            return signedJWT.serialize();
        } catch (JOSEException e) {
            throw new IllegalStateException("JWT 签发失败", e);
        }
    }

    public UserTokenContext parseAndValidate(String token) {
        if (!StringUtils.hasText(token)) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "未登录或 Token 无效");
        }
        try {
            SignedJWT signedJWT = SignedJWT.parse(token);
            if (!signedJWT.verify(verifier)) {
                throw new BusinessException(ResultCode.UNAUTHORIZED, "Token 签名无效");
            }
            JWTClaimsSet claims = signedJWT.getJWTClaimsSet();
            Date expiration = claims.getExpirationTime();
            if (expiration == null || expiration.before(new Date())) {
                throw new BusinessException(ResultCode.UNAUTHORIZED, "登录已过期，请重新登录");
            }
            String jti = claims.getJWTID();
            if (StringUtils.hasText(jti) && blacklistMapper.existsByJti(jti) > 0) {
                throw new BusinessException(ResultCode.UNAUTHORIZED, "Token 已失效");
            }

            String tokenType = claims.getStringClaim(JwtClaims.TOKEN_TYPE);
            if (JwtClaims.TOKEN_TYPE_CLIENT.equals(tokenType)) {
                String clientId = claims.getSubject();
                return UserTokenContext.builder()
                        .clientId(clientId)
                        .tokenType(JwtClaims.TOKEN_TYPE_CLIENT)
                        .scope(claims.getStringClaim(JwtClaims.SCOPE))
                        .jti(jti)
                        .build();
            }

            Long userId = Long.parseLong(claims.getSubject());
            return UserTokenContext.builder()
                    .userId(userId)
                    .username(claims.getStringClaim(JwtClaims.USERNAME))
                    .accountType(claims.getStringClaim(JwtClaims.ACCOUNT_TYPE))
                    .portalType(claims.getStringClaim(JwtClaims.PORTAL_TYPE))
                    .roles(readStringList(claims, JwtClaims.ROLES))
                    .staffId(readLongClaim(claims, JwtClaims.STAFF_ID))
                    .patientId(readLongClaim(claims, JwtClaims.PATIENT_ID))
                    .clientId(claims.getStringClaim(JwtClaims.CLIENT_ID))
                    .tokenType(StringUtils.hasText(tokenType) ? tokenType : JwtClaims.TOKEN_TYPE_USER)
                    .jti(jti)
                    .build();
        } catch (ParseException | JOSEException e) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "Token 无效");
        } catch (NumberFormatException e) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "Token 无效");
        }
    }

    public Long parseUserId(String token) {
        UserTokenContext ctx = parseAndValidate(token);
        if (JwtClaims.TOKEN_TYPE_CLIENT.equals(ctx.getTokenType())) {
            return null;
        }
        return ctx.getUserId();
    }

    public boolean isClientToken(String token) {
        UserTokenContext ctx = parseAndValidate(token);
        return JwtClaims.TOKEN_TYPE_CLIENT.equals(ctx.getTokenType());
    }

    public void blacklist(String token) {
        if (!StringUtils.hasText(token)) {
            return;
        }
        try {
            SignedJWT signedJWT = SignedJWT.parse(token);
            JWTClaimsSet claims = signedJWT.getJWTClaimsSet();
            String jti = claims.getJWTID();
            Date expiration = claims.getExpirationTime();
            if (!StringUtils.hasText(jti) || expiration == null) {
                return;
            }
            LocalDateTime expiresAt = LocalDateTime.ofInstant(expiration.toInstant(), ZoneId.systemDefault());
            if (blacklistMapper.existsByJti(jti) == 0) {
                blacklistMapper.insert(jti, expiresAt);
            }
        } catch (ParseException ignored) {
            // 无效 token 无需入黑名单
        }
    }

    @SuppressWarnings("unchecked")
    private List<String> readStringList(JWTClaimsSet claims, String key) throws ParseException {
        Object value = claims.getClaim(key);
        if (value instanceof List<?> list) {
            return list.stream().map(String::valueOf).toList();
        }
        return Collections.emptyList();
    }

    private Long readLongClaim(JWTClaimsSet claims, String key) throws ParseException {
        Object value = claims.getClaim(key);
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(String.valueOf(value));
    }
}
