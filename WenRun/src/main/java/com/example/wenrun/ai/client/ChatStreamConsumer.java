package com.example.wenrun.ai.client;

import com.example.wenrun.ai.vo.ChatStreamEventVO;

@FunctionalInterface
public interface ChatStreamConsumer {

    void accept(ChatStreamEventVO event);
}
