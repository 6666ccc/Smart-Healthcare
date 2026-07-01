package com.example.wenrun.ai.vo;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * [HITL] 待人工确认的工具调用，对应 Python hitl_pending_actions 单项。
 */
@Data
public class HitlPendingActionVO {

    private String tool;

    private Map<String, Object> args;

    private String description;

    @JsonProperty("allowed_decisions")
    private List<String> allowedDecisions;

    /** 面向患者的卡片标题，如「挂号确认」 */
    private String title;

    /** 一行摘要，如「内科 · 张伟 · 2026-06-30 下午 · 10元」 */
    private String summary;

    /** 结构化详情行 */
    private List<HitlActionDetailVO> details;
}
