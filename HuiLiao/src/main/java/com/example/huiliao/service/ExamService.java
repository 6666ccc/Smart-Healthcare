package com.example.huiliao.service;

import com.example.huiliao.dto.ExamRequestCreateDTO;
import com.example.huiliao.entity.ExamRequest;

import java.util.List;

public interface ExamService {
    List<ExamRequest> listByVisit(Long visitId);
    Long create(ExamRequestCreateDTO dto);
}
