package com.example.wenrun.ai.knowledge.client;

import com.example.wenrun.ai.config.AiServiceProperties;
import com.example.wenrun.ai.exception.AiServiceException;
import com.example.wenrun.ai.knowledge.entity.AiKnowledgeDocument;
import com.example.wenrun.ai.knowledge.model.KnowledgeBaseType;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.nio.file.Path;

@Component
public class KnowledgeAiClient {

    private final RestClient restClient;
    private final AiServiceProperties properties;

    public KnowledgeAiClient(
            @Qualifier("aiRestClient") RestClient restClient,
            AiServiceProperties properties) {
        this.restClient = restClient;
        this.properties = properties;
    }

    public IngestResult ingest(AiKnowledgeDocument document, Path source) {
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new FileSystemResource(source));
        body.add("documentId", document.getDocumentId());
        body.add("knowledgeBase", document.getKnowledgeBase().getPathValue());
        body.add("originalName", document.getOriginalName());

        try {
            IngestResult result = restClient.post()
                    .uri(properties.getKnowledgeIngestPath())
                    .header("X-Api-Key", properties.getApiKey())
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(body)
                    .retrieve()
                    .onStatus(status -> status.isError(), (request, response) -> {
                        throw new AiServiceException(
                                "AI 知识库入库失败: HTTP " + response.getStatusCode().value());
                    })
                    .body(IngestResult.class);
            if (result == null || result.chunkCount() < 1) {
                throw new AiServiceException("AI 知识库入库未返回有效切片");
            }
            return result;
        } catch (AiServiceException ex) {
            throw ex;
        } catch (RestClientException ex) {
            throw new AiServiceException("无法连接 AI 知识库服务", ex);
        }
    }

    public void delete(KnowledgeBaseType knowledgeBase, String documentId) {
        try {
            restClient.delete()
                    .uri(properties.getKnowledgeDeletePath(), knowledgeBase.getPathValue(), documentId)
                    .header("X-Api-Key", properties.getApiKey())
                    .exchange((request, response) -> {
                        if (response.getStatusCode() == HttpStatus.NOT_FOUND) {
                            return null;
                        }
                        if (response.getStatusCode().isError()) {
                            throw new AiServiceException(
                                    "AI 知识库删除失败: HTTP " + response.getStatusCode().value());
                        }
                        return null;
                    });
        } catch (AiServiceException ex) {
            throw ex;
        } catch (RestClientException ex) {
            throw new AiServiceException("无法连接 AI 知识库服务", ex);
        }
    }

    public record IngestResult(String documentId, String knowledgeBase, int chunkCount) {
    }
}
