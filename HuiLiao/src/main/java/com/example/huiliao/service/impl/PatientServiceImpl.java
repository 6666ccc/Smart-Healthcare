package com.example.huiliao.service.impl;

import com.example.huiliao.common.exception.BusinessException;
import com.example.huiliao.common.util.BizNoUtil;
import org.springframework.util.StringUtils;
import com.example.huiliao.dto.PatientQueryDTO;
import com.example.huiliao.entity.Patient;
import com.example.huiliao.mapper.PatientMapper;
import com.example.huiliao.service.PatientService;
import com.example.huiliao.vo.PatientVO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PatientServiceImpl implements PatientService {

    private final PatientMapper patientMapper;

    @Override
    public List<PatientVO> list(PatientQueryDTO query) {
        return patientMapper.selectByCondition(query).stream()
                .map(this::toVo)
                .toList();
    }

    @Override
    public PatientVO getById(Long id) {
        Patient patient = patientMapper.selectById(id);
        if (patient == null) {
            throw new BusinessException("患者不存在");
        }
        return toVo(patient);
    }

    @Override
    public Long create(Patient patient) {
        if (!StringUtils.hasText(patient.getPatientNo())) {
            patient.setPatientNo(BizNoUtil.next("P"));
        }
        patientMapper.insert(patient);
        return patient.getId();
    }

    @Override
    public void update(Patient patient) {
        if (patient.getId() == null) {
            throw new BusinessException("患者ID不能为空");
        }
        if (patientMapper.selectById(patient.getId()) == null) {
            throw new BusinessException("患者不存在");
        }
        patientMapper.updateById(patient);
    }

    private PatientVO toVo(Patient patient) {
        PatientVO vo = new PatientVO();
        BeanUtils.copyProperties(patient, vo);
        return vo;
    }
}
