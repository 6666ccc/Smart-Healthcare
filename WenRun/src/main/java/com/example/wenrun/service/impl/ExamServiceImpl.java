package com.example.wenrun.service.impl;

import com.example.wenrun.common.constant.BizStatus;
import com.example.wenrun.common.exception.BusinessException;
import com.example.wenrun.common.util.BizNoUtil;
import com.example.wenrun.dto.ExamRequestCreateDTO;
import com.example.wenrun.entity.ExamRequest;
import com.example.wenrun.entity.MedicalItem;
import com.example.wenrun.entity.OutpatientVisit;
import com.example.wenrun.mapper.ExamRequestMapper;
import com.example.wenrun.mapper.MedicalItemMapper;
import com.example.wenrun.mapper.OutpatientVisitMapper;
import com.example.wenrun.service.ExamService;
import com.example.wenrun.service.support.CurrentStaffSupport;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ExamServiceImpl implements ExamService {

    private final ExamRequestMapper examRequestMapper;
    private final OutpatientVisitMapper visitMapper;
    private final MedicalItemMapper medicalItemMapper;
    private final CurrentStaffSupport currentStaffSupport;

    @Override
    public List<ExamRequest> listByVisit(Long visitId) {
        return examRequestMapper.selectByVisitId(visitId);
    }

    @Override
    public Long create(ExamRequestCreateDTO dto) {
        OutpatientVisit visit = visitMapper.selectById(dto.getVisitId());
        if (visit == null) {
            throw new BusinessException("就诊记录不存在");
        }
        currentStaffSupport.assertOwnsStaff(visit.getStaffId());
        MedicalItem item = medicalItemMapper.selectById(dto.getItemId());
        if (item == null || item.getStatus() != BizStatus.ENABLED) {
            throw new BusinessException("诊疗项目不可用");
        }
        ExamRequest request = new ExamRequest();
        request.setRequestNo(BizNoUtil.next("EX"));
        request.setVisitId(visit.getId());
        request.setPatientId(visit.getPatientId());
        request.setItemId(item.getId());
        request.setAmount(item.getPrice());
        request.setStatus(BizStatus.EXAM_PENDING_PAY);
        examRequestMapper.insert(request);
        return request.getId();
    }
}
