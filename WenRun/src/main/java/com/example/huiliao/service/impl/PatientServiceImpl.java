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

/**
 * 患者档案服务实现
 */
@Service
@RequiredArgsConstructor
public class PatientServiceImpl implements PatientService {

    private final PatientMapper patientMapper;

    /** 按条件查询患者列表 */
    @Override
    public List<PatientVO> list(PatientQueryDTO query) {
        return patientMapper.selectByCondition(query).stream()
                .map(this::toVo)
                .toList();
    }

    /** 根据 ID 查询患者详情 */
    @Override
    public PatientVO getById(Long id) {
        Patient patient = patientMapper.selectById(id);
        if (patient == null) {
            throw new BusinessException("患者不存在");
        }
        return toVo(patient);
    }

    /** 新建患者档案，未指定编号时自动生成 */
    @Override
    public Long create(Patient patient) {
        if (!StringUtils.hasText(patient.getPatientNo())) {
            patient.setPatientNo(BizNoUtil.next("P"));
        }
        patientMapper.insert(patient);
        return patient.getId();
    }

    /** 更新患者档案 */
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
