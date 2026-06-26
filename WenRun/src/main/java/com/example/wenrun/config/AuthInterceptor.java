package com.example.wenrun.config;

import com.example.wenrun.common.ResultCode;
import com.example.wenrun.common.constant.AccountType;
import com.example.wenrun.common.context.ClientContext;
import com.example.wenrun.common.context.UserContext;
import com.example.wenrun.common.exception.BusinessException;
import com.example.wenrun.mapper.TokenBlacklistMapper;
import com.example.wenrun.util.JwtUtil;
import com.nimbusds.jwt.JWTClaimsSet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.List;
import java.util.regex.Pattern;

/**
 * 认证拦截器 —— 拦截 /api/** 请求。
 *
 * <h3>认证方式</h3>
 * <ol>
 *   <li><b>API Key</b>：请求头 X-API-Key → 服务间调用</li>
 *   <li><b>JWT</b>：请求头 Authorization: Bearer / X-Token → 用户登录</li>
 * </ol>
 */
@Component
@RequiredArgsConstructor
public class AuthInterceptor implements HandlerInterceptor {

    private static final List<String> STAFF_TYPES = List.of(AccountType.STAFF, AccountType.INTERNAL);
    private static final List<String> STAFF_AND_PATIENT = List.of(AccountType.STAFF, AccountType.INTERNAL, AccountType.PATIENT);

    private static final List<PathRule> RULES = List.of(
            new PathRule("/api/visits/start", STAFF_TYPES),
            new PathRule("/api/medical-items", STAFF_TYPES),
            new PathRule("/api/registrations", STAFF_AND_PATIENT),
            new PathRule("/api/prescriptions", STAFF_TYPES),
            new PathRule("/api/charges", STAFF_AND_PATIENT),
            new PathRule("/api/schedules", STAFF_TYPES),
            new PathRule("/api/dashboard", STAFF_TYPES),
            new PathRule("/api/dispense", STAFF_TYPES),
            new PathRule("/api/patients", STAFF_AND_PATIENT),
            new PathRule("/api/drugs", STAFF_TYPES)
    );

    private static final Pattern CHARGE_PAY = Pattern.compile("^/api/charges/\\d+/pay$");

    private final JwtProperties jwtProperties;
    private final ApiKeyProperties apiKeyProperties;
    private final TokenBlacklistMapper blacklistMapper;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) return true;

        // ===== API Key 认证（服务间调用） =====
        String apiKey = request.getHeader("X-API-Key");
        if (StringUtils.hasText(apiKey) && apiKey.equals(apiKeyProperties.getApiKey())) {
            ClientContext.set("api-service", "*");
            return true;
        }

        // ===== JWT 认证（用户登录） =====
        String token = resolveToken(request);
        if (!StringUtils.hasText(token)) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "未登录或 Token 无效");
        }

        JWTClaimsSet claims = JwtUtil.verifyAndParse(token, jwtProperties.getSecret());

        // 检查黑名单（登出后的 Token）
        String jti = JwtUtil.getJti(claims);
        if (jti != null && blacklistMapper.existsByJti(jti) > 0) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "Token 已失效");
        }

        // 角色校验
        String accountType = JwtUtil.getStringClaim(claims, "account_type");
        assertAccountTypeAllowed(request.getRequestURI(), accountType);
        UserContext.setUserId(JwtUtil.getUserId(claims));
        return true;
    }

    private void assertAccountTypeAllowed(String path, String accountType) {
        List<String> allowed = resolveAllowed(path);
        if (allowed == null) return;
        if (!StringUtils.hasText(accountType) || !allowed.contains(accountType)) {
            throw new BusinessException(ResultCode.FORBIDDEN, "无权限访问该资源");
        }
    }

    private List<String> resolveAllowed(String path) {
        if (CHARGE_PAY.matcher(path).matches()) return List.of(AccountType.PATIENT);
        return RULES.stream().filter(r -> path.startsWith(r.prefix)).findFirst().map(PathRule::allowed).orElse(null);
    }

    private record PathRule(String prefix, List<String> allowed) {}

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                Object handler, Exception ex) {
        UserContext.clear();
        ClientContext.clear();
    }

    private String resolveToken(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (StringUtils.hasText(auth) && auth.startsWith("Bearer ")) return auth.substring(7);
        return request.getHeader("X-Token");
    }
}
