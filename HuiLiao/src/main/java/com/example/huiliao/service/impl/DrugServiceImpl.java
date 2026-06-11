package com.example.huiliao.service.impl;

import com.example.huiliao.common.constant.BizStatus;
import com.example.huiliao.common.exception.BusinessException;
import com.example.huiliao.entity.Drug;
import com.example.huiliao.entity.DrugStock;
import com.example.huiliao.mapper.DrugMapper;
import com.example.huiliao.mapper.DrugStockMapper;
import com.example.huiliao.service.DrugService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DrugServiceImpl implements DrugService {

    private final DrugMapper drugMapper;
    private final DrugStockMapper drugStockMapper;

    @Override
    public List<Drug> list(String keyword, Integer status) {
        return drugMapper.selectList(keyword, status);
    }

    @Override
    public Drug getById(Long id) {
        Drug drug = drugMapper.selectById(id);
        if (drug == null) {
            throw new BusinessException("药品不存在");
        }
        return drug;
    }

    @Override
    @Transactional
    public Long create(Drug drug) {
        if (drug.getStatus() == null) {
            drug.setStatus(BizStatus.ENABLED);
        }
        if (drug.getPrice() == null) {
            drug.setPrice(BigDecimal.ZERO);
        }
        drugMapper.insert(drug);
        DrugStock stock = new DrugStock();
        stock.setDrugId(drug.getId());
        stock.setQuantity(BigDecimal.valueOf(100));
        stock.setWarnQuantity(BigDecimal.valueOf(10));
        drugStockMapper.insert(stock);
        return drug.getId();
    }

    @Override
    public void update(Drug drug) {
        getById(drug.getId());
        drugMapper.updateById(drug);
    }
}
