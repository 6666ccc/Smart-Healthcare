package com.example.huiliao.ai.client;

import com.example.huiliao.ai.vo.ChatStreamEventVO;

@FunctionalInterface
public interface ChatStreamConsumer {

    void accept(ChatStreamEventVO event);
}
