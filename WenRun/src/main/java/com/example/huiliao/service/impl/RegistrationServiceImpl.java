package com.example.huiliao.service.impl;

import com.example.huiliao.common.constant.AccountType;
import com.example.huiliao.common.constant.BizStatus;
import com.example.huiliao.common.context.UserContext;
import com.example.huiliao.common.exception.BusinessException;
import com.example.huiliao.common.util.BizNoUtil;
import com.example.huiliao.dto.RegistrationCreateDTO;
import com.example.huiliao.entity.Patient;
import com.example.huiliao.entity.Registration;
import com.example.huiliao.entity.Schedule;
import com.example.huiliao.entity.SysUser;
import com.example.huiliao.mapper.PatientMapper;
import com.example.huiliao.mapper.RegistrationMapper;
import com.example.huiliao.mapper.ScheduleMapper;
import com.example.huiliao.mapper.SysUserMapper;
import com.example.huiliao.service.RegistrationService;
import com.example.huiliao.vo.RegistrationVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/**
 * 挂号服务实现 — 窗口人工挂号逻辑：校验号源、防重复、时段截止与退号
 */
@Service
@RequiredArgsConstructor
public class RegistrationServiceImpl implements RegistrationService {

    private final RegistrationMapper registrationMapper;
    private final ScheduleMapper scheduleMapper;
    private final PatientMapper patientMapper;
    private final SysUserMapper sysUserMapper;

    /**
     * 查询挂号列表；对已挂号且就诊时段已过的记录自动标记为已退号
     */
    @Override
    public List<RegistrationVO> list(Long patientId, Long userId, Long registrantUserId, Long staffId, Integer status) {
        List<RegistrationVO> registrationVOList = registrationMapper.selectList(
                patientId, userId, registrantUserId, staffId, status);

        LocalDate today = LocalDate.now();
        LocalTime nowTime = LocalTime.now();
        for (RegistrationVO registrationVO : registrationVOList) {
            if (registrationVO.getStatus() == null || registrationVO.getStatus() != BizStatus.REG_REGISTERED) {
                continue;
            }
            if (isExpired(registrationVO.getWorkDate(), registrationVO.getTimePeriod(), today, nowTime)) {
                registrationVO.setStatus(BizStatus.REG_CANCELLED);
                registrationMapper.updateStatus(registrationVO.getId(), BizStatus.REG_CANCELLED);
            }
        }
        return registrationVOList;
    }

    /**
     * 窗口/自助挂号：校验患者与排班 → 防重复 → 扣减号源 → 生成挂号单
     */
    @Override
    @Transactional
    public Long register(RegistrationCreateDTO dto) {
        Patient patient = patientMapper.selectById(dto.getPatientId());
        if (patient == null) {
            throw new BusinessException("患者不存在");
        }
        assertPatientRegisterPermission(patient);

        Schedule schedule = scheduleMapper.selectByIdForUpdate(dto.getScheduleId());
        if (schedule == null) {
            throw new BusinessException("排班不存在");
        }
        assertScheduleBookable(schedule);

        if (schedule.getRemainingCount() == null || schedule.getRemainingCount() <= 0) {
            throw new BusinessException("号源已满");
        }

        int duplicate = registrationMapper.countActiveByPatientAndSchedule(
                dto.getPatientId(), dto.getScheduleId(), BizStatus.REG_REGISTERED);
        if (duplicate > 0) {
            throw new BusinessException("该患者已挂此号，请勿重复挂号");
        }

        int updated = scheduleMapper.decrementRemaining(schedule.getId());
        if (updated == 0) {
            throw new BusinessException("号源扣减失败，请重试");
        }

        Long operatorId = UserContext.getUserId();
        Registration reg = new Registration();
        reg.setRegNo(BizNoUtil.next("REG"));
        reg.setPatientId(dto.getPatientId());
        reg.setScheduleId(schedule.getId());
        reg.setDeptId(schedule.getDeptId());
        reg.setStaffId(schedule.getStaffId());
        reg.setRegTime(LocalDateTime.now());
        reg.setRegFee(schedule.getRegisterFee());
        reg.setStatus(BizStatus.REG_REGISTERED);
        reg.setCashierId(operatorId);
        reg.setRegistrantUserId(operatorId);
        registrationMapper.insert(reg);
        return reg.getId();
    }

    /** 退号：校验状态与时段后取消并归还号源 */
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

        Schedule schedule = scheduleMapper.selectById(reg.getScheduleId());
        if (schedule != null && isExpired(schedule.getWorkDate(), schedule.getTimePeriod(),
                LocalDate.now(), LocalTime.now())) {
            throw new BusinessException("挂号已过期，无法退号");
        }

        registrationMapper.updateStatus(id, BizStatus.REG_CANCELLED);
        scheduleMapper.incrementRemaining(reg.getScheduleId());
    }

    /** 患者端仅允许为自己挂号；窗口人员可为任意患者挂号 */
    private void assertPatientRegisterPermission(Patient patient) {
        Long userId = UserContext.getUserId();
        if (userId == null) {
            return;
        }
        SysUser user = sysUserMapper.selectById(userId);
        if (user == null) {
            return;
        }
        String accountType = user.getAccountType();
        if (!StringUtils.hasText(accountType)) {
            accountType = AccountType.INTERNAL;
        }
        if (AccountType.PATIENT.equals(accountType)) {
            if (patient.getUserId() == null || !patient.getUserId().equals(userId)) {
                throw new BusinessException("只能为自己挂号，代挂请前往挂号窗口");
            }
        }
    }

    /** 排班日期与时段必须仍可挂号 */
    private void assertScheduleBookable(Schedule schedule) {
        if (schedule.getWorkDate() == null) {
            throw new BusinessException("排班日期无效");
        }
        LocalDate today = LocalDate.now();
        if (schedule.getWorkDate().isBefore(today)) {
            throw new BusinessException("该排班日期已过，无法挂号");
        }
        if (isExpired(schedule.getWorkDate(), schedule.getTimePeriod(), today, LocalTime.now())) {
            throw new BusinessException("当前时段已截止挂号");
        }
    }

    /**
     * 判断挂号是否已过期
     *
     * @param workDate   就诊日期
     * @param timePeriod 就诊时段（上午/下午/晚上）
     * @param today      当前日期
     * @param nowTime    当前时间
     * @return true=已过期
     */
    private boolean isExpired(LocalDate workDate, String timePeriod, LocalDate today, LocalTime nowTime) {
        if (workDate == null) {
            return false;
        }
        if (workDate.isBefore(today)) {
            return true;
        }
        if (workDate.isAfter(today)) {
            return false;
        }
        if (timePeriod == null) {
            return false;
        }
        return switch (timePeriod) {
            case "上午", "morning" -> nowTime.isAfter(LocalTime.of(12, 0));
            case "下午", "afternoon" -> nowTime.isAfter(LocalTime.of(18, 0));
            case "晚上", "evening" -> nowTime.isAfter(LocalTime.of(21, 0));
            default -> false;
        };
    }
}
