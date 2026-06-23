package com.example.huiliao.controller;

import com.example.huiliao.common.Result;
import com.example.huiliao.entity.Staff;
import com.example.huiliao.service.StaffService;
import com.example.huiliao.vo.StaffVO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 医护人员接口
 */
@RestController
@RequestMapping("/api/staff")
@RequiredArgsConstructor
public class StaffController {

    private final StaffService staffService;

    /** GET /api/staff — 按科室与状态查询医护人员列表 */
    @GetMapping
    public Result<List<StaffVO>> list(@RequestParam(required = false) Long deptId,
                                      @RequestParam(required = false) Integer status) {
        return Result.success(staffService.list(deptId, status));
    }

    /** GET /api/staff/{id} — 查询医护人员详情 */
    @GetMapping("/{id}")
    public Result<Staff> get(@PathVariable Long id) {
        return Result.success(staffService.getById(id));
    }

    /** POST /api/staff — 新建医护人员 */
    @PostMapping
    public Result<Long> create(@RequestBody Staff staff) {
        return Result.success(staffService.create(staff));
    }

    /** PUT /api/staff/{id} — 更新医护人员信息 */
    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @RequestBody Staff staff) {
        staff.setId(id);
        staffService.update(staff);
        return Result.success();
    }
}
