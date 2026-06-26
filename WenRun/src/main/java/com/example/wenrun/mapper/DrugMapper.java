package com.example.wenrun.mapper;

import com.example.wenrun.entity.Drug;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface DrugMapper {

    List<Drug> selectList(@Param("keyword") String keyword, @Param("status") Integer status);

    Drug selectById(@Param("id") Long id);

    int insert(Drug drug);

    int updateById(Drug drug);
}
