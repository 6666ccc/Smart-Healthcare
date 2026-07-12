package com.example.wenrun.config;

import com.example.wenrun.common.ResultCode;
import com.example.wenrun.common.constant.AccountType;
import com.example.wenrun.common.context.UserContext;
import com.example.wenrun.common.exception.BusinessException;
import com.example.wenrun.mapper.TokenBlacklistMapper;
import com.example.wenrun.util.JwtUtil;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AuthInterceptorTest {

    private static final String SECRET = "test-secret-must-have-at-least-32-characters";

    private final TokenBlacklistMapper blacklistMapper = mock(TokenBlacklistMapper.class);
    private final AuthInterceptor interceptor = new AuthInterceptor(jwtProperties(), new ApiKeyProperties(), blacklistMapper);

    @AfterEach
    void clearContext() {
        UserContext.clear();
    }

    @Test
    void rejectsAuthenticatedRequestsToUnlistedApiRoutes() {
        BusinessException exception = assertThrows(BusinessException.class,
                () -> preHandle("GET", "/api/not-listed", AccountType.STAFF));

        assertEquals(ResultCode.FORBIDDEN, exception.getCode());
    }

    @Test
    void rejectsApiKeyRequestsToUnlistedApiRoutes() {
        BusinessException exception = assertThrows(BusinessException.class,
                () -> preHandleWithApiKey("GET", "/api/not-listed"));

        assertEquals(ResultCode.FORBIDDEN, exception.getCode());
        assertEquals("无权限访问该资源", exception.getMessage());
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "/api/visits",
            "/api/exam-requests",
            "/api/depts",
            "/api/staff",
            "/api/drug-stocks"
    })
    void rejectsPatientsFromStaffOnlyResources(String path) {
        BusinessException exception = assertThrows(BusinessException.class,
                () -> preHandle("GET", path, AccountType.PATIENT));

        assertEquals(ResultCode.FORBIDDEN, exception.getCode());
    }

    @Test
    void allowsStaffToUseVisitBusinessRoutes() throws Exception {
        assertTrue(preHandle("POST", "/api/visits/start/42", AccountType.STAFF));
    }

    @Test
    void allowsPatientsToUseAiChatRoutes() throws Exception {
        assertTrue(preHandle("POST", "/api/ai/chat", AccountType.PATIENT));
    }

    @Test
    void allowsPatientsToReadRegistrationSupportDataButNotMutateIt() throws Exception {
        assertTrue(preHandle("GET", "/api/schedules", AccountType.PATIENT));

        BusinessException exception = assertThrows(BusinessException.class,
                () -> preHandle("POST", "/api/schedules", AccountType.PATIENT));
        assertEquals(ResultCode.FORBIDDEN, exception.getCode());
    }

    @Test
    void allowsOnlyInternalAccountsToMutateManagementResources() throws Exception {
        BusinessException staffException = assertThrows(BusinessException.class,
                () -> preHandle("POST", "/api/depts", AccountType.STAFF));
        assertEquals(ResultCode.FORBIDDEN, staffException.getCode());

        assertTrue(preHandle("POST", "/api/depts", AccountType.INTERNAL));
    }

    @Test
    void rejectsChargePaymentRoutesWithTheWrongHttpMethod() {
        BusinessException exception = assertThrows(BusinessException.class,
                () -> preHandle("GET", "/api/charges/42/pay", AccountType.PATIENT));

        assertEquals(ResultCode.FORBIDDEN, exception.getCode());
    }

    private boolean preHandle(String method, String path, String accountType) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest(method, path);
        request.addHeader("Authorization", "Bearer " + JwtUtil.createToken(
                1L, "test-user", accountType, "test", List.of(), null, null, SECRET, 60));
        when(blacklistMapper.existsByJti(org.mockito.ArgumentMatchers.anyString())).thenReturn(0);
        return interceptor.preHandle(request, new MockHttpServletResponse(), new Object());
    }

    private boolean preHandleWithApiKey(String method, String path) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest(method, path);
        request.addHeader("X-API-Key", "test-api-key");
        return apiKeyInterceptor().preHandle(request, new MockHttpServletResponse(), new Object());
    }

    private static JwtProperties jwtProperties() {
        JwtProperties properties = new JwtProperties();
        properties.setSecret(SECRET);
        return properties;
    }

    private AuthInterceptor apiKeyInterceptor() {
        ApiKeyProperties properties = new ApiKeyProperties();
        properties.setApiKey("test-api-key");
        return new AuthInterceptor(jwtProperties(), properties, blacklistMapper);
    }
}
