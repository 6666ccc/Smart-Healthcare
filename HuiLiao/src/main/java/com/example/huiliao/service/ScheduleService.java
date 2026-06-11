package com.example.huiliao.service;

import com.example.huiliao.entity.Schedule;
import com.example.huiliao.vo.ScheduleVO;

import java.time.LocalDate;
import java.util.List;

public interface ScheduleService {
    List<ScheduleVO> list(Long deptId, LocalDate workDate, Long staffId);
    Schedule getById(Long id);
    Long create(Schedule schedule);
    void update(Schedule schedule);
}
