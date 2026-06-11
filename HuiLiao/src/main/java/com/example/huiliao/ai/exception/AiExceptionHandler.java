package com.example.huiliao.ai.exception;

import com.example.huiliao.common.Result;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice(assignableTypes = com.example.huiliao.ai.controller.AiChatController.class)
public class AiExceptionHandler {

    @ExceptionHandler(AiServiceException.class)
    public Result<Void> handleAiServiceException(AiServiceException ex) {
        log.warn("AI 服务调用失败: {}", ex.getMessage());
        return Result.fail(ex.getCode(), ex.getMessage());
    }
}
