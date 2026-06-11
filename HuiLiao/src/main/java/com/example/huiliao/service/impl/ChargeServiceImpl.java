package com.example.huiliao.service.impl;

import com.example.huiliao.common.constant.BizStatus;
import com.example.huiliao.common.context.UserContext;
import com.example.huiliao.common.exception.BusinessException;
import com.example.huiliao.common.util.BizNoUtil;
import com.example.huiliao.dto.ChargePayDTO;
import com.example.huiliao.entity.ChargeDetail;
import com.example.huiliao.entity.ChargeOrder;
import com.example.huiliao.entity.ExamRequest;
import com.example.huiliao.entity.MedicalItem;
import com.example.huiliao.entity.OutpatientVisit;
import com.example.huiliao.entity.Prescription;
import com.example.huiliao.entity.Registration;
import com.example.huiliao.mapper.ChargeDetailMapper;
import com.example.huiliao.mapper.ChargeOrderMapper;
import com.example.huiliao.mapper.ExamRequestMapper;
import com.example.huiliao.mapper.MedicalItemMapper;
import com.example.huiliao.mapper.OutpatientVisitMapper;
import com.example.huiliao.mapper.PrescriptionMapper;
import com.example.huiliao.mapper.RegistrationMapper;
import com.example.huiliao.service.ChargeService;
import com.example.huiliao.vo.ChargeOrderVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ChargeServiceImpl implements ChargeService {

    private final ChargeOrderMapper chargeOrderMapper;
    private final ChargeDetailMapper chargeDetailMapper;
    private final OutpatientVisitMapper visitMapper;
    private final RegistrationMapper registrationMapper;
    private final PrescriptionMapper prescriptionMapper;
    private final ExamRequestMapper examRequestMapper;
    private final MedicalItemMapper medicalItemMapper;

    @Override
    public List<ChargeOrderVO> list(Integer payStatus, Long patientId) {
        return chargeOrderMapper.selectList(payStatus, patientId);
    }

    @Override
    public ChargeOrderVO getById(Long id) {
        ChargeOrder order = chargeOrderMapper.selectById(id);
        if (order == null) {
            throw new BusinessException("收费单不存在");
        }
        ChargeOrderVO vo = chargeOrderMapper.selectList(null, null).stream()
                .filter(o -> o.getId().equals(id)).findFirst()
                .orElse(new ChargeOrderVO());
        vo.setId(order.getId());
        vo.setOrderNo(order.getOrderNo());
        vo.setPatientId(order.getPatientId());
        vo.setVisitId(order.getVisitId());
        vo.setTotalAmount(order.getTotalAmount());
        vo.setPaidAmount(order.getPaidAmount());
        vo.setPayType(order.getPayType());
        vo.setPayStatus(order.getPayStatus());
        vo.setPayTime(order.getPayTime());
        vo.setCreateTime(order.getCreateTime());
        vo.setDetails(chargeDetailMapper.selectByOrderId(id));
        return vo;
    }

    @Override
    @Transactional
    public Long createFromVisit(Long visitId) {
        OutpatientVisit visit = visitMapper.selectById(visitId);
        if (visit == null) {
            throw new BusinessException("就诊记录不存在");
        }
        List<ChargeDetail> details = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;

        Registration reg = registrationMapper.selectById(visit.getRegistrationId());
        if (reg != null && chargeDetailMapper.countByBiz(BizStatus.CHARGE_REG, reg.getId()) == 0) {
            ChargeDetail d = new ChargeDetail();
            d.setBizType(BizStatus.CHARGE_REG);
            d.setBizId(reg.getId());
            d.setItemName("挂号费");
            d.setAmount(reg.getRegFee());
            details.add(d);
            total = total.add(reg.getRegFee());
        }

        for (Prescription rx : prescriptionMapper.selectPendingByVisitId(visitId, BizStatus.RX_PENDING_PAY)) {
            if (chargeDetailMapper.countByBiz(BizStatus.CHARGE_RX, rx.getId()) == 0) {
                ChargeDetail d = new ChargeDetail();
                d.setBizType(BizStatus.CHARGE_RX);
                d.setBizId(rx.getId());
                d.setItemName("处方 " + rx.getRxNo());
                d.setAmount(rx.getTotalAmount());
                details.add(d);
                total = total.add(rx.getTotalAmount());
            }
        }

        for (ExamRequest ex : examRequestMapper.selectPendingByVisitId(visitId, BizStatus.EXAM_PENDING_PAY)) {
            if (chargeDetailMapper.countByBiz(BizStatus.CHARGE_EXAM, ex.getId()) == 0) {
                MedicalItem item = medicalItemMapper.selectById(ex.getItemId());
                ChargeDetail d = new ChargeDetail();
                d.setBizType(BizStatus.CHARGE_EXAM);
                d.setBizId(ex.getId());
                d.setItemName(item != null ? item.getItemName() : "检查项目");
                d.setAmount(ex.getAmount());
                details.add(d);
                total = total.add(ex.getAmount());
            }
        }

        if (details.isEmpty()) {
            throw new BusinessException("没有待收费项目");
        }

        ChargeOrder order = new ChargeOrder();
        order.setOrderNo(BizNoUtil.next("CHG"));
        order.setPatientId(visit.getPatientId());
        order.setVisitId(visitId);
        order.setTotalAmount(total);
        order.setPaidAmount(BigDecimal.ZERO);
        order.setPayStatus(BizStatus.PAY_PENDING);
        order.setCashierId(UserContext.getUserId());
        chargeOrderMapper.insert(order);

        for (ChargeDetail d : details) {
            d.setChargeOrderId(order.getId());
        }
        chargeDetailMapper.insertBatch(details);
        return order.getId();
    }

    @Override
    @Transactional
    public void pay(Long orderId, ChargePayDTO dto) {
        ChargeOrder order = chargeOrderMapper.selectById(orderId);
        if (order == null) {
            throw new BusinessException("收费单不存在");
        }
        if (order.getPayStatus() != BizStatus.PAY_PENDING) {
            throw new BusinessException("收费单状态不允许支付");
        }
        BigDecimal paid = dto.getPaidAmount() != null ? dto.getPaidAmount() : order.getTotalAmount();
        order.setPaidAmount(paid);
        order.setPayType(dto.getPayType());
        order.setPayStatus(BizStatus.PAY_PAID);
        order.setCashierId(UserContext.getUserId());
        order.setPayTime(LocalDateTime.now());
        chargeOrderMapper.updatePay(order);

        List<ChargeDetail> details = chargeDetailMapper.selectByOrderId(orderId);
        for (ChargeDetail d : details) {
            if (d.getBizType() == BizStatus.CHARGE_RX) {
                prescriptionMapper.updateStatus(d.getBizId(), BizStatus.RX_PAID);
            } else if (d.getBizType() == BizStatus.CHARGE_EXAM) {
                examRequestMapper.updateStatus(d.getBizId(), BizStatus.EXAM_PAID);
            }
        }
    }
}
