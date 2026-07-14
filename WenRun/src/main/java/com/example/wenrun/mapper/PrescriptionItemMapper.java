package com.example.wenrun.mapper;

import com.example.wenrun.entity.PrescriptionItem;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface PrescriptionItemMapper {

    List<PrescriptionItem> selectByPrescriptionId(@Param("prescriptionId") Long prescriptionId);

    int insertBatch(@Param("items") List<PrescriptionItem> items);
}
