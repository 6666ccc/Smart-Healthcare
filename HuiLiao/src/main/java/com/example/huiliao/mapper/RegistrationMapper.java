package com.example.huiliao.mapper;

import com.example.huiliao.entity.Registration;
import com.example.huiliao.vo.RegistrationVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface RegistrationMapper {

    List<RegistrationVO> selectList(@Param("patientId") Long patientId,
                                  @Param("status") Integer status);

    Registration selectById(@Param("id") Long id);

    int insert(Registration registration);

    int updateStatus(@Param("id") Long id, @Param("status") Integer status);
}
