package com.example.wenrun.service.impl;

import com.example.wenrun.common.constant.BizStatus;
import com.example.wenrun.common.exception.BusinessException;
import com.example.wenrun.entity.Dept;
import com.example.wenrun.mapper.DeptMapper;
import com.example.wenrun.service.DeptService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DeptServiceImpl implements DeptService {

    private final DeptMapper deptMapper;

    @Override
    public List<Dept> list(Integer status) {
        return deptMapper.selectAll(status);
    }

    @Override
    public Dept getById(Long id) {
        Dept dept = deptMapper.selectById(id);
        if (dept == null) {
            throw new BusinessException("科室不存在");
        }
        return dept;
    }

    @Override
    public Long create(Dept dept) {
        if (dept.getStatus() == null) {
            dept.setStatus(BizStatus.ENABLED);
        }
        if (dept.getParentId() == null) {
            dept.setParentId(0L);
        }
        deptMapper.insert(dept);
        return dept.getId();
    }

    @Override
    public void update(Dept dept) {
        getById(dept.getId());
        deptMapper.updateById(dept);
    }
}
