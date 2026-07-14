package com.example.wenrun.controller;

import com.example.wenrun.common.Result;
import com.example.wenrun.common.constant.BizStatus;
import com.example.wenrun.dto.RegistrationCreateDTO;
import com.example.wenrun.service.RegistrationService;
import com.example.wenrun.service.support.CurrentStaffSupport;
import com.example.wenrun.vo.RegistrationVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/registrations")
@RequiredArgsConstructor
public class RegistrationController {

    private final RegistrationService registrationService;
    private final CurrentStaffSupport currentStaffSupport;

    // 查询挂号列表
    @GetMapping
    public Result<List<RegistrationVO>> list(@RequestParam(required = false) Long patientId,
                                             @RequestParam(required = false) Long userId,
                                             @RequestParam(required = false) Long registrantUserId,
                                             @RequestParam(required = false) Long staffId,
                                             @RequestParam(required = false) Integer status) {
        Long effectiveStaffId = currentStaffSupport.resolveStaffId(staffId);
        return Result.success(registrationService.list(
                patientId, userId, registrantUserId, effectiveStaffId, status));
    }

    // 查询待就诊挂号（医生端：自动按当前登录医生过滤）
    @GetMapping("/pending")
    public Result<List<RegistrationVO>> pending(@RequestParam(required = false) Long staffId) {
        Long effectiveStaffId = currentStaffSupport.resolveStaffId(staffId);
        return Result.success(registrationService.list(
                null, null, null, effectiveStaffId, BizStatus.REG_REGISTERED));
    }

    // 挂号
    @PostMapping
    public Result<Long> register(@Valid @RequestBody RegistrationCreateDTO dto) {
        return Result.success(registrationService.register(dto));
    }

    // 取消挂号
    @PostMapping("/{id}/cancel")
    public Result<Void> cancel(@PathVariable Long id) {
        registrationService.cancel(id);
        return Result.success();
    }
}
