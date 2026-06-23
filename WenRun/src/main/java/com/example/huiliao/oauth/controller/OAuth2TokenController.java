package com.example.huiliao.oauth.controller;

import com.example.huiliao.oauth.dto.TokenPair;
import com.example.huiliao.oauth.dto.TokenResponseDTO;
import com.example.huiliao.oauth.service.TokenService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * OAuth 2.0 Token 端点（RFC 6749 / 7009）
 */
@RestController
@RequestMapping("/oauth2")
@RequiredArgsConstructor
public class OAuth2TokenController {

    private final TokenService tokenService;

    /**
     * 获取token接口
     * 
     * @param grantType
     * @param username
     * @param password
     * @param refreshToken
     * @param clientId
     * @param clientSecret
     * @param request
     * @return
     */
    @PostMapping(value = "/token", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public TokenResponseDTO token(@RequestParam("grant_type") String grantType,//该字段用于指定授权类型,比如password说明是用户名密码授权
            @RequestParam(value = "username", required = false) String username,
            @RequestParam(value = "password", required = false) String password,
            @RequestParam(value = "refresh_token", required = false) String refreshToken,//该字段用于刷新当refresh_token为空时，使用该字段进行刷新
            @RequestParam(value = "client_id", required = false) String clientId,
            @RequestParam(value = "client_secret", required = false) String clientSecret,
            HttpServletRequest request) {
        //获取用户代理和IP地址
        String userAgent = request.getHeader("User-Agent");
        String ip = request.getRemoteAddr();
        //根据授权类型进行不同的处理
        TokenPair pair = switch (grantType) {
            case "password" -> tokenService.issueByPassword(username, password, clientId, clientSecret, userAgent, ip);//用户名密码授权
            case "refresh_token" -> tokenService.refresh(refreshToken, clientId, userAgent, ip);//刷新token
            case "client_credentials" -> tokenService.issueByClientCredentials(clientId, clientSecret);//客户端凭证授权
            default -> throw new com.example.huiliao.common.exception.BusinessException(
                    "不支持的 grant_type: " + grantType);//不支持的授权类型
        };
        return TokenResponseDTO.from(pair);
    }

    /**
     * 撤销token接口
     * 
     * @param token
     * @param tokenTypeHint
     * @return
     */
    @PostMapping(value = "/revoke", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public void revoke(@RequestParam(value = "token", required = false) String token,
            @RequestParam(value = "token_type_hint", required = false) String tokenTypeHint) {
        if (!StringUtils.hasText(token)) {
            return;
        }
        if ("refresh_token".equals(tokenTypeHint)) {
            tokenService.revokeRefreshToken(token);
        } else {
            tokenService.revokeAccessToken(token);
            tokenService.revokeRefreshToken(token);
        }
    }
}
