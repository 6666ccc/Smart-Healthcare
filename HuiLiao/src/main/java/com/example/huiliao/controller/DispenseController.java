package com.example.huiliao.controller;

import com.example.huiliao.common.Result;
import com.example.huiliao.service.DispenseService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dispense")
@RequiredArgsConstructor
public class DispenseController {

    private final DispenseService dispenseService;

    @PostMapping("/{prescriptionId}")
    public Result<Void> dispense(@PathVariable Long prescriptionId) {
        dispenseService.dispense(prescriptionId);
        return Result.success();
    }
}
