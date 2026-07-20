package com.example.wenrun.ai.controller;

import com.example.wenrun.ai.config.AiServiceProperties;
import com.example.wenrun.ai.dto.ChatRequestDTO;
import com.example.wenrun.ai.dto.ChatResumeRequestDTO;
import com.example.wenrun.ai.exception.AiServiceException;
import com.example.wenrun.ai.service.AiChatService;
import com.example.wenrun.ai.vo.ChatResponseVO;
import com.example.wenrun.ai.vo.ChatExecutionVO;
import com.example.wenrun.common.Result;
import com.example.wenrun.common.constant.AccountType;
import com.example.wenrun.config.AuthTokenStore;
import com.example.wenrun.entity.ChatMessage;
import com.example.wenrun.entity.Patient;
import com.example.wenrun.entity.Staff;
import com.example.wenrun.entity.SysRole;
import com.example.wenrun.entity.SysUser;
import com.example.wenrun.mapper.ChatMessageMapper;
import com.example.wenrun.mapper.PatientMapper;
import com.example.wenrun.mapper.StaffMapper;
import com.example.wenrun.mapper.SysUserMapper;
import com.example.wenrun.service.support.LoginAssembler;
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
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;

@Slf4j
@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiChatController {

    private final AiChatService aiChatService;
    private final JwtProperties jwtProperties;
    private final SysUserMapper sysUserMapper;
    private final PatientMapper patientMapper;
    private final ChatMessageMapper chatMessageMapper;
    private final AiServiceProperties aiServiceProperties;

    @PostMapping("/chat")
    public Result<ChatResponseVO> chat(@Valid @RequestBody ChatRequestDTO dto, HttpServletRequest request) {
        enrichContext(dto, resolveToken(request));
        saveMessage(dto.getConversationId(), dto.getUserId(), "user", dto.getMessage());
        ChatResponseVO response = aiChatService.chat(dto);

        // 保存 AI 回复到 chat_messages
        if (response != null
                && "completed".equalsIgnoreCase(response.getStatus())
                && StringUtils.hasText(response.getReply())) {
            saveMessage(dto.getConversationId(), dto.getUserId(), "assistant", response.getReply());
        }

        return Result.success(response);
    }

    /** Continue a LangGraph execution after the authenticated user has made a HITL decision. */
    @PostMapping("/chat/resume")
    public Result<ChatExecutionVO> resumeChat(@Valid @RequestBody ChatResumeRequestDTO dto,
                                               HttpServletRequest request) {
        enrichResumeContext(dto, resolveToken(request));
        dto.setApiKey(aiServiceProperties.getApiKey());

        ChatExecutionVO response = aiChatService.resume(dto);
        if (response != null
                && "completed".equalsIgnoreCase(response.getStatus())
                && StringUtils.hasText(response.getReply())) {
            String conversationId = StringUtils.hasText(response.getConversationId())
                    ? response.getConversationId()
                    : dto.getConversationId();
            saveMessage(conversationId, dto.getUserId(), "assistant", response.getReply());
        }
        return Result.success(response);
    }

    /**
     * SSE 流式聊天：转发 FastAPI {@code /v1/chat/stream}，避免长耗时 Agent 触发读超时。
     */
    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter chatStream(@Valid @RequestBody ChatRequestDTO dto, HttpServletRequest request) {
        enrichContext(dto, resolveToken(request));
        saveMessage(dto.getConversationId(), dto.getUserId(), "user", dto.getMessage());

        long timeoutMs = aiServiceProperties.getStreamReadTimeout().toMillis();
        SseEmitter emitter = new SseEmitter(timeoutMs);
        emitter.onTimeout(emitter::complete);
        emitter.onError(ex -> log.warn("SSE 连接异常: {}", ex.getMessage()));

        CompletableFuture.runAsync(() -> {
            StringBuilder fullReply = new StringBuilder();
            boolean[] completed = {false};
            boolean[] interrupted = {false};
            try {
                aiChatService.streamChat(dto, event -> {
                    if (event == null || event.getType() == null) return;
                    try {
                        if ("error".equals(event.getType())) {
                            String errorContent = Objects.requireNonNullElse(event.getContent(), "AI 流式服务异常");
                            emitter.send(SseEmitter.event().name("error").data(errorContent));
                            emitter.completeWithError(new AiServiceException(errorContent));
                            completed[0] = true;
                            return;
                        }
                        emitter.send(SseEmitter.event().data(event));

                        if ("interrupt".equals(event.getType())) {
                            interrupted[0] = true;
                            completed[0] = true;
                            emitter.complete();
                            return;
                        }

                        if ("token".equals(event.getType()) && event.getContent() != null) {
                            fullReply.append(event.getContent());
                        }
                        if ("done".equals(event.getType())) {
                            String reply = StringUtils.hasText(event.getReply())
                                    ? event.getReply() : fullReply.toString();
                            saveMessage(dto.getConversationId(), dto.getUserId(), "assistant", reply);
                            emitter.complete();
                            completed[0] = true;
                        }
                    } catch (IOException ex) {
                        throw new AiServiceException("SSE 推送失败", ex);
                    }
                });
                if (!completed[0]) {
                    if (!interrupted[0] && !fullReply.isEmpty()) {
                        saveMessage(dto.getConversationId(), dto.getUserId(), "assistant", fullReply.toString());
                    }
                    emitter.complete();
                }
            } catch (Exception ex) {
                log.warn("AI 流式聊天失败: {}", ex.getMessage());
                try { emitter.send(SseEmitter.event().name("error").data(Objects.requireNonNullElse(ex.getMessage(), "AI 流式聊天失败"))); } catch (IOException ignored) {}
                emitter.completeWithError(ex);
            }
        });
        return emitter;
    }

    @PostMapping("/java/chat")
    public Result<JavaChatResponseVO> javaChat(@RequestBody JavaChatRequestDTO dto, HttpServletRequest request) {
        enrichJavaChatContext(dto, resolveToken(request));
        saveMessage(dto.getSessionId(), parseUserId(dto.getUserId()), "user", dto.getContent());
        JavaChatResponseVO result = aiChatService.javaChat(dto);
        saveJavaChatAssistantMessage(dto.getSessionId(), dto.getUserId(), result);
        return Result.success(result);
    }

    private void saveJavaChatAssistantMessage(String sessionId, String userId, JavaChatResponseVO result) {
        if (result == null || result.getFinalOutput() == null) {
            return;
        }
        saveMessage(sessionId, parseUserId(userId), "assistant", result.getFinalOutput());
    }

    private Long parseUserId(String userId) {
        if (!StringUtils.hasText(userId)) {
            return null;
        }
        try {
            return Long.parseLong(userId.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private void enrichJavaChatContext(JavaChatRequestDTO dto, String token) {
        if (!StringUtils.hasText(token)) return;
        try {
            JWTClaimsSet claims = JwtUtil.verifyAndParse(token, jwtProperties.getSecret());
            Long userId = JwtUtil.getUserId(claims);
            if (userId != null) dto.setUserId(String.valueOf(userId));
            dto.setExtra(enrichExtraWithToken(dto.getExtra(), token, claims));
        } catch (Exception ignored) {}
    }

    private Map<String, Object> enrichExtraWithToken(
            Map<String, Object> extra, String token, JWTClaimsSet claims) {
        Map<String, Object> resolved = extra != null ? extra : new java.util.HashMap<>();
        resolved.put("access_token", token);
        Long patientId = JwtUtil.getLongClaim(claims, "patient_id");
        if (patientId != null) resolved.put("patient_id", patientId);
        Long staffId = JwtUtil.getLongClaim(claims, "staff_id");
        if (staffId != null) resolved.put("staff_id", staffId);
        return resolved;
    }

    private void saveMessage(String conversationId, Long userId, String role, String content) {
        if (conversationId == null || content == null) return;
        try {
            ChatMessage msg = new ChatMessage();
            msg.setConversationId(conversationId);
            msg.setUserId(userId);
            msg.setRole(role);
            msg.setContent(content);
            chatMessageMapper.insert(msg);
        } catch (Exception e) { log.warn("保存聊天消息失败: {}", e.getMessage()); }
    }

    private void enrichContext(ChatRequestDTO dto, String token) {
        if (!StringUtils.hasText(token)) return;
        JWTClaimsSet claims;
        try { claims = JwtUtil.verifyAndParse(token, jwtProperties.getSecret()); }
        catch (Exception e) { return; }

        Long userId = JwtUtil.getUserId(claims);
        dto.setUserId(userId);
        dto.setUsername(JwtUtil.getStringClaim(claims, "username"));
        dto.setPortalType(JwtUtil.getStringClaim(claims, "portal_type"));
        List<String> roles = JwtUtil.getStringListClaim(claims, "roles");
        if (!roles.isEmpty()) dto.setRoleCode(roles.get(0));
        Long staffId = JwtUtil.getLongClaim(claims, "staff_id");
        if (staffId != null) dto.setStaffId(staffId);
        Long patientId = JwtUtil.getLongClaim(claims, "patient_id");
        if (patientId != null) {
            dto.setPatientId(patientId);
            Patient patient = patientMapper.selectByUserId(userId);
            if (patient != null) {
                dto.setPatientNo(patient.getPatientNo());
                dto.setPatientName(patient.getName());
                dto.setPatientGender(patient.getGender());
                if (patient.getBirthDate() != null) dto.setPatientBirthDate(patient.getBirthDate().toString());
                dto.setPatientAllergyHistory(patient.getAllergyHistory());
            }
        }
        SysUser user = sysUserMapper.selectById(userId);
        if (user != null) dto.setRealName(user.getRealName());
    }

    /**
     * Rebuilds identity from the authenticated token, deliberately discarding every identity
     * value supplied by the resume caller.
     */
    private void enrichResumeContext(ChatResumeRequestDTO dto, String token) {
        dto.setUserId(null);
        dto.setUsername(null);
        dto.setRealName(null);
        dto.setRoleCode(null);
        dto.setPortalType(null);
        dto.setStaffId(null);
        dto.setPatientId(null);
        dto.setPatientNo(null);
        dto.setPatientName(null);
        dto.setPatientGender(null);
        dto.setPatientBirthDate(null);
        dto.setPatientAllergyHistory(null);

        ChatRequestDTO trusted = new ChatRequestDTO();
        enrichContext(trusted, token);
        dto.setUserId(trusted.getUserId());
        dto.setUsername(trusted.getUsername());
        dto.setRealName(trusted.getRealName());
        dto.setRoleCode(trusted.getRoleCode());
        dto.setPortalType(trusted.getPortalType());
        dto.setStaffId(trusted.getStaffId());
        dto.setPatientId(trusted.getPatientId());
        dto.setPatientNo(trusted.getPatientNo());
        dto.setPatientName(trusted.getPatientName());
        dto.setPatientGender(trusted.getPatientGender());
        dto.setPatientBirthDate(trusted.getPatientBirthDate());
        dto.setPatientAllergyHistory(trusted.getPatientAllergyHistory());
    }

    private String resolveToken(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (StringUtils.hasText(auth) && auth.startsWith("Bearer ")) return auth.substring(7);
        return request.getHeader("X-Token");
    }
}
