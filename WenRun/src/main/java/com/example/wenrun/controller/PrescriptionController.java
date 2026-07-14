package com.example.wenrun.controller;

import com.example.wenrun.common.Result;
import com.example.wenrun.dto.PrescriptionCreateDTO;
import com.example.wenrun.service.PrescriptionService;
import com.example.wenrun.vo.PrescriptionVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/prescriptions")
@RequiredArgsConstructor
public class PrescriptionController {

    private final PrescriptionService prescriptionService;

    @GetMapping
    public Result<List<PrescriptionVO>> listByVisit(@RequestParam Long visitId) {
        return Result.success(prescriptionService.listByVisit(visitId));
    }

    @GetMapping("/pending-dispense")
    public Result<List<PrescriptionVO>> pendingDispense() {
        return Result.success(prescriptionService.listPendingDispense());
    }

    @GetMapping("/{id}")
    public Result<PrescriptionVO> get(@PathVariable Long id) {
        return Result.success(prescriptionService.getById(id));
    }

    @PostMapping
    public Result<Long> create(@Valid @RequestBody PrescriptionCreateDTO dto) {
        return Result.success(prescriptionService.create(dto));
    }

    @PostMapping("/{id}/cancel")
    public Result<Void> cancel(@PathVariable Long id) {
        prescriptionService.cancel(id);
        return Result.success();
    }
}
