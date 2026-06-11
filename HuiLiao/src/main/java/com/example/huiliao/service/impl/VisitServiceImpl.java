package com.example.huiliao.service.impl;

import com.example.huiliao.common.constant.BizStatus;
import com.example.huiliao.common.exception.BusinessException;
import com.example.huiliao.common.util.BizNoUtil;
import com.example.huiliao.dto.VisitUpdateDTO;
import com.example.huiliao.entity.OutpatientVisit;
import com.example.huiliao.entity.Registration;
import com.example.huiliao.mapper.OutpatientVisitMapper;
import com.example.huiliao.mapper.RegistrationMapper;
import com.example.huiliao.service.VisitService;
import com.example.huiliao.vo.VisitVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class VisitServiceImpl implements VisitService {

    private final OutpatientVisitMapper visitMapper;
    private final RegistrationMapper registrationMapper;

    @Override
    public List<VisitVO> list(Integer status, Long staffId) {
        return visitMapper.selectList(status, staffId);
    }

    @Override
    public VisitVO getById(Long id) {
        VisitVO vo = visitMapper.selectVoById(id);
        if (vo == null) {
            throw new BusinessException("就诊记录不存在");
        }
        return vo;
    }

    @Override
    @Transactional
    public Long startVisit(Long registrationId) {
        Registration reg = registrationMapper.selectById(registrationId);
        if (reg == null) {
            throw new BusinessException("挂号单不存在");
        }
        if (reg.getStatus() != BizStatus.REG_REGISTERED) {
            throw new BusinessException("挂号单状态不允许接诊");
        }
        OutpatientVisit existing = visitMapper.selectByRegistrationId(registrationId);
        if (existing != null) {
            return existing.getId();
        }
        OutpatientVisit visit = new OutpatientVisit();
        visit.setVisitNo(BizNoUtil.next("VIS"));
        visit.setRegistrationId(registrationId);
        visit.setPatientId(reg.getPatientId());
        visit.setStaffId(reg.getStaffId());
        visit.setVisitTime(LocalDateTime.now());
        visit.setStatus(BizStatus.VISIT_IN_PROGRESS);
        visitMapper.insert(visit);
        registrationMapper.updateStatus(registrationId, BizStatus.REG_VISITED);
        return visit.getId();
    }

    @Override
    public void updateVisit(Long id, VisitUpdateDTO dto) {
        OutpatientVisit visit = visitMapper.selectById(id);
        if (visit == null) {
            throw new BusinessException("就诊记录不存在");
        }
        if (dto.getChiefComplaint() != null) {
            visit.setChiefComplaint(dto.getChiefComplaint());
        }
        if (dto.getDiagnosis() != null) {
            visit.setDiagnosis(dto.getDiagnosis());
        }
        if (Boolean.TRUE.equals(dto.getComplete())) {
            visit.setStatus(BizStatus.VISIT_COMPLETED);
        }
        visitMapper.updateById(visit);
    }
}
