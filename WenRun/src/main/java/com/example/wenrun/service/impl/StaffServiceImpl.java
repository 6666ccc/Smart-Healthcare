package com.example.wenrun.service.impl;

import com.example.wenrun.common.constant.BizStatus;
import com.example.wenrun.common.exception.BusinessException;
import com.example.wenrun.entity.Staff;
import com.example.wenrun.mapper.DeptMapper;
import com.example.wenrun.mapper.StaffMapper;
import com.example.wenrun.service.StaffService;
import com.example.wenrun.vo.StaffVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 医护人员服务实现
 */
@Service
@RequiredArgsConstructor
public class StaffServiceImpl implements StaffService {

    private final StaffMapper staffMapper;
    private final DeptMapper deptMapper;

    /** 按科室与状态查询医护人员列表 */
    @Override
    public List<StaffVO> list(Long deptId, Integer status) {
        return staffMapper.selectList(deptId, status);
    }

    /** 根据 ID 查询医护人员 */
    @Override
    public Staff getById(Long id) {
        Staff staff = staffMapper.selectById(id);
        if (staff == null) {
            throw new BusinessException("医护人员不存在");
        }
        return staff;
    }

    /** 新建医护人员，校验所属科室存在 */
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

    /** 更新医护人员信息 */
    @Override
    public void update(Staff staff) {
        getById(staff.getId());
        staffMapper.updateById(staff);
    }
}
