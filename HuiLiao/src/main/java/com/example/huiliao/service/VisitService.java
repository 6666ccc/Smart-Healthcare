package com.example.huiliao.service;

import com.example.huiliao.dto.VisitUpdateDTO;
import com.example.huiliao.vo.VisitVO;

import java.util.List;

public interface VisitService {
    List<VisitVO> list(Integer status, Long staffId);
    VisitVO getById(Long id);
    Long startVisit(Long registrationId);
    void updateVisit(Long id, VisitUpdateDTO dto);
}
