package com.example.wenrun.ai.dto;

import com.fasterxml.jackson.annotation.JsonValue;

/**
 * [HITL] 人工决策类型，序列化为 Python 期望的小写字符串。
 */
public enum HitlDecisionType {

    APPROVE("approve"),
    REJECT("reject"),
    EDIT("edit"),
    RESPOND("respond");

    private final String value;

    HitlDecisionType(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }
}
