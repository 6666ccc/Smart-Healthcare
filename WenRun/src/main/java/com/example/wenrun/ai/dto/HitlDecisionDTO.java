package com.example.wenrun.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * [HITL] 单条人工决策，对应 Python {@code HitlDecision}。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HitlDecisionDTO {

    /** approve / reject / edit / respond */
    private HitlDecisionType type;

    /** reject 或 respond 时的说明/回复内容 */
    private String message;

    /** edit 时修改后的工具调用 */
    @JsonProperty("edited_action")
    private HitlEditedActionDTO editedAction;
}
