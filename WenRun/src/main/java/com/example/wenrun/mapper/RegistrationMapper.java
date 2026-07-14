package com.example.wenrun.mapper;

import com.example.wenrun.entity.Registration;
import com.example.wenrun.vo.RegistrationVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface RegistrationMapper {

    List<RegistrationVO> selectList(@Param("patientId") Long patientId,
                                  @Param("userId") Long userId,
                                  @Param("registrantUserId") Long registrantUserId,
                                  @Param("staffId") Long staffId,
                                  @Param("status") Integer status);

    Registration selectById(@Param("id") Long id);

    int insert(Registration registration);

    int updateStatus(@Param("id") Long id, @Param("status") Integer status);
}
