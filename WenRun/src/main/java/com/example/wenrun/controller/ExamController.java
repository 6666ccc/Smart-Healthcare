package com.example.wenrun.controller;

import com.example.wenrun.common.Result;
import com.example.wenrun.dto.ExamRequestCreateDTO;
import com.example.wenrun.entity.ExamRequest;
import com.example.wenrun.service.ExamService;
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
