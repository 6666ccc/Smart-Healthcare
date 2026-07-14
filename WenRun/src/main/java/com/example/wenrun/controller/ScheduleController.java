package com.example.wenrun.controller;

import com.example.wenrun.common.Result;
import com.example.wenrun.entity.Schedule;
import com.example.wenrun.service.ScheduleService;
import com.example.wenrun.vo.ScheduleVO;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/schedules")
@RequiredArgsConstructor
public class ScheduleController {

    private final ScheduleService scheduleService;

    @GetMapping
    public Result<List<ScheduleVO>> list(@RequestParam(required = false) Long deptId,
                                         @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate workDate,
                                         @RequestParam(required = false) Long staffId) {
        return Result.success(scheduleService.list(deptId, workDate, staffId));
    }

    @GetMapping("/{id}")
    public Result<Schedule> get(@PathVariable Long id) {
        return Result.success(scheduleService.getById(id));
    }

    @PostMapping
    public Result<Long> create(@RequestBody Schedule schedule) {
        return Result.success(scheduleService.create(schedule));
    }

    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @RequestBody Schedule schedule) {
        schedule.setId(id);
        scheduleService.update(schedule);
        return Result.success();
    }
}
