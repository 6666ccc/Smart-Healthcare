package com.example.huiliao.controller;

import com.example.huiliao.common.Result;
import com.example.huiliao.common.constant.BizStatus;
import com.example.huiliao.dto.ChargePayDTO;
import com.example.huiliao.service.ChargeService;
import com.example.huiliao.vo.ChargeOrderVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/charges")
@RequiredArgsConstructor
public class ChargeController {

    private final ChargeService chargeService;

    @GetMapping
    public Result<List<ChargeOrderVO>> list(@RequestParam(required = false) Integer payStatus,
                                            @RequestParam(required = false) Long patientId) {
        return Result.success(chargeService.list(payStatus, patientId));
    }

    @GetMapping("/pending")
    public Result<List<ChargeOrderVO>> pending() {
        return Result.success(chargeService.list(BizStatus.PAY_PENDING, null));
    }

    @GetMapping("/{id}")
    public Result<ChargeOrderVO> get(@PathVariable Long id) {
        return Result.success(chargeService.getById(id));
    }

    @PostMapping("/from-visit/{visitId}")
    public Result<Long> createFromVisit(@PathVariable Long visitId) {
        return Result.success(chargeService.createFromVisit(visitId));
    }

    @PostMapping("/{id}/pay")
    public Result<Void> pay(@PathVariable Long id, @Valid @RequestBody ChargePayDTO dto) {
        chargeService.pay(id, dto);
        return Result.success();
    }
}
