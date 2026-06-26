package com.example.wenrun.ai.controller;

import com.example.wenrun.ai.config.AiServiceProperties;
import com.example.wenrun.ai.dto.ChatRequestDTO;
import com.example.wenrun.ai.dto.JavaChatRequestDTO;
import com.example.wenrun.ai.exception.AiServiceException;
import com.example.wenrun.ai.service.AiChatService;
import com.example.wenrun.ai.vo.ChatResponseVO;
import com.example.wenrun.common.Result;
import com.example.wenrun.config.JwtProperties;
import com.example.wenrun.entity.ChatMessage;
import com.example.wenrun.entity.Patient;
import com.example.wenrun.entity.SysUser;
import com.example.wenrun.mapper.ChatMessageMapper;
import com.example.wenrun.mapper.PatientMapper;
import com.example.wenrun.mapper.SysUserMapper;
import com.example.wenrun.util.JwtUtil;
import com.nimbusds.jwt.JWTClaimsSet;
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
        saveMessage(dto.getConversationId(), dto.getUserId(), "assistant",
                response != null ? response.getReply() : "");
        return Result.success(response);
    }

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
                    if (!fullReply.isEmpty()) saveMessage(dto.getConversationId(), dto.getUserId(), "assistant", fullReply.toString());
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
    public Result<Map<String, Object>> javaChat(@RequestBody JavaChatRequestDTO dto, HttpServletRequest request) {
        enrichJavaChatContext(dto, resolveToken(request));
        saveMessage(dto.getSessionId(), dto.getUserId() != null ? Long.parseLong(dto.getUserId()) : null, "user", dto.getContent());
        Map<String, Object> result = aiChatService.javaChat(dto);
        Object finalOutput = result.get("final_output");
        if (finalOutput != null) saveMessage(dto.getSessionId(), dto.getUserId() != null ? Long.parseLong(dto.getUserId()) : null, "assistant", finalOutput.toString());
        return Result.success(result);
    }

    private void enrichJavaChatContext(JavaChatRequestDTO dto, String token) {
        if (!StringUtils.hasText(token)) return;
        try {
            JWTClaimsSet claims = JwtUtil.verifyAndParse(token, jwtProperties.getSecret());
            Long userId = JwtUtil.getUserId(claims);
            if (userId != null) dto.setUserId(String.valueOf(userId));
            Map<String, Object> extra = dto.getExtra();
            if (extra == null) { extra = new java.util.HashMap<>(); dto.setExtra(extra); }
            extra.put("access_token", token);
            Long patientId = JwtUtil.getLongClaim(claims, "patient_id");
            if (patientId != null) extra.put("patient_id", patientId);
            Long staffId = JwtUtil.getLongClaim(claims, "staff_id");
            if (staffId != null) extra.put("staff_id", staffId);
        } catch (Exception ignored) {}
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

    private String resolveToken(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (StringUtils.hasText(auth) && auth.startsWith("Bearer ")) return auth.substring(7);
        return request.getHeader("X-Token");
    }
}
