package com.example.wenrun.ai.vo;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

/**
 * Python {@code POST /java/chat} 与 {@code POST /java/chat/resume} 的响应体。
 * 字段名与 FastAPI 返回的 snake_case JSON 对齐。
 */
@Data
public class JavaChatResponseVO {

    @JsonProperty("user_input")
    private String userInput;

    private String intent;

    @JsonProperty("target_agent")
    private String targetAgent;

    private Double confidence;

    private String reasoning;

    @JsonProperty("final_output")
    private String finalOutput;

    @JsonProperty("session_id")
    private String sessionId;

    // ========== [HITL] 以下字段在写操作待确认时有值 ==========

    /** interrupt = 待确认；completed = 已完成 */
    @JsonProperty("hitl_status")
    private String hitlStatus;

    @JsonProperty("hitl_thread_id")
    private String hitlThreadId;

    @JsonProperty("hitl_pending_actions")
    private List<HitlPendingActionVO> hitlPendingActions;

    /** [HITL] 是否处于人工确认中断状态 */
    public boolean isHitlInterrupt() {
        return "interrupt".equals(hitlStatus);
    }

    /** [HITL] 是否已完成（含 resume 后无新中断） */
    public boolean isHitlCompleted() {
        return "completed".equals(hitlStatus);
    }
}
