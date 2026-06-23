package com.example.huiliao.mapper;

import com.example.huiliao.entity.DispenseRecord;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface DispenseRecordMapper {

    DispenseRecord selectByPrescriptionId(@Param("prescriptionId") Long prescriptionId);

    int insert(DispenseRecord record);
}
