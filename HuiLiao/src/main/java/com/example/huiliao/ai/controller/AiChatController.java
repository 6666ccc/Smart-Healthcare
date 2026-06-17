package com.example.huiliao.ai.controller;

import com.example.huiliao.ai.config.AiServiceProperties;
import com.example.huiliao.ai.dto.ChatRequestDTO;
import com.example.huiliao.ai.exception.AiServiceException;
import com.example.huiliao.ai.service.AiChatService;
import com.example.huiliao.ai.vo.ChatResponseVO;
import com.example.huiliao.common.Result;
import com.example.huiliao.common.constant.AccountType;
import com.example.huiliao.config.AuthTokenStore;
import com.example.huiliao.entity.ChatMessage;
import com.example.huiliao.entity.Patient;
import com.example.huiliao.entity.Staff;
import com.example.huiliao.entity.SysRole;
import com.example.huiliao.entity.SysUser;
import com.example.huiliao.mapper.ChatMessageMapper;
import com.example.huiliao.mapper.PatientMapper;
import com.example.huiliao.mapper.StaffMapper;
import com.example.huiliao.mapper.SysUserMapper;
import com.example.huiliao.service.support.LoginAssembler;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.CompletableFuture;

@Slf4j
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiChatController {

    private final AiChatService aiChatService;
    private final AuthTokenStore authTokenStore;
    private final SysUserMapper sysUserMapper;
    private final StaffMapper staffMapper;
    private final PatientMapper patientMapper;
    private final ChatMessageMapper chatMessageMapper;
    private final AiServiceProperties aiServiceProperties;

    @PostMapping("/chat")
    public Result<ChatResponseVO> chat(@Valid @RequestBody ChatRequestDTO dto, HttpServletRequest request) {
        String token = resolveToken(request);
        enrichContext(dto, token);
        dto.setApiKey(aiServiceProperties.getApiKey());

        // 保存用户消息到 chat_messages（供前端回显 & 审计）
        saveMessage(dto.getConversationId(), dto.getUserId(), "user", dto.getMessage());

        ChatResponseVO response = aiChatService.chat(dto);

        // 保存 AI 回复到 chat_messages
        saveMessage(dto.getConversationId(), dto.getUserId(), "assistant",
                response != null ? response.getReply() : "");

        return Result.success(response);
    }

    /**
     * SSE 流式聊天：转发 FastAPI {@code /v1/chat/stream}，避免长耗时 Agent 触发读超时。
     */
    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter chatStream(@Valid @RequestBody ChatRequestDTO dto, HttpServletRequest request) {
        String token = resolveToken(request);
        enrichContext(dto, token);
        dto.setApiKey(aiServiceProperties.getApiKey());

        saveMessage(dto.getConversationId(), dto.getUserId(), "user", dto.getMessage());

        long timeoutMs = aiServiceProperties.getStreamReadTimeout().toMillis();
        SseEmitter emitter = new SseEmitter(timeoutMs);
        emitter.onTimeout(emitter::complete);
        emitter.onError(ex -> log.warn("SSE 连接异常: {}", ex.getMessage()));

        CompletableFuture.runAsync(() -> {
            StringBuilder fullReply = new StringBuilder();
            boolean[] completed = {false};
            try {
                aiChatService.streamChat(dto, event -> {
                    if (event == null || event.getType() == null) {
                        return;
                    }
                    try {
                        if ("error".equals(event.getType())) {
                            emitter.send(SseEmitter.event().name("error").data(event.getContent()));
                            emitter.completeWithError(new AiServiceException(
                                    event.getContent() != null ? event.getContent() : "AI 流式服务异常"));
                            completed[0] = true;
                            return;
                        }

                        emitter.send(SseEmitter.event().data(event));

                        if ("token".equals(event.getType()) && event.getContent() != null) {
                            fullReply.append(event.getContent());
                        }

                        if ("done".equals(event.getType())) {
                            String reply = StringUtils.hasText(event.getReply())
                                    ? event.getReply()
                                    : fullReply.toString();
                            saveMessage(dto.getConversationId(), dto.getUserId(), "assistant", reply);
                            emitter.complete();
                            completed[0] = true;
                        }
                    } catch (IOException ex) {
                        throw new AiServiceException("SSE 推送失败", ex);
                    }
                });

                if (!completed[0]) {
                    if (!fullReply.isEmpty()) {
                        saveMessage(dto.getConversationId(), dto.getUserId(), "assistant", fullReply.toString());
                    }
                    emitter.complete();
                }
            } catch (Exception ex) {
                log.warn("AI 流式聊天失败: {}", ex.getMessage());
                try {
                    emitter.send(SseEmitter.event().name("error").data(ex.getMessage()));
                } catch (IOException ignored) {
                    // ignore secondary failure
                }
                emitter.completeWithError(ex);
            }
        });

        return emitter;
    }

    private void saveMessage(String conversationId, Long userId, String role, String content) {
        if (conversationId == null || content == null) {
            return;
        }
        try {
            ChatMessage msg = new ChatMessage();
            msg.setConversationId(conversationId);
            msg.setUserId(userId);
            msg.setRole(role);
            msg.setContent(content);
            chatMessageMapper.insert(msg);
        } catch (Exception e) {
            log.warn("保存聊天消息失败 (conversationId={}, role={}): {}",
                    conversationId, role, e.getMessage());
        }
    }

    private void enrichContext(ChatRequestDTO dto, String token) {
        Long userId = authTokenStore.getUserId(token);
        if (userId == null) {
            return;
        }

        SysUser user = sysUserMapper.selectById(userId);
        if (user == null) {
            return;
        }

        dto.setUserId(userId);
        dto.setUsername(user.getUsername());
        dto.setRealName(user.getRealName());

        List<SysRole> roles = sysUserMapper.selectRolesByUserId(userId);
        SysRole primary = LoginAssembler.pickPrimaryRole(roles);
        String portalType = LoginAssembler.resolvePortalType(user, primary);
        dto.setPortalType(portalType);
        if (primary != null) {
            dto.setRoleCode(primary.getRoleCode());
        }

        String accountType = user.getAccountType();
        if (!StringUtils.hasText(accountType)) {
            accountType = AccountType.INTERNAL;
        }

        if (AccountType.STAFF.equals(accountType)) {
            Staff staff = staffMapper.selectByUserId(userId);
            if (staff != null) {
                dto.setStaffId(staff.getId());
            }
        }

        if (AccountType.PATIENT.equals(accountType)) {
            Patient patient = patientMapper.selectByUserId(userId);
            if (patient != null) {
                dto.setPatientId(patient.getId());
                dto.setPatientNo(patient.getPatientNo());
                dto.setPatientName(patient.getName());
                dto.setPatientGender(patient.getGender());
                if (patient.getBirthDate() != null) {
                    dto.setPatientBirthDate(patient.getBirthDate().toString());
                }
                dto.setPatientAllergyHistory(patient.getAllergyHistory());
            }
        }
    }

    private String resolveToken(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (StringUtils.hasText(auth) && auth.startsWith("Bearer ")) {
            return auth.substring(7);
        }
        return request.getHeader("X-Token");
    }
}