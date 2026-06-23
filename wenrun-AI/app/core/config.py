from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """全局配置：FastAPI 服务基础参数。""" 
    JAVA_CLIEN_TIMEOUT: int = 30
    #为Java调用规范API版本前缀
    API_V1_STR: str = "/api/v1"
    
    
settings = Settings()