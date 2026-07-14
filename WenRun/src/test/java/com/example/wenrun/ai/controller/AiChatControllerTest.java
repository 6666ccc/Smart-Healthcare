package com.example.wenrun.ai.controller;

import com.example.wenrun.ai.config.AiServiceProperties;
import com.example.wenrun.ai.dto.ChatResumeRequestDTO;
import com.example.wenrun.ai.service.AiChatService;
import com.example.wenrun.ai.vo.ChatExecutionVO;
import com.example.wenrun.config.AuthTokenStore;
import com.example.wenrun.entity.SysUser;
import com.example.wenrun.mapper.ChatMessageMapper;
import com.example.wenrun.mapper.PatientMapper;
import com.example.wenrun.mapper.StaffMapper;
import com.example.wenrun.mapper.SysUserMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiChatControllerTest {

    @Mock private AiChatService aiChatService;
    @Mock private AuthTokenStore authTokenStore;
    @Mock private SysUserMapper sysUserMapper;
    @Mock private StaffMapper staffMapper;
    @Mock private PatientMapper patientMapper;
    @Mock private ChatMessageMapper chatMessageMapper;
    @Mock private HttpServletRequest httpRequest;

    @Test
    void resumeReplacesCallerSuppliedIdentityWithAuthenticatedIdentity() {
        AiServiceProperties properties = new AiServiceProperties();
        properties.setApiKey("server-only-key");
        AiChatController controller = new AiChatController(aiChatService, authTokenStore, sysUserMapper,
                staffMapper, patientMapper, chatMessageMapper, properties);
        ChatResumeRequestDTO request = new ChatResumeRequestDTO();
        request.setConversationId("conversation-1");
        request.setDecision(Map.of("action", "approve"));
        request.setUserId(999L);
        request.setUsername("spoofed-user");

        SysUser authenticatedUser = new SysUser();
        authenticatedUser.setUsername("authenticated-user");
        when(httpRequest.getHeader("Authorization")).thenReturn("Bearer valid-token");
        when(authTokenStore.getUserId("valid-token")).thenReturn(7L);
        when(sysUserMapper.selectById(7L)).thenReturn(authenticatedUser);
        when(sysUserMapper.selectRolesByUserId(7L)).thenReturn(List.of());
        ChatExecutionVO response = new ChatExecutionVO();
        response.setStatus("pending");
        response.setConversationId("conversation-1");
        when(aiChatService.resume(org.mockito.ArgumentMatchers.any(ChatResumeRequestDTO.class))).thenReturn(response);

        controller.resumeChat(request, httpRequest);

        ArgumentCaptor<ChatResumeRequestDTO> forwarded = ArgumentCaptor.forClass(ChatResumeRequestDTO.class);
        verify(aiChatService).resume(forwarded.capture());
        assertEquals(7L, forwarded.getValue().getUserId());
        assertEquals("authenticated-user", forwarded.getValue().getUsername());
        assertEquals("server-only-key", forwarded.getValue().getApiKey());
    }
}
