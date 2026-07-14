package com.example.wenrun.service.impl;

import com.example.wenrun.common.constant.BizStatus;
import com.example.wenrun.common.exception.BusinessException;
import com.example.wenrun.entity.MedicalItem;
import com.example.wenrun.mapper.MedicalItemMapper;
import com.example.wenrun.service.MedicalItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MedicalItemServiceImpl implements MedicalItemService {

    private final MedicalItemMapper medicalItemMapper;

    @Override
    public List<MedicalItem> list(Integer itemType, Integer status) {
        return medicalItemMapper.selectList(itemType, status);
    }

    @Override
    public MedicalItem getById(Long id) {
        MedicalItem item = medicalItemMapper.selectById(id);
        if (item == null) {
            throw new BusinessException("诊疗项目不存在");
        }
        return item;
    }

    @Override
    public Long create(MedicalItem item) {
        if (item.getStatus() == null) {
            item.setStatus(BizStatus.ENABLED);
        }
        if (item.getPrice() == null) {
            item.setPrice(BigDecimal.ZERO);
        }
        medicalItemMapper.insert(item);
        return item.getId();
    }

    @Override
    public void update(MedicalItem item) {
        getById(item.getId());
        medicalItemMapper.updateById(item);
    }
}
