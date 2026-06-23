package com.example.huiliao.mapper;

import com.example.huiliao.entity.OutpatientVisit;
import com.example.huiliao.vo.VisitVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface OutpatientVisitMapper {

    List<VisitVO> selectList(@Param("status") Integer status, @Param("staffId") Long staffId);

    OutpatientVisit selectById(@Param("id") Long id);

    VisitVO selectVoById(@Param("id") Long id);

    OutpatientVisit selectByRegistrationId(@Param("registrationId") Long registrationId);

    int insert(OutpatientVisit visit);

    int updateById(OutpatientVisit visit);
}
