package com.example.wenrun.service.impl;

import com.example.wenrun.common.constant.AccountType;
import com.example.wenrun.common.constant.BizStatus;
import com.example.wenrun.common.context.UserContext;
import com.example.wenrun.common.exception.BusinessException;
import com.example.wenrun.entity.OutpatientVisit;
import com.example.wenrun.entity.Patient;
import com.example.wenrun.entity.Registration;
import com.example.wenrun.mapper.ChargeDetailMapper;
import com.example.wenrun.mapper.ChargeOrderMapper;
import com.example.wenrun.mapper.ExamRequestMapper;
import com.example.wenrun.mapper.MedicalItemMapper;
import com.example.wenrun.mapper.OutpatientVisitMapper;
import com.example.wenrun.mapper.PatientMapper;
import com.example.wenrun.mapper.PrescriptionMapper;
import com.example.wenrun.mapper.RegistrationMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ChargeServiceImplTest {

    private final ChargeOrderMapper chargeOrderMapper = mock(ChargeOrderMapper.class);
    private final ChargeDetailMapper chargeDetailMapper = mock(ChargeDetailMapper.class);
    private final OutpatientVisitMapper visitMapper = mock(OutpatientVisitMapper.class);
    private final RegistrationMapper registrationMapper = mock(RegistrationMapper.class);
    private final PrescriptionMapper prescriptionMapper = mock(PrescriptionMapper.class);
    private final ExamRequestMapper examRequestMapper = mock(ExamRequestMapper.class);
    private final MedicalItemMapper medicalItemMapper = mock(MedicalItemMapper.class);
    private final PatientMapper patientMapper = mock(PatientMapper.class);
    private final ChargeServiceImpl service = new ChargeServiceImpl(chargeOrderMapper, chargeDetailMapper,
            visitMapper, registrationMapper, prescriptionMapper, examRequestMapper, medicalItemMapper, patientMapper);

    @AfterEach
    void clearContext() {
        UserContext.clear();
    }

    @Test
    void patientCannotCreateChargeOrderForAnotherPatientsVisit() {
        OutpatientVisit visit = new OutpatientVisit();
        visit.setId(3L);
        visit.setPatientId(2L);
        visit.setRegistrationId(4L);
        Registration registration = new Registration();
        registration.setId(4L);
        registration.setRegFee(BigDecimal.TEN);
        Patient currentPatient = new Patient();
        currentPatient.setId(1L);

        when(visitMapper.selectById(3L)).thenReturn(visit);
        when(patientMapper.selectByUserId(11L)).thenReturn(currentPatient);
        when(registrationMapper.selectById(4L)).thenReturn(registration);
        when(chargeDetailMapper.countByBiz(BizStatus.CHARGE_REG, 4L)).thenReturn(0);
        UserContext.setUserId(11L);
        UserContext.setAccountType(AccountType.PATIENT);

        assertThrows(BusinessException.class, () -> service.createFromVisit(3L));

        verify(chargeOrderMapper, never()).insert(org.mockito.ArgumentMatchers.any());
    }
}
