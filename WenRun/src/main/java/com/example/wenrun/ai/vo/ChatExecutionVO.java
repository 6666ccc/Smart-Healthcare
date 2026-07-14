package com.example.wenrun.ai.vo;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.List;
import java.util.Map;

/** Result of a chat turn, including a pending human-in-the-loop interruption. */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ChatExecutionVO {

    private String reply;
    private String status;
    private String conversationId;
    private String intent;
    private List<Map<String, Object>> interrupts;
}
