package com.example.huiliao.service;

import com.example.huiliao.dto.ChargePayDTO;
import com.example.huiliao.vo.ChargeOrderVO;

import java.util.List;

public interface ChargeService {
    List<ChargeOrderVO> list(Integer payStatus, Long patientId);
    ChargeOrderVO getById(Long id);
    Long createFromVisit(Long visitId);
    void pay(Long orderId, ChargePayDTO dto);
}
