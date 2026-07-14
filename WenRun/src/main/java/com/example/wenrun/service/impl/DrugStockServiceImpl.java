package com.example.wenrun.service.impl;

import com.example.wenrun.mapper.DrugStockMapper;
import com.example.wenrun.service.DrugStockService;
import com.example.wenrun.vo.DrugStockVO;
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
