package com.example.huiliao.mapper;

import com.example.huiliao.entity.ChargeDetail;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ChargeDetailMapper {

    List<ChargeDetail> selectByOrderId(@Param("orderId") Long orderId);

    int insertBatch(@Param("details") List<ChargeDetail> details);

    int countByBiz(@Param("bizType") Integer bizType, @Param("bizId") Long bizId);
}
