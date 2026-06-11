package com.example.huiliao.controller;

import com.example.huiliao.common.Result;
import com.example.huiliao.dto.ExamRequestCreateDTO;
import com.example.huiliao.entity.ExamRequest;
import com.example.huiliao.service.ExamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/exam-requests")
@RequiredArgsConstructor
public class ExamController {

    private final ExamService examService;

    @GetMapping
    public Result<List<ExamRequest>> list(@RequestParam Long visitId) {
        return Result.success(examService.listByVisit(visitId));
    }

    @PostMapping
    public Result<Long> create(@Valid @RequestBody ExamRequestCreateDTO dto) {
        return Result.success(examService.create(dto));
    }
}
