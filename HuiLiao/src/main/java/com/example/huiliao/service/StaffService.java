package com.example.huiliao.service;

import com.example.huiliao.entity.Staff;
import com.example.huiliao.vo.StaffVO;

import java.util.List;

public interface StaffService {
    List<StaffVO> list(Long deptId, Integer status);
    Staff getById(Long id);
    Long create(Staff staff);
    void update(Staff staff);
}
