package com.example.huiliao.service.impl;

import com.example.huiliao.common.constant.BizStatus;
import com.example.huiliao.common.context.UserContext;
import com.example.huiliao.common.exception.BusinessException;
import com.example.huiliao.common.util.BizNoUtil;
import com.example.huiliao.dto.RegistrationCreateDTO;
import com.example.huiliao.entity.Patient;
import com.example.huiliao.entity.Registration;
import com.example.huiliao.entity.Schedule;
import com.example.huiliao.mapper.PatientMapper;
import com.example.huiliao.mapper.RegistrationMapper;
import com.example.huiliao.mapper.ScheduleMapper;
import com.example.huiliao.service.RegistrationService;
import com.example.huiliao.vo.RegistrationVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RegistrationServiceImpl implements RegistrationService {

    private final RegistrationMapper registrationMapper;
    private final ScheduleMapper scheduleMapper;
    private final PatientMapper patientMapper;

    @Override
    public List<RegistrationVO> list(Long patientId, Integer status) {
        return registrationMapper.selectList(patientId, status);
    }

    @Override
    @Transactional
    public Long register(RegistrationCreateDTO dto) {
        Patient patient = patientMapper.selectById(dto.getPatientId());
        if (patient == null) {
            throw new BusinessException("患者不存在");
        }
        Schedule schedule = scheduleMapper.selectByIdForUpdate(dto.getScheduleId());
        if (schedule == null) {
            throw new BusinessException("排班不存在");
        }
        if (schedule.getRemainingCount() == null || schedule.getRemainingCount() <= 0) {
            throw new BusinessException("号源已满");
        }
        int updated = scheduleMapper.decrementRemaining(schedule.getId());
        if (updated == 0) {
            throw new BusinessException("号源扣减失败，请重试");
        }
        Registration reg = new Registration();
        reg.setRegNo(BizNoUtil.next("REG"));
        reg.setPatientId(dto.getPatientId());
        reg.setScheduleId(schedule.getId());
        reg.setDeptId(schedule.getDeptId());
        reg.setStaffId(schedule.getStaffId());
        reg.setRegTime(LocalDateTime.now());
        reg.setRegFee(schedule.getRegisterFee());
        reg.setStatus(BizStatus.REG_REGISTERED);
        reg.setCashierId(UserContext.getUserId());
        registrationMapper.insert(reg);
        return reg.getId();
    }

    @Override
    @Transactional
    public void cancel(Long id) {
        Registration reg = registrationMapper.selectById(id);
        if (reg == null) {
            throw new BusinessException("挂号单不存在");
        }
        if (reg.getStatus() == BizStatus.REG_CANCELLED) {
            throw new BusinessException("挂号单已退号");
        }
        if (reg.getStatus() == BizStatus.REG_VISITED) {
            throw new BusinessException("已就诊不能退号");
        }
        registrationMapper.updateStatus(id, BizStatus.REG_CANCELLED);
        scheduleMapper.incrementRemaining(reg.getScheduleId());
    }
}
