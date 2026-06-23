package com.example.huiliao.controller;

import com.example.huiliao.common.Result;
import com.example.huiliao.entity.Drug;
import com.example.huiliao.service.DrugService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 药品接口
 */
@RestController
@RequestMapping("/api/drugs")
@RequiredArgsConstructor
public class DrugController {

    private final DrugService drugService;

    /** GET /api/drugs — 按关键词与状态查询药品列表 */
    @GetMapping
    public Result<List<Drug>> list(@RequestParam(required = false) String keyword,
                                   @RequestParam(required = false) Integer status) {
        return Result.success(drugService.list(keyword, status));
    }

    /** GET /api/drugs/{id} — 查询药品详情 */
    @GetMapping("/{id}")
    public Result<Drug> get(@PathVariable Long id) {
        return Result.success(drugService.getById(id));
    }

    /** POST /api/drugs — 新建药品（含初始库存） */
    @PostMapping
    public Result<Long> create(@RequestBody Drug drug) {
        return Result.success(drugService.create(drug));
    }

    /** PUT /api/drugs/{id} — 更新药品信息 */
    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @RequestBody Drug drug) {
        drug.setId(id);
        drugService.update(drug);
        return Result.success();
    }
}
