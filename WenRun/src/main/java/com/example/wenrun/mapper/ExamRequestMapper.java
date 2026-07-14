package com.example.wenrun.mapper;

import com.example.wenrun.entity.ExamRequest;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ExamRequestMapper {

    List<ExamRequest> selectPendingByVisitId(@Param("visitId") Long visitId, @Param("status") Integer status);

    List<ExamRequest> selectByVisitId(@Param("visitId") Long visitId);

    ExamRequest selectById(@Param("id") Long id);

    int insert(ExamRequest request);

    int updateStatus(@Param("id") Long id, @Param("status") Integer status);

    int updateStatusByVisitId(@Param("visitId") Long visitId,
                              @Param("fromStatus") Integer fromStatus,
                              @Param("toStatus") Integer toStatus);
}
