package com.example.wenrun.service;

import com.example.wenrun.entity.Schedule;
import com.example.wenrun.vo.ScheduleVO;

import java.time.LocalDate;
import java.util.List;

public interface ScheduleService {
    List<ScheduleVO> list(Long deptId, LocalDate workDate, Long staffId);
    Schedule getById(Long id);
    Long create(Schedule schedule);
    void update(Schedule schedule);
}
