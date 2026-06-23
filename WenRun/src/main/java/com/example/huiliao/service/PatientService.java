package com.example.huiliao.service;

import com.example.huiliao.dto.PatientQueryDTO;
import com.example.huiliao.entity.Patient;
import com.example.huiliao.vo.PatientVO;

import java.util.List;

/**
 * 患者业务接口
 */
public interface PatientService {

    List<PatientVO> list(PatientQueryDTO query);

    PatientVO getById(Long id);

    Long create(Patient patient);

    void update(Patient patient);
}
