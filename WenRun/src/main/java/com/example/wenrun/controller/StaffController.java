package com.example.wenrun.controller;

import com.example.wenrun.common.Result;
import com.example.wenrun.entity.Staff;
import com.example.wenrun.service.StaffService;
import com.example.wenrun.vo.StaffVO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/staff")
@RequiredArgsConstructor
public class StaffController {

    private final StaffService staffService;

    @GetMapping
    public Result<List<StaffVO>> list(@RequestParam(required = false) Long deptId,
                                      @RequestParam(required = false) Integer status) {
        return Result.success(staffService.list(deptId, status));
    }

    @GetMapping("/{id}")
    public Result<Staff> get(@PathVariable Long id) {
        return Result.success(staffService.getById(id));
    }

    @PostMapping
    public Result<Long> create(@RequestBody Staff staff) {
        return Result.success(staffService.create(staff));
    }

    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @RequestBody Staff staff) {
        staff.setId(id);
        staffService.update(staff);
        return Result.success();
    }
}
