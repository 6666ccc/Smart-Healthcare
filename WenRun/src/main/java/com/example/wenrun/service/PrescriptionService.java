package com.example.wenrun.service;

import com.example.wenrun.dto.PrescriptionCreateDTO;
import com.example.wenrun.vo.PrescriptionVO;

import java.util.List;

public interface PrescriptionService {
    List<PrescriptionVO> listByVisit(Long visitId);
    List<PrescriptionVO> listPendingDispense();
    PrescriptionVO getById(Long id);
    Long create(PrescriptionCreateDTO dto);
    void cancel(Long id);
}
