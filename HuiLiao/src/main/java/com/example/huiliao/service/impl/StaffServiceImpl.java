package com.example.huiliao.service.impl;

import com.example.huiliao.common.constant.BizStatus;
import com.example.huiliao.common.exception.BusinessException;
import com.example.huiliao.entity.Staff;
import com.example.huiliao.mapper.DeptMapper;
import com.example.huiliao.mapper.StaffMapper;
import com.example.huiliao.service.StaffService;
import com.example.huiliao.vo.StaffVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StaffServiceImpl implements StaffService {

    private final StaffMapper staffMapper;
    private final DeptMapper deptMapper;

    @Override
    public List<StaffVO> list(Long deptId, Integer status) {
        return staffMapper.selectList(deptId, status);
    }

    @Override
    public Staff getById(Long id) {
        Staff staff = staffMapper.selectById(id);
        if (staff == null) {
            throw new BusinessException("医护人员不存在");
        }
        return staff;
    }

    @Override
    public Long create(Staff staff) {
        if (deptMapper.selectById(staff.getDeptId()) == null) {
            throw new BusinessException("科室不存在");
        }
        if (staff.getStatus() == null) {
            staff.setStatus(BizStatus.ENABLED);
        }
        staffMapper.insert(staff);
        return staff.getId();
    }

    @Override
    public void update(Staff staff) {
        getById(staff.getId());
        staffMapper.updateById(staff);
    }
}
