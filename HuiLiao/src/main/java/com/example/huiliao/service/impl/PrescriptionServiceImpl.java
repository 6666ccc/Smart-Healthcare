package com.example.huiliao.service.impl;

import com.example.huiliao.common.constant.BizStatus;
import com.example.huiliao.common.context.UserContext;
import com.example.huiliao.common.exception.BusinessException;
import com.example.huiliao.common.util.BizNoUtil;
import com.example.huiliao.dto.PrescriptionCreateDTO;
import com.example.huiliao.dto.PrescriptionItemDTO;
import com.example.huiliao.entity.Drug;
import com.example.huiliao.entity.OutpatientVisit;
import com.example.huiliao.entity.Prescription;
import com.example.huiliao.entity.PrescriptionItem;
import com.example.huiliao.mapper.DrugMapper;
import com.example.huiliao.mapper.OutpatientVisitMapper;
import com.example.huiliao.mapper.PatientMapper;
import com.example.huiliao.mapper.PrescriptionItemMapper;
import com.example.huiliao.mapper.PrescriptionMapper;
import com.example.huiliao.service.PrescriptionService;
import com.example.huiliao.vo.PrescriptionVO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PrescriptionServiceImpl implements PrescriptionService {

    private final PrescriptionMapper prescriptionMapper;
    private final PrescriptionItemMapper prescriptionItemMapper;
    private final OutpatientVisitMapper visitMapper;
    private final DrugMapper drugMapper;
    private final PatientMapper patientMapper;

    @Override
    public List<PrescriptionVO> listByVisit(Long visitId) {
        return prescriptionMapper.selectByVisitId(visitId).stream()
                .map(this::toVo)
                .toList();
    }

    @Override
    public List<PrescriptionVO> listPendingDispense() {
        return prescriptionMapper.selectByStatus(BizStatus.RX_PAID).stream()
                .map(this::toVo)
                .toList();
    }

    @Override
    public PrescriptionVO getById(Long id) {
        Prescription rx = prescriptionMapper.selectById(id);
        if (rx == null) {
            throw new BusinessException("处方不存在");
        }
        return toVo(rx);
    }

    @Override
    @Transactional
    public Long create(PrescriptionCreateDTO dto) {
        OutpatientVisit visit = visitMapper.selectById(dto.getVisitId());
        if (visit == null) {
            throw new BusinessException("就诊记录不存在");
        }
        BigDecimal total = BigDecimal.ZERO;
        List<PrescriptionItem> items = new ArrayList<>();
        for (PrescriptionItemDTO itemDto : dto.getItems()) {
            Drug drug = drugMapper.selectById(itemDto.getDrugId());
            if (drug == null || drug.getStatus() != BizStatus.ENABLED) {
                throw new BusinessException("药品不可用: " + itemDto.getDrugId());
            }
            BigDecimal amount = drug.getPrice().multiply(itemDto.getQuantity());
            total = total.add(amount);
            PrescriptionItem item = new PrescriptionItem();
            item.setDrugId(drug.getId());
            item.setQuantity(itemDto.getQuantity());
            item.setUnitPrice(drug.getPrice());
            item.setAmount(amount);
            item.setUsageDesc(itemDto.getUsageDesc());
            items.add(item);
        }
        Prescription rx = new Prescription();
        rx.setRxNo(BizNoUtil.next("RX"));
        rx.setVisitId(visit.getId());
        rx.setPatientId(visit.getPatientId());
        rx.setStaffId(visit.getStaffId() != null ? visit.getStaffId() : UserContext.getUserId());
        rx.setTotalAmount(total);
        rx.setStatus(BizStatus.RX_PENDING_PAY);
        prescriptionMapper.insert(rx);
        for (PrescriptionItem item : items) {
            item.setPrescriptionId(rx.getId());
        }
        prescriptionItemMapper.insertBatch(items);
        return rx.getId();
    }

    @Override
    public void cancel(Long id) {
        Prescription rx = prescriptionMapper.selectById(id);
        if (rx == null) {
            throw new BusinessException("处方不存在");
        }
        if (rx.getStatus() != BizStatus.RX_PENDING_PAY) {
            throw new BusinessException("仅待缴费处方可作废");
        }
        prescriptionMapper.updateStatus(id, BizStatus.RX_CANCELLED);
    }

    private PrescriptionVO toVo(Prescription rx) {
        PrescriptionVO vo = new PrescriptionVO();
        BeanUtils.copyProperties(rx, vo);
        var patient = patientMapper.selectById(rx.getPatientId());
        if (patient != null) {
            vo.setPatientName(patient.getName());
        }
        vo.setItems(prescriptionItemMapper.selectByPrescriptionId(rx.getId()));
        return vo;
    }
}
