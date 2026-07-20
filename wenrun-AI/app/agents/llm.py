import os

from dotenv import load_dotenv
from langchain.chat_models import init_chat_model

load_dotenv()

MODEL = init_chat_model(
    model=os.getenv("MODEL_NAME", "glm-5.1"),
    model_provider=os.getenv("MODEL_PROVIDER", "openai"),
    temperature=float(os.getenv("MODEL_TEMPERATURE", "0.3")),

)
