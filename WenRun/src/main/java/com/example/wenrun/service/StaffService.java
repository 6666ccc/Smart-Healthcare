package com.example.wenrun.service;

import com.example.wenrun.entity.Staff;
import com.example.wenrun.vo.StaffVO;

import java.util.List;

public interface StaffService {
    List<StaffVO> list(Long deptId, Integer status);
    Staff getById(Long id);
    Long create(Staff staff);
    void update(Staff staff);
}
