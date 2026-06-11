package com.example.huiliao.service;

import com.example.huiliao.dto.RegistrationCreateDTO;
import com.example.huiliao.vo.RegistrationVO;

import java.util.List;

public interface RegistrationService {
    List<RegistrationVO> list(Long patientId, Integer status);
    Long register(RegistrationCreateDTO dto);
    void cancel(Long id);
}
