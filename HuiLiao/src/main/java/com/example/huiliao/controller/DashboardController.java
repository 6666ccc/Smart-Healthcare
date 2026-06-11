package com.example.huiliao.controller;

import com.example.huiliao.common.Result;
import com.example.huiliao.service.DashboardService;
import com.example.huiliao.vo.DashboardVO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    public Result<DashboardVO> summary() {
        return Result.success(dashboardService.summary());
    }
}
