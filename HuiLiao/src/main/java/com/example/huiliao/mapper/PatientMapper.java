package com.example.huiliao.mapper;

import com.example.huiliao.dto.PatientQueryDTO;
import com.example.huiliao.entity.Patient;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface PatientMapper {

    List<Patient> selectByCondition(PatientQueryDTO query);

    Patient selectById(@Param("id") Long id);

    Patient selectByUserId(@Param("userId") Long userId);

    int insert(Patient patient);

    int updateById(Patient patient);
}
