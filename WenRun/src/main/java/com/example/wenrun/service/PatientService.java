package com.example.wenrun.service;

import com.example.wenrun.dto.PatientQueryDTO;
import com.example.wenrun.entity.Patient;
import com.example.wenrun.vo.PatientVO;

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
