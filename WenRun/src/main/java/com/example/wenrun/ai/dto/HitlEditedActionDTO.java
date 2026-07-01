package com.example.wenrun.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * [HITL] 用户修改后的工具调用参数，对应 Python {@code HitlEditedAction}。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HitlEditedActionDTO {

    /** 工具名称，如 create_registration */
    private String name;

    /** 修改后的参数 */
    private Map<String, Object> args;
}
