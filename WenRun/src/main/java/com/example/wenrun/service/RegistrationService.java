package com.example.wenrun.service;

import com.example.wenrun.dto.RegistrationCreateDTO;
import com.example.wenrun.vo.RegistrationVO;

import java.util.List;

public interface RegistrationService {
    List<RegistrationVO> list(Long patientId, Long userId, Long registrantUserId, Long staffId, Integer status);
    Long register(RegistrationCreateDTO dto);
    void cancel(Long id);
}
