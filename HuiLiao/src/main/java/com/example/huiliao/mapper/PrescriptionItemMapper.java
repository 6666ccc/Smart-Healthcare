package com.example.huiliao.mapper;

import com.example.huiliao.entity.PrescriptionItem;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface PrescriptionItemMapper {

    List<PrescriptionItem> selectByPrescriptionId(@Param("prescriptionId") Long prescriptionId);

    int insertBatch(@Param("items") List<PrescriptionItem> items);
}
