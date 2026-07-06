package com.example.wenrun.ai.service;

import com.example.wenrun.ai.client.ChatStreamConsumer;
import com.example.wenrun.ai.dto.ChatRequestDTO;
import com.example.wenrun.ai.dto.JavaChatRequestDTO;
import com.example.wenrun.ai.vo.ChatResponseVO;
import com.example.wenrun.ai.vo.JavaChatResponseVO;

public interface AiChatService {

    ChatResponseVO chat(ChatRequestDTO dto);

    void streamChat(ChatRequestDTO dto, ChatStreamConsumer consumer);

    JavaChatResponseVO javaChat(JavaChatRequestDTO dto);
}
