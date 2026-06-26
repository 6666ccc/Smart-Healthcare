package com.example.wenrun.mapper;

import com.example.wenrun.entity.DispenseRecord;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface DispenseRecordMapper {

    DispenseRecord selectByPrescriptionId(@Param("prescriptionId") Long prescriptionId);

    int insert(DispenseRecord record);
}
