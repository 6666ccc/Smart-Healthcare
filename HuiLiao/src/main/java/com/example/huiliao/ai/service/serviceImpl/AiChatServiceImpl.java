package com.example.huiliao.ai.service.serviceImpl;

import com.example.huiliao.ai.client.AiServiceClient;
import com.example.huiliao.ai.dto.ChatRequestDTO;
import com.example.huiliao.ai.service.AiChatService;
import com.example.huiliao.ai.vo.ChatResponseVO;
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
}
