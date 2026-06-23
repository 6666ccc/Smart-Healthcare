package com.example.huiliao.controller;

import com.example.huiliao.common.Result;
import com.example.huiliao.entity.Dept;
import com.example.huiliao.service.DeptService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 科室接口
 */
@RestController
@RequestMapping("/api/depts")
@RequiredArgsConstructor
public class DeptController {

    private final DeptService deptService;

    /** GET /api/depts — 查询科室列表 */
    @GetMapping
    public Result<List<Dept>> list(@RequestParam(required = false) Integer status) {
        return Result.success(deptService.list(status));
    }

    /** GET /api/depts/{id} — 查询科室详情 */
    @GetMapping("/{id}")
    public Result<Dept> get(@PathVariable Long id) {
        return Result.success(deptService.getById(id));
    }

    /** POST /api/depts — 新建科室 */
    @PostMapping
    public Result<Long> create(@RequestBody Dept dept) {
        return Result.success(deptService.create(dept));
    }

    /** PUT /api/depts/{id} — 更新科室 */
    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @RequestBody Dept dept) {
        dept.setId(id);
        deptService.update(dept);
        return Result.success();
    }
}
