package com.example.huiliao.controller;

import com.example.huiliao.common.Result;
import com.example.huiliao.common.constant.BizStatus;
import com.example.huiliao.dto.RegistrationCreateDTO;
import com.example.huiliao.service.RegistrationService;
import com.example.huiliao.vo.RegistrationVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/registrations")
@RequiredArgsConstructor
public class RegistrationController {

    private final RegistrationService registrationService;

    @GetMapping
    public Result<List<RegistrationVO>> list(@RequestParam(required = false) Long patientId,
                                             @RequestParam(required = false) Integer status) {
        return Result.success(registrationService.list(patientId, status));
    }

    @GetMapping("/pending")
    public Result<List<RegistrationVO>> pending() {
        return Result.success(registrationService.list(null, BizStatus.REG_REGISTERED));
    }

    @PostMapping
    public Result<Long> register(@Valid @RequestBody RegistrationCreateDTO dto) {
        return Result.success(registrationService.register(dto));
    }

    @PostMapping("/{id}/cancel")
    public Result<Void> cancel(@PathVariable Long id) {
        registrationService.cancel(id);
        return Result.success();
    }
}
