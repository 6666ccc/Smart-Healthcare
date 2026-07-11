package com.example.wenrun.service.impl;

import com.example.wenrun.common.constant.AccountType;
import com.example.wenrun.common.context.UserContext;
import com.example.wenrun.common.exception.BusinessException;
import com.example.wenrun.entity.Patient;
import com.example.wenrun.mapper.PatientMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PatientServiceImplTest {

    private final PatientMapper patientMapper = mock(PatientMapper.class);
    private final PatientServiceImpl service = new PatientServiceImpl(patientMapper);

    @AfterEach
    void clearContext() {
        UserContext.clear();
    }

    @Test
    void patientCannotReadAnotherPatientsProfile() {
        Patient patient = new Patient();
        patient.setId(2L);
        patient.setUserId(22L);
        when(patientMapper.selectById(2L)).thenReturn(patient);
        UserContext.setUserId(11L);
        UserContext.setAccountType(AccountType.PATIENT);

        assertThrows(BusinessException.class, () -> service.getById(2L));
    }
}
