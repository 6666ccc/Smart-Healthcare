package com.example.wenrun.mapper;

import com.example.wenrun.entity.ChargeDetail;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ChargeDetailMapper {

    List<ChargeDetail> selectByOrderId(@Param("orderId") Long orderId);

    int insertBatch(@Param("details") List<ChargeDetail> details);

    int countByBiz(@Param("bizType") Integer bizType, @Param("bizId") Long bizId);
}
