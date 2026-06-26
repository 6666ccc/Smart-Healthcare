package com.example.wenrun.service;

import com.example.wenrun.dto.VisitUpdateDTO;
import com.example.wenrun.vo.VisitVO;

import java.util.List;

public interface VisitService {
    List<VisitVO> list(Integer status, Long staffId);
    VisitVO getById(Long id);
    Long startVisit(Long registrationId);
    void updateVisit(Long id, VisitUpdateDTO dto);
}
