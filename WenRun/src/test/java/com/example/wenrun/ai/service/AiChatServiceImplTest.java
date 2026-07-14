package com.example.wenrun.ai.service;

import com.example.wenrun.ai.client.AiServiceClient;
import com.example.wenrun.ai.dto.ChatResumeRequestDTO;
import com.example.wenrun.ai.service.serviceImpl.AiChatServiceImpl;
import com.example.wenrun.ai.vo.ChatExecutionVO;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AiChatServiceImplTest {

    @Test
    void resumesInterruptedChatThroughAiClient() {
        AiServiceClient client = mock(AiServiceClient.class);
        ChatResumeRequestDTO request = new ChatResumeRequestDTO();
        request.setConversationId("conversation-1");
        request.setDecision(Map.of("action", "approve"));
        ChatExecutionVO expected = new ChatExecutionVO();
        expected.setStatus("completed");
        when(client.resume(request)).thenReturn(expected);

        ChatExecutionVO actual = new AiChatServiceImpl(client).resume(request);

        assertSame(expected, actual);
        verify(client).resume(request);
    }
}
