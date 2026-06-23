package com.example.huiliao.mapper;

import com.example.huiliao.entity.Prescription;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface PrescriptionMapper {

    List<Prescription> selectByVisitId(@Param("visitId") Long visitId);

    List<Prescription> selectPendingByVisitId(@Param("visitId") Long visitId, @Param("status") Integer status);

    List<Prescription> selectByStatus(@Param("status") Integer status);

    Prescription selectById(@Param("id") Long id);

    int insert(Prescription prescription);

    int updateStatus(@Param("id") Long id, @Param("status") Integer status);

    int updateStatusByVisitId(@Param("visitId") Long visitId,
                              @Param("fromStatus") Integer fromStatus,
                              @Param("toStatus") Integer toStatus);
}
