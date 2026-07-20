package com.example.wenrun.controller;

import com.example.wenrun.common.Result;
import com.example.wenrun.service.DispenseService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 发药接口 — 药房对已缴费处方发药
 */
@RestController
@RequestMapping("/api/dispense")
@RequiredArgsConstructor
public class DispenseController {

    private final DispenseService dispenseService;

    /** POST /api/dispense/{prescriptionId} — 对指定处方执行发药 */
    @PostMapping("/{prescriptionId}")
    public Result<Void> dispense(@PathVariable Long prescriptionId) {
        dispenseService.dispense(prescriptionId);
        return Result.success();
    }
}
