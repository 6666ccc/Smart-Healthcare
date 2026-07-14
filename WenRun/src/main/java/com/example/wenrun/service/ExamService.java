package com.example.wenrun.service;

import com.example.wenrun.dto.ExamRequestCreateDTO;
import com.example.wenrun.entity.ExamRequest;

import java.util.List;

public interface ExamService {
    List<ExamRequest> listByVisit(Long visitId);
    Long create(ExamRequestCreateDTO dto);
}
