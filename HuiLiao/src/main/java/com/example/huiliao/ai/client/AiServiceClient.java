package com.example.huiliao.ai.client;

import com.example.huiliao.ai.config.AiServiceProperties;
import com.example.huiliao.ai.dto.ChatRequestDTO;
import com.example.huiliao.ai.exception.AiServiceException;
import com.example.huiliao.ai.vo.ChatResponseVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * AI 服务客户端，调用 Python FastAPI（{@code POST /v1/chat}、{@code GET /health}）。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AiServiceClient {

    private static final ParameterizedTypeReference<Map<String, String>> HEALTH_BODY =
            new ParameterizedTypeReference<>() {
            };

    private final RestClient aiRestClient;
    private final AiServiceProperties properties;

    /**
     * 调用 FastAPI {@code POST /v1/chat}，请求体会夹带用户/患者上下文，响应 {@code {"reply": "..."}}。
     */
    public ChatResponseVO chat(ChatRequestDTO request) {
        if (request == null || !StringUtils.hasText(request.getMessage())) {
            throw new AiServiceException("消息不能为空");
        }
        request.setMessage(request.getMessage().trim());

        log.debug("调用 AI 聊天: POST {}{}", properties.getBaseUrl(), properties.getChatPath());
        try {
            ChatResponseVO response = aiRestClient.post()
                    .uri(properties.getChatPath())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, res) -> {
                        String detail = readBody(res.getBody());
                        throw new AiServiceException(
                                "AI 服务响应异常: HTTP " + res.getStatusCode().value()
                                        + (detail.isEmpty() ? "" : " - " + detail));
                    })
                    .body(ChatResponseVO.class);
            if (response == null || response.getReply() == null) {
                throw new AiServiceException("AI 服务返回为空");
            }
            return response;
        } catch (AiServiceException ex) {
            throw ex;
        } catch (RestClientException ex) {
            throw new AiServiceException("无法连接 AI 服务，请确认 FastAPI 已启动", ex);
        }
    }

    public ChatResponseVO chat(String message) {
        ChatRequestDTO request = new ChatRequestDTO();
        request.setMessage(message);
        return chat(request);
    }

    /**
     * 探测 FastAPI {@code GET /health}，返回 {@code {"status":"ok"}} 时视为可用。
     */
    public boolean isHealthy() {
        try {
            Map<String, String> body = aiRestClient.get()
                    .uri(properties.getHealthPath())
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, res) -> {
                        throw new AiServiceException(
                                "AI 健康检查失败: HTTP " + res.getStatusCode().value());
                    })
                    .body(HEALTH_BODY);
            return body != null && "ok".equalsIgnoreCase(body.get("status"));
        } catch (RestClientException ex) {
            log.debug("AI 服务不可用: {}", ex.getMessage());
            return false;
        }
    }

    private static String readBody(java.io.InputStream body) {
        if (body == null) {
            return "";
        }
        try (body) {
            return new String(body.readAllBytes(), StandardCharsets.UTF_8).trim();
        } catch (Exception ex) {
            return "";
        }
    }
}
