package com.example.huiliao.controller;

import com.example.huiliao.common.Result;
import com.example.huiliao.service.DrugStockService;
import com.example.huiliao.vo.DrugStockVO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 药品库存接口
 */
@RestController
@RequestMapping("/api/drug-stocks")
@RequiredArgsConstructor
public class DrugStockController {

    private final DrugStockService drugStockService;

    /** GET /api/drug-stocks — 查询库存列表，lowStockOnly=true 时仅返回低库存药品 */
    @GetMapping
    public Result<List<DrugStockVO>> list(@RequestParam(required = false) Boolean lowStockOnly) {
        return Result.success(drugStockService.list(lowStockOnly));
    }
}
