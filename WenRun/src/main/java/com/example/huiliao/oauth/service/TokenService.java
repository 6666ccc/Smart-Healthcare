package com.example.huiliao.oauth.service;

import com.example.huiliao.common.ResultCode;
import com.example.huiliao.common.constant.AccountType;
import com.example.huiliao.common.constant.BizStatus;
import com.example.huiliao.common.exception.BusinessException;
import com.example.huiliao.entity.Patient;
import com.example.huiliao.entity.Staff;
import com.example.huiliao.entity.SysRole;
import com.example.huiliao.entity.SysUser;
import com.example.huiliao.mapper.PatientMapper;
import com.example.huiliao.mapper.StaffMapper;
import com.example.huiliao.mapper.SysUserMapper;
import com.example.huiliao.oauth.config.OAuthProperties;
import com.example.huiliao.oauth.dto.TokenPair;
import com.example.huiliao.oauth.dto.UserTokenContext;
import com.example.huiliao.oauth.entity.OAuthClient;
import com.example.huiliao.oauth.entity.OAuthRefreshToken;
import com.example.huiliao.oauth.mapper.OAuthClientMapper;
import com.example.huiliao.service.support.LoginAssembler;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 令牌服务
 */
@Service
@RequiredArgsConstructor
public class TokenService {

    private final OAuthClientMapper oauthClientMapper;
    private final SysUserMapper sysUserMapper;
    private final StaffMapper staffMapper;
    private final PatientMapper patientMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenService refreshTokenService;
    private final OAuthProperties oauthProperties;

    /**
     * 客户端凭证授权,主要用于内部服务之间的授权,比如AI服务调用其他服务接口时使用,不涉及用户身份认证
     * 
     * @param clientId
     * @param clientSecret
     * @return
     */
    @Transactional
    public TokenPair issueByClientCredentials(String clientId, String clientSecret) {
        if (!StringUtils.hasText(clientId)) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "client_id 不能为空");
        }
        if (!StringUtils.hasText(clientSecret)) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "client_secret 不能为空");
        }
        // 根据client_id获取客户端信息
        OAuthClient client = resolveClient(clientId);
        // 校验客户端授权类型
        assertGrantType(client, "client_credentials");
        // 校验客户端密钥
        assertClientSecret(client, clientSecret);

        // 获取访问令牌过期时间(如果未配置,则默认3600秒)
        int ttl = client.getAccessTokenTtl() != null ? client.getAccessTokenTtl() : 3600;
        // 创建客户端访问令牌
        String accessToken = jwtTokenProvider.createClientAccessToken(client.getClientId(), client.getScopes(), ttl);
        // 返回令牌对
        return TokenPair.builder()
                .accessToken(accessToken)
                .expiresIn(ttl)
                .scope(client.getScopes())
                .build();
    }

    @Transactional
    public TokenPair issueByPassword(String username, String password, String clientId,
            String clientSecret, String userAgent, String ip) {
        OAuthClient client = resolveClient(clientId);
        assertGrantType(client, "password");
        assertClientSecretIfConfigured(client, clientSecret);

        SysUser user = sysUserMapper.selectByUsername(username);
        if (user == null || user.getStatus() != BizStatus.ENABLED) {
            throw new BusinessException("用户名或密码错误");
        }
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new BusinessException("用户名或密码错误");
        }
        return issueForUser(user, client, userAgent, ip);
    }

    @Transactional
    public TokenPair issueForUser(SysUser user, String clientId, String userAgent, String ip) {
        OAuthClient client = resolveClient(clientId);
        return issueForUser(user, client, userAgent, ip);
    }

    @Transactional
    public TokenPair refresh(String rawRefreshToken, String clientId, String userAgent, String ip) {
        OAuthClient client = resolveClient(clientId);
        assertGrantType(client, "refresh_token");

        OAuthRefreshToken stored = refreshTokenService.validateForRefresh(rawRefreshToken, client.getClientId());
        SysUser user = sysUserMapper.selectById(stored.getUserId());
        if (user == null || user.getStatus() != BizStatus.ENABLED) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "用户已停用");
        }

        UserTokenContext context = buildUserContext(user, client.getClientId());
        int ttl = client.getAccessTokenTtl() != null ? client.getAccessTokenTtl() : 1800;
        String accessToken = jwtTokenProvider.createAccessToken(context, ttl);
        RefreshTokenService.RefreshTokenResult newRefresh = refreshTokenService.createAndReturn(user.getId(), client,
                userAgent, ip);
        refreshTokenService.rotate(stored, newRefresh.id());

        return TokenPair.builder()
                .accessToken(accessToken)
                .refreshToken(newRefresh.rawToken())
                .expiresIn(ttl)
                .scope(client.getScopes())
                .build();
    }

    private TokenPair issueForUser(SysUser user, OAuthClient client, String userAgent, String ip) {
        return buildTokenPair(user, client, userAgent, ip);
    }

    private TokenPair buildTokenPair(SysUser user, OAuthClient client, String userAgent, String ip) {
        UserTokenContext context = buildUserContext(user, client.getClientId());
        int ttl = client.getAccessTokenTtl() != null ? client.getAccessTokenTtl() : 1800;
        String accessToken = jwtTokenProvider.createAccessToken(context, ttl);
        String refreshToken = refreshTokenService.create(user.getId(), client, userAgent, ip);

        return TokenPair.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .expiresIn(ttl)
                .scope(client.getScopes())
                .jti(context.getJti())
                .build();
    }

    private UserTokenContext buildUserContext(SysUser user, String clientId) {
        List<SysRole> roleList = sysUserMapper.selectRolesByUserId(user.getId());
        SysRole primaryRole = LoginAssembler.pickPrimaryRole(roleList);
        String portalType = LoginAssembler.resolvePortalType(user, primaryRole);
        List<String> roles = roleList.stream().map(SysRole::getRoleCode).toList();

        Long staffId = null;
        Long patientId = null;
        String accountType = user.getAccountType();
        if (!StringUtils.hasText(accountType)) {
            accountType = AccountType.INTERNAL;
        }
        if (AccountType.STAFF.equals(accountType)) {
            Staff staff = staffMapper.selectByUserId(user.getId());
            if (staff != null) {
                staffId = staff.getId();
            }
        }
        if (AccountType.PATIENT.equals(accountType)) {
            Patient patient = patientMapper.selectByUserId(user.getId());
            if (patient != null) {
                patientId = patient.getId();
            }
        }

        return UserTokenContext.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .accountType(accountType)
                .portalType(portalType)
                .roles(roles)
                .staffId(staffId)
                .patientId(patientId)
                .clientId(clientId)
                .build();
    }

    public void revokeAccessToken(String accessToken) {
        jwtTokenProvider.blacklist(accessToken);
    }

    public void revokeRefreshToken(String refreshToken) {
        refreshTokenService.revoke(refreshToken);
    }

    /**
     * 根据client_id获取客户端信息(如果查询到,说明该客户端在数据库中存在,否则抛出异常)
     * 
     * @param clientId
     * @return
     */
    public OAuthClient resolveClient(String clientId) {
        if (!StringUtils.hasText(clientId)) {
            clientId = oauthProperties.getDefaultClientId();
        }
        OAuthClient client = oauthClientMapper.selectByClientId(clientId);
        if (client == null) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "无效的 client_id");
        }
        return client;
    }

    /**
     * 校验客户端授权类型
     * 
     * @param client
     * @param grantType
     */
    private void assertGrantType(OAuthClient client, String grantType) {
        // 校验客户端授权类型是否为空
        if (!StringUtils.hasText(client.getGrantTypes())) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "客户端未配置授权类型");
        }
        // 将客户端授权类型转换为集合
        Set<String> allowed = Arrays.stream(client.getGrantTypes().split(","))
                .map(String::trim)
                .collect(Collectors.toSet());
        if (!allowed.contains(grantType)) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "客户端不支持 grant_type: " + grantType);
        }
    }

    private void assertClientSecretIfConfigured(OAuthClient client, String clientSecret) {
        if (!StringUtils.hasText(client.getClientSecret())) {
            return;
        }
        if (!StringUtils.hasText(clientSecret)) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "client_secret 不能为空");
        }
        if (!passwordEncoder.matches(clientSecret, client.getClientSecret())) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "client_id 或 client_secret 无效");
        }
    }

    /**
     * 校验客户端密钥
     * 
     * @param client
     * @param clientSecret
     */
    private void assertClientSecret(OAuthClient client, String clientSecret) {
        // 校验客户端密钥是否为空
        if (!StringUtils.hasText(client.getClientSecret())) {
            throw new BusinessException(ResultCode.BAD_REQUEST, "客户端未配置 client_secret");
        }
        // 校验客户端密钥是否匹配
        if (!passwordEncoder.matches(clientSecret, client.getClientSecret())) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "client_id 或 client_secret 无效");
        }
    }
}
