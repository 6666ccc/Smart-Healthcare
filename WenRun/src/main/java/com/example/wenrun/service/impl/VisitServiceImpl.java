package com.example.wenrun.service.impl;

import com.example.wenrun.common.constant.BizStatus;
import com.example.wenrun.common.exception.BusinessException;
import com.example.wenrun.common.util.BizNoUtil;
import com.example.wenrun.dto.VisitUpdateDTO;
import com.example.wenrun.entity.OutpatientVisit;
import com.example.wenrun.entity.Registration;
import com.example.wenrun.mapper.OutpatientVisitMapper;
import com.example.wenrun.mapper.RegistrationMapper;
import com.example.wenrun.service.VisitService;
import com.example.wenrun.service.support.CurrentStaffSupport;
import com.example.wenrun.vo.VisitVO;
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
    private final CurrentStaffSupport currentStaffSupport;

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
        currentStaffSupport.assertOwnsStaff(vo.getStaffId());
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
        currentStaffSupport.assertOwnsStaff(reg.getStaffId());
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
        currentStaffSupport.assertOwnsStaff(visit.getStaffId());
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
