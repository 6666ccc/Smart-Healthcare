package com.example.huiliao.ai.service;

import com.example.huiliao.ai.dto.ChatRequestDTO;
import com.example.huiliao.ai.vo.ChatResponseVO;

public interface AiChatService {

    ChatResponseVO chat(ChatRequestDTO dto);
}
