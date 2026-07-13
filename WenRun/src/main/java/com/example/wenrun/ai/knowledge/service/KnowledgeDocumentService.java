package com.example.wenrun.ai.knowledge.service;

import com.example.wenrun.ai.knowledge.model.KnowledgeBaseType;
import com.example.wenrun.ai.knowledge.model.KnowledgeDocumentStatus;
import com.example.wenrun.ai.knowledge.vo.KnowledgeDocumentVO;
import com.example.wenrun.ai.knowledge.vo.KnowledgeUploadVO;
import com.example.wenrun.common.PageResult;
import org.springframework.web.multipart.MultipartFile;

public interface KnowledgeDocumentService {

    KnowledgeUploadVO upload(KnowledgeBaseType knowledgeBase, MultipartFile file, Long uploadedBy);

    PageResult<KnowledgeDocumentVO> list(
            KnowledgeBaseType knowledgeBase,
            KnowledgeDocumentStatus status,
            int pageNum,
            int pageSize);

    KnowledgeDocumentVO get(KnowledgeBaseType knowledgeBase, String documentId);

    void retry(KnowledgeBaseType knowledgeBase, String documentId);

    void delete(KnowledgeBaseType knowledgeBase, String documentId);
}
