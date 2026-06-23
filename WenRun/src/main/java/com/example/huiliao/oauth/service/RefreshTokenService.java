package com.example.huiliao.oauth.service;

import com.example.huiliao.common.ResultCode;
import com.example.huiliao.common.exception.BusinessException;
import com.example.huiliao.oauth.config.OAuthProperties;
import com.example.huiliao.oauth.entity.OAuthClient;
import com.example.huiliao.oauth.entity.OAuthRefreshToken;
import com.example.huiliao.oauth.mapper.OAuthRefreshTokenMapper;
import com.example.huiliao.oauth.support.TokenHashUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;

/**
 * 刷新令牌服务
 */
@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    public record RefreshTokenResult(String rawToken, Long id) {
    }

    private final OAuthRefreshTokenMapper refreshTokenMapper;
    private final OAuthProperties oauthProperties;

    public String create(Long userId, OAuthClient client, String userAgent, String ip) {
        return createAndReturn(userId, client, userAgent, ip).rawToken();
    }

    public RefreshTokenResult createAndReturn(Long userId, OAuthClient client, String userAgent, String ip) {
        if (client.getRefreshTokenTtl() == null || client.getRefreshTokenTtl() <= 0) {
            return new RefreshTokenResult(null, null);
        }
        enforceLimit(userId, client.getClientId());

        String rawToken = TokenHashUtil.generateRefreshToken();
        OAuthRefreshToken entity = new OAuthRefreshToken();
        entity.setTokenHash(TokenHashUtil.hash(rawToken));
        entity.setUserId(userId);
        entity.setClientId(client.getClientId());
        entity.setExpiresAt(LocalDateTime.now().plusSeconds(client.getRefreshTokenTtl()));
        entity.setRevoked(0);
        entity.setUserAgent(userAgent);
        entity.setIp(ip);
        refreshTokenMapper.insert(entity);
        return new RefreshTokenResult(rawToken, entity.getId());
    }

    @Transactional
    public OAuthRefreshToken validateForRefresh(String rawToken, String clientId) {
        if (!StringUtils.hasText(rawToken)) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "refresh_token 无效");
        }
        OAuthRefreshToken stored = refreshTokenMapper.selectByTokenHash(TokenHashUtil.hash(rawToken));
        if (stored == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "refresh_token 无效");
        }
        if (stored.getRevoked() != null && stored.getRevoked() == 1) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "refresh_token 已失效");
        }
        if (stored.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "refresh_token 已过期");
        }
        if (!clientId.equals(stored.getClientId())) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "client_id 不匹配");
        }
        return stored;
    }

    @Transactional
    public void rotate(OAuthRefreshToken oldToken, Long newTokenId) {
        refreshTokenMapper.revokeById(oldToken.getId(), newTokenId);
    }

    public void revoke(String rawToken) {
        if (StringUtils.hasText(rawToken)) {
            refreshTokenMapper.revokeByTokenHash(TokenHashUtil.hash(rawToken));
        }
    }

    private void enforceLimit(Long userId, String clientId) {
        int max = oauthProperties.getMaxRefreshTokensPerClient();
        if (max <= 0) {
            return;
        }
        refreshTokenMapper.revokeOldestActive(userId, clientId, max - 1);
    }
}
