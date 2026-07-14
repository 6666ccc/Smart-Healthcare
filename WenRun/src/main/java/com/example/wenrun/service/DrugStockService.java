package com.example.wenrun.service;

import com.example.wenrun.vo.DrugStockVO;

import java.util.List;

public interface DrugStockService {
    List<DrugStockVO> list(Boolean lowStockOnly);
}
