package com.example.huiliao.service.impl;

import com.example.huiliao.common.constant.BizStatus;
import com.example.huiliao.common.context.UserContext;
import com.example.huiliao.common.exception.BusinessException;
import com.example.huiliao.entity.DispenseRecord;
import com.example.huiliao.entity.DrugStock;
import com.example.huiliao.entity.Prescription;
import com.example.huiliao.entity.PrescriptionItem;
import com.example.huiliao.mapper.DispenseRecordMapper;
import com.example.huiliao.mapper.DrugStockMapper;
import com.example.huiliao.mapper.PrescriptionItemMapper;
import com.example.huiliao.mapper.PrescriptionMapper;
import com.example.huiliao.service.DispenseService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 发药服务实现 — 扣减库存并记录发药
 */
@Service
@RequiredArgsConstructor
public class DispenseServiceImpl implements DispenseService {

    private final PrescriptionMapper prescriptionMapper;
    private final PrescriptionItemMapper prescriptionItemMapper;
    private final DrugStockMapper drugStockMapper;
    private final DispenseRecordMapper dispenseRecordMapper;

    /** 对已缴费处方执行发药：校验库存、扣减数量、写入发药记录 */
    @Override
    @Transactional
    public void dispense(Long prescriptionId) {
        Prescription rx = prescriptionMapper.selectById(prescriptionId);
        if (rx == null) {
            throw new BusinessException("处方不存在");
        }
        if (rx.getStatus() != BizStatus.RX_PAID) {
            throw new BusinessException("处方未缴费，不能发药");
        }
        if (dispenseRecordMapper.selectByPrescriptionId(prescriptionId) != null) {
            throw new BusinessException("处方已发药");
        }
        List<PrescriptionItem> items = prescriptionItemMapper.selectByPrescriptionId(prescriptionId);
        for (PrescriptionItem item : items) {
            DrugStock stock = drugStockMapper.selectByDrugIdForUpdate(item.getDrugId());
            if (stock == null || stock.getQuantity().compareTo(item.getQuantity()) < 0) {
                throw new BusinessException("药品库存不足，drugId=" + item.getDrugId());
            }
            int rows = drugStockMapper.deductQuantity(item.getDrugId(), item.getQuantity());
            if (rows == 0) {
                throw new BusinessException("库存扣减失败");
            }
        }
        DispenseRecord record = new DispenseRecord();
        record.setPrescriptionId(prescriptionId);
        record.setPharmacistId(UserContext.getUserId());
        record.setDispenseTime(LocalDateTime.now());
        record.setStatus(BizStatus.ENABLED);
        dispenseRecordMapper.insert(record);
        prescriptionMapper.updateStatus(prescriptionId, BizStatus.RX_DISPENSED);
    }
}
