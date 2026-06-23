package com.example.huiliao.ai.exception;

import com.example.huiliao.common.ResultCode;
import lombok.Getter;

/**
 * 调用 FastAPI / LangChain 服务失败
 * 用于包装调用 FastAPI / LangChain 服务时抛出的异常
 */
@Getter
public class AiServiceException extends RuntimeException {

    private final int code;

    public AiServiceException(String message) {
        this(message, null);
    }

    public AiServiceException(String message, Throwable cause) {
        super(message, cause);
        this.code = ResultCode.SERVICE_UNAVAILABLE;
    }
}
