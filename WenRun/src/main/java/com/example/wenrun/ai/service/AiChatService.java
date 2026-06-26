package com.example.wenrun.ai.service;

import com.example.wenrun.ai.client.ChatStreamConsumer;
import com.example.wenrun.ai.dto.ChatRequestDTO;
import com.example.wenrun.ai.dto.JavaChatRequestDTO;
import com.example.wenrun.ai.vo.ChatResponseVO;

import java.util.Map;

public interface AiChatService {

    ChatResponseVO chat(ChatRequestDTO dto);

    void streamChat(ChatRequestDTO dto, ChatStreamConsumer consumer);

    Map<String, Object> javaChat(JavaChatRequestDTO dto);
}
