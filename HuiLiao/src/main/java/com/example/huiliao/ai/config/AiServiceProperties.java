package com.example.huiliao.ai.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/**
 * AI 服务配置属性
 */
@Data
@ConfigurationProperties(prefix = "ai.service")
public class AiServiceProperties {

    /** FastAPI 根地址，如 http://127.0.0.1:8000 */
    private String baseUrl = "http://127.0.0.1:8000";

    /** 聊天接口路径，对应 FastAPI POST /v1/chat */
    private String chatPath = "/v1/chat";

    /** 健康检查路径，对应 FastAPI GET /health */
    private String healthPath = "/health";

    /** 连接超时时间 */
    private Duration connectTimeout = Duration.ofSeconds(5);

    /** 读取超时时间 **/
    private Duration readTimeout = Duration.ofSeconds(120);

    /** 内部 API Key，AI 回调 Java 接口时使用 */
    private String apiKey = "change-me-in-production";
}
