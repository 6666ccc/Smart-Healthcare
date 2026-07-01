package com.example.wenrun.ai.service;

import com.example.wenrun.ai.client.ChatStreamConsumer;
import com.example.wenrun.ai.dto.ChatRequestDTO;
import com.example.wenrun.ai.dto.JavaChatRequestDTO;
import com.example.wenrun.ai.dto.JavaChatResumeRequestDTO;
import com.example.wenrun.ai.vo.ChatResponseVO;
import com.example.wenrun.ai.vo.JavaChatResponseVO;

public interface AiChatService {

    ChatResponseVO chat(ChatRequestDTO dto);

    void streamChat(ChatRequestDTO dto, ChatStreamConsumer consumer);

    /** Java 集成聊天（可能返回 [HITL] interrupt 状态） */
    JavaChatResponseVO javaChat(JavaChatRequestDTO dto);

    /** [HITL] 恢复被中断的 Java 集成聊天 */
    JavaChatResponseVO javaChatResume(JavaChatResumeRequestDTO dto);
}
