package com.example.wenrun.controller;

import com.example.wenrun.common.Result;
import com.example.wenrun.common.constant.BizStatus;
import com.example.wenrun.dto.ChargePayDTO;
import com.example.wenrun.service.ChargeService;
import com.example.wenrun.vo.ChargeOrderVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 收费接口 — 收费单查询、生成与收款
 */
@RestController
@RequestMapping("/api/charges")
@RequiredArgsConstructor
public class ChargeController {

    private final ChargeService chargeService;

    /** GET /api/charges — 按支付状态与患者查询收费单 */
    @GetMapping
    public Result<List<ChargeOrderVO>> list(@RequestParam(required = false) Integer payStatus,
                                            @RequestParam(required = false) Long patientId) {
        return Result.success(chargeService.list(payStatus, patientId));
    }

    /** GET /api/charges/pending — 查询待支付收费单 */
    @GetMapping("/pending")
    public Result<List<ChargeOrderVO>> pending() {
        return Result.success(chargeService.list(BizStatus.PAY_PENDING, null));
    }

    /** GET /api/charges/{id} — 查询收费单详情 */
    @GetMapping("/{id}")
    public Result<ChargeOrderVO> get(@PathVariable Long id) {
        return Result.success(chargeService.getById(id));
    }

    /** POST /api/charges/from-visit/{visitId} — 根据就诊记录生成收费单 */
    @PostMapping("/from-visit/{visitId}")
    public Result<Long> createFromVisit(@PathVariable Long visitId) {
        return Result.success(chargeService.createFromVisit(visitId));
    }

    /** POST /api/charges/{id}/pay — 确认收款 */
    @PostMapping("/{id}/pay")
    public Result<Void> pay(@PathVariable Long id, @Valid @RequestBody ChargePayDTO dto) {
        chargeService.pay(id, dto);
        return Result.success();
    }
}
