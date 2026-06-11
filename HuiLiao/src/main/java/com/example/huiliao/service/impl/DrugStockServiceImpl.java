package com.example.huiliao.service.impl;

import com.example.huiliao.mapper.DrugStockMapper;
import com.example.huiliao.service.DrugStockService;
import com.example.huiliao.vo.DrugStockVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DrugStockServiceImpl implements DrugStockService {

    private final DrugStockMapper drugStockMapper;

    @Override
    public List<DrugStockVO> list(Boolean lowStockOnly) {
        return drugStockMapper.selectList(lowStockOnly);
    }
}
