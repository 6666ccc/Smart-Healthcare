package com.example.wenrun.ai.service.serviceImpl;

import com.example.wenrun.ai.client.AiServiceClient;
import com.example.wenrun.ai.client.ChatStreamConsumer;
import com.example.wenrun.ai.dto.ChatRequestDTO;
import com.example.wenrun.ai.dto.ChatResumeRequestDTO;
import com.example.wenrun.ai.service.AiChatService;
import com.example.wenrun.ai.vo.ChatResponseVO;
import com.example.wenrun.ai.vo.ChatExecutionVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AiChatServiceImpl implements AiChatService {

    private final AiServiceClient aiServiceClient;

    @Override
    public ChatResponseVO chat(ChatRequestDTO dto) {
        return aiServiceClient.chat(dto);
    }

    @Override
    public ChatExecutionVO resume(ChatResumeRequestDTO dto) {
        return aiServiceClient.resume(dto);
    }

    @Override
    public void streamChat(ChatRequestDTO dto, ChatStreamConsumer consumer) {
        aiServiceClient.streamChat(dto, consumer);
    }
}
