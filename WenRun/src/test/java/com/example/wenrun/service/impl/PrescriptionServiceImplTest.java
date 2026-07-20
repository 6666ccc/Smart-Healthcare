package com.example.wenrun.service.impl;

import com.example.wenrun.common.constant.BizStatus;
import com.example.wenrun.common.exception.BusinessException;
import com.example.wenrun.entity.OutpatientVisit;
import com.example.wenrun.entity.Prescription;
import com.example.wenrun.mapper.DrugMapper;
import com.example.wenrun.mapper.OutpatientVisitMapper;
import com.example.wenrun.mapper.PatientMapper;
import com.example.wenrun.mapper.PrescriptionItemMapper;
import com.example.wenrun.mapper.PrescriptionMapper;
import com.example.wenrun.service.support.CurrentStaffSupport;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PrescriptionServiceImplTest {

    private final PrescriptionMapper prescriptionMapper = mock(PrescriptionMapper.class);
    private final OutpatientVisitMapper visitMapper = mock(OutpatientVisitMapper.class);
    private final CurrentStaffSupport currentStaffSupport = mock(CurrentStaffSupport.class);
    private final PrescriptionServiceImpl service = new PrescriptionServiceImpl(prescriptionMapper,
            mock(PrescriptionItemMapper.class), visitMapper, mock(DrugMapper.class), mock(PatientMapper.class), currentStaffSupport);

    @Test
    void staffCannotCancelPrescriptionForAnotherDoctorsVisit() {
        Prescription prescription = new Prescription();
        prescription.setId(7L);
        prescription.setVisitId(3L);
        prescription.setStatus(BizStatus.RX_PENDING_PAY);
        OutpatientVisit visit = new OutpatientVisit();
        visit.setId(3L);
        visit.setStaffId(22L);
        BusinessException denied = new BusinessException("Access denied");

        when(prescriptionMapper.selectById(7L)).thenReturn(prescription);
        when(visitMapper.selectById(3L)).thenReturn(visit);
        doThrow(denied).when(currentStaffSupport).assertOwnsStaff(22L);

        assertThrows(BusinessException.class, () -> service.cancel(7L));

        verify(prescriptionMapper, never()).updateStatus(7L, BizStatus.RX_CANCELLED);
    }
}
