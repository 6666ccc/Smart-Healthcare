package com.example.wenrun.ai.vo;

import lombok.Data;

/**
 * [HITL] 确认卡片中的单行详情（如 科室 / 内科）。
 */
@Data
public class HitlActionDetailVO {

    private String label;

    private String value;
}
