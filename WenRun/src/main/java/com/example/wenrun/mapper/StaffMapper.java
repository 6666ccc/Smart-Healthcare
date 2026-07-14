package com.example.wenrun.mapper;

import com.example.wenrun.entity.Staff;
import com.example.wenrun.vo.StaffVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface StaffMapper {

    List<StaffVO> selectList(@Param("deptId") Long deptId, @Param("status") Integer status);

    Staff selectById(@Param("id") Long id);

    Staff selectByUserId(@Param("userId") Long userId);

    int insert(Staff staff);

    int updateById(Staff staff);
}
