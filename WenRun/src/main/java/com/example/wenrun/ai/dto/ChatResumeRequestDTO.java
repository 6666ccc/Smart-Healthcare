package com.example.wenrun.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Map;

/** Request to continue a LangGraph turn paused for human approval. */
@Data
public class ChatResumeRequestDTO {

    @NotBlank(message = "会话标识不能为空")
    private String conversationId;

    @NotNull(message = "审批决定不能为空")
    private Map<String, Object> decision;

    /** Set by the Java server; never accepted as the caller's authority. */
    private String apiKey;

    private Long userId;
    private String username;
    private String realName;
    private String roleCode;
    private String portalType;
    private Long staffId;
    private Long patientId;
    private String patientNo;
    private String patientName;
    private Integer patientGender;
    private String patientBirthDate;
    private String patientAllergyHistory;
}
