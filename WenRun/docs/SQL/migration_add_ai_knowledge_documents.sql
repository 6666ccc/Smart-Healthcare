USE wenrun;

CREATE TABLE IF NOT EXISTS ai_knowledge_documents (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    document_id VARCHAR(64) NOT NULL,
    knowledge_base VARCHAR(32) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    file_sha256 VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL,
    chunk_count INT NOT NULL DEFAULT 0,
    error_message VARCHAR(1000) NULL,
    uploaded_by BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at DATETIME NULL,
    deleted_at DATETIME NULL,
    UNIQUE KEY uk_ai_knowledge_document_id (document_id),
    KEY idx_ai_knowledge_base_status (knowledge_base, status),
    KEY idx_ai_knowledge_base_digest (knowledge_base, file_sha256),
    KEY idx_ai_knowledge_processing_time (status, updated_at)
) COMMENT 'AI RAG 知识库文档管理元数据';
