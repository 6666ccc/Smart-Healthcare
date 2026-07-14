package com.example.wenrun.ai.service;

import com.example.wenrun.ai.client.ChatStreamConsumer;
import com.example.wenrun.ai.dto.ChatRequestDTO;
import com.example.wenrun.ai.dto.ChatResumeRequestDTO;
import com.example.wenrun.ai.vo.ChatResponseVO;
import com.example.wenrun.ai.vo.ChatExecutionVO;

public interface AiChatService {

    ChatResponseVO chat(ChatRequestDTO dto);

    ChatExecutionVO resume(ChatResumeRequestDTO dto);

    void streamChat(ChatRequestDTO dto, ChatStreamConsumer consumer);
}
