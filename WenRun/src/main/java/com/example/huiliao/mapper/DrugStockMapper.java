package com.example.huiliao.mapper;

import com.example.huiliao.entity.DrugStock;
import com.example.huiliao.vo.DrugStockVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.math.BigDecimal;
import java.util.List;

@Mapper
public interface DrugStockMapper {

    List<DrugStockVO> selectList(@Param("lowStockOnly") Boolean lowStockOnly);

    DrugStock selectByDrugId(@Param("drugId") Long drugId);

    DrugStock selectByDrugIdForUpdate(@Param("drugId") Long drugId);

    int insert(DrugStock stock);

    int deductQuantity(@Param("drugId") Long drugId, @Param("qty") BigDecimal qty);

    long countLowStock();
}
