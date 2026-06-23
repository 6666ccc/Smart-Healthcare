import os
from dotenv import load_dotenv
from langchain.chat_models import init_chat_model
from langchain.agents import create_agent
from app.schemas.chat import ChatRequest, ChatResponse

load_dotenv()

# 初始化聊天模型
model = init_chat_model(
    model=os.getenv("MODEL_NAME", "glm-5.1"),
    model_provider=os.getenv("MODEL_PROVIDER", "openai"),
    temperature=float(os.getenv("MODEL_TEMPERATURE", "0.3")),
)

# 创建智能体
agent = create_agent(
    model=model,
    system_prompt=os.getenv("SYSTEM_PROMPT", "You are a helpful assistant."),
)


def process_chat(request: ChatRequest) -> ChatResponse:
    """
    非流式处理：收集 AI 全部回复后统一返回。
    相当于 Java Service 中的同步方法。
    """
    reply = ""
    for chunk in agent.stream(
        {"messages": [{"role": "user", "content": request.content}]},
        stream_mode="values",
    ):
        # stream_mode="values" 每次 yield 完整状态，最后一条包含 AI 最终回复
        messages = chunk.get("messages", [])
        if messages:
            last_msg = messages[-1]
            if hasattr(last_msg, "content") and isinstance(last_msg.content, str):
                reply = last_msg.content

    return ChatResponse(reply=reply, session_id=request.session_id)


def process_chat_stream(request: ChatRequest):
    """
    流式处理：逐个 yield AI 回复的文本块。
    相当于 Java Service 中的返回 InputStream/Flux 的方法。
    配合 FastAPI StreamingResponse 使用。
    """
    for step_tuple in agent.stream(
        {"messages": [{"role": "user", "content": request.content}]},
        stream_mode="messages",
    ):
        # stream_mode="messages" 每次 yield token 级别的增量
        # step_tuple 格式: (AIMessageChunk, metadata_dict)
        if not isinstance(step_tuple, (tuple, list)) or len(step_tuple) < 1:
            continue
        msg_chunk = step_tuple[0]
        content = getattr(msg_chunk, "content", "") or ""
        if content:
            yield content
