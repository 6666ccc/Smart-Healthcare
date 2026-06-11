package com.example.huiliao.service;

import com.example.huiliao.vo.DrugStockVO;

import java.util.List;

public interface DrugStockService {
    List<DrugStockVO> list(Boolean lowStockOnly);
}
