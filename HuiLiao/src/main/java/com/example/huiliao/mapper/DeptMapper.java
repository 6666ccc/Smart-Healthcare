package com.example.huiliao.mapper;

import com.example.huiliao.entity.Dept;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface DeptMapper {

    List<Dept> selectAll(@Param("status") Integer status);

    Dept selectById(@Param("id") Long id);

    int insert(Dept dept);

    int updateById(Dept dept);
}
