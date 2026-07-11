package com.example.wenrun.mapper;

import com.example.wenrun.entity.ChargeOrder;
import com.example.wenrun.vo.ChargeOrderVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ChargeOrderMapper {

    List<ChargeOrderVO> selectList(@Param("payStatus") Integer payStatus, @Param("patientId") Long patientId);

    ChargeOrder selectById(@Param("id") Long id);

    ChargeOrderVO selectVoById(@Param("id") Long id);

    int insert(ChargeOrder order);

    int updatePay(ChargeOrder order);
}
