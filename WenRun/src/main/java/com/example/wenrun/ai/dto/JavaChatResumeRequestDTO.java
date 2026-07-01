package com.example.wenrun.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * [HITL] 调用 Python {@code POST /java/chat/resume} 的请求体。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JavaChatResumeRequestDTO {

    /** 必须与触发中断时的 sessionId 一致 */
    @NotBlank(message = "sessionId 不能为空")
    private String sessionId;

    private String userId;

    /** 与 hitl_pending_actions 数量一致，按顺序对应 */
    @NotEmpty(message = "decisions 不能为空")
    private List<HitlDecisionDTO> decisions;

    /** 扩展字段；Java 端会自动注入 access_token 供 Python 调用业务 API */
    private Map<String, Object> extra;
}
