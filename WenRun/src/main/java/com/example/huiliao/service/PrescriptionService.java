package com.example.huiliao.service;

import com.example.huiliao.dto.PrescriptionCreateDTO;
import com.example.huiliao.vo.PrescriptionVO;

import java.util.List;

public interface PrescriptionService {
    List<PrescriptionVO> listByVisit(Long visitId);
    List<PrescriptionVO> listPendingDispense();
    PrescriptionVO getById(Long id);
    Long create(PrescriptionCreateDTO dto);
    void cancel(Long id);
}
