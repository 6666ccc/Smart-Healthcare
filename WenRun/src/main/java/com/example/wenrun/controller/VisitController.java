package com.example.wenrun.controller;

import com.example.wenrun.common.Result;
import com.example.wenrun.dto.VisitUpdateDTO;
import com.example.wenrun.service.VisitService;
import com.example.wenrun.service.support.CurrentStaffSupport;
import com.example.wenrun.vo.VisitVO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/visits")
@RequiredArgsConstructor
public class VisitController {

    private final VisitService visitService;
    private final CurrentStaffSupport currentStaffSupport;

    @GetMapping
    public Result<List<VisitVO>> list(@RequestParam(required = false) Integer status,
                                      @RequestParam(required = false) Long staffId) {
        Long effectiveStaffId = currentStaffSupport.resolveStaffId(staffId);
        return Result.success(visitService.list(status, effectiveStaffId));
    }

    @GetMapping("/{id}")
    public Result<VisitVO> get(@PathVariable Long id) {
        return Result.success(visitService.getById(id));
    }

    @PostMapping("/start/{registrationId}")
    public Result<Long> start(@PathVariable Long registrationId) {
        return Result.success(visitService.startVisit(registrationId));
    }

    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @RequestBody VisitUpdateDTO dto) {
        visitService.updateVisit(id, dto);
        return Result.success();
    }
}
