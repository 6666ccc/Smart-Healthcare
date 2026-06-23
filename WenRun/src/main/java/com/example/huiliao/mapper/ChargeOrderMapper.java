package com.example.huiliao.mapper;

import com.example.huiliao.entity.ChargeOrder;
import com.example.huiliao.vo.ChargeOrderVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ChargeOrderMapper {

    List<ChargeOrderVO> selectList(@Param("payStatus") Integer payStatus, @Param("patientId") Long patientId);

    ChargeOrder selectById(@Param("id") Long id);

    int insert(ChargeOrder order);

    int updatePay(ChargeOrder order);
}
