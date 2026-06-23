package com.example.huiliao.service.impl;

import com.example.huiliao.mapper.DrugStockMapper;
import com.example.huiliao.service.DrugStockService;
import com.example.huiliao.vo.DrugStockVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 药品库存服务实现
 */
@Service
@RequiredArgsConstructor
public class DrugStockServiceImpl implements DrugStockService {

    private final DrugStockMapper drugStockMapper;

    /** 查询库存列表，lowStockOnly=true 时仅返回低于预警量的药品 */
    @Override
    public List<DrugStockVO> list(Boolean lowStockOnly) {
        return drugStockMapper.selectList(lowStockOnly);
    }
}
