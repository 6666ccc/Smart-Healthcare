package com.example.wenrun.service.impl;

import com.example.wenrun.common.constant.BizStatus;
import com.example.wenrun.common.exception.BusinessException;
import com.example.wenrun.entity.Dept;
import com.example.wenrun.mapper.DeptMapper;
import com.example.wenrun.service.DeptService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 科室服务实现
 */
@Service
@RequiredArgsConstructor
public class DeptServiceImpl implements DeptService {

    private final DeptMapper deptMapper;

    /** 按状态查询科室列表 */
    @Override
    public List<Dept> list(Integer status) {
        return deptMapper.selectAll(status);
    }

    /** 根据 ID 查询科室 */
    @Override
    public Dept getById(Long id) {
        Dept dept = deptMapper.selectById(id);
        if (dept == null) {
            throw new BusinessException("科室不存在");
        }
        return dept;
    }

    /** 新建科室，默认启用且 parentId=0 表示顶级 */
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

    /** 更新科室信息 */
    @Override
    public void update(Dept dept) {
        getById(dept.getId());
        deptMapper.updateById(dept);
    }
}
