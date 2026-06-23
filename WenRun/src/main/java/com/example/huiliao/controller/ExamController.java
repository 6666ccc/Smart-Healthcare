package com.example.huiliao.controller;

import com.example.huiliao.common.Result;
import com.example.huiliao.dto.ExamRequestCreateDTO;
import com.example.huiliao.entity.ExamRequest;
import com.example.huiliao.service.ExamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 检查申请接口 — 医生开具检查单
 */
@RestController
@RequestMapping("/api/exam-requests")
@RequiredArgsConstructor
public class ExamController {

    private final ExamService examService;

    /** GET /api/exam-requests — 查询某次就诊的检查申请列表 */
    @GetMapping
    public Result<List<ExamRequest>> list(@RequestParam Long visitId) {
        return Result.success(examService.listByVisit(visitId));
    }

    /** POST /api/exam-requests — 创建检查申请 */
    @PostMapping
    public Result<Long> create(@Valid @RequestBody ExamRequestCreateDTO dto) {
        return Result.success(examService.create(dto));
    }
}
