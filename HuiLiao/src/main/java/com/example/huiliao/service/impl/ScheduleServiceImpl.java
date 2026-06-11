package com.example.huiliao.service.impl;

import com.example.huiliao.common.exception.BusinessException;
import com.example.huiliao.entity.Schedule;
import com.example.huiliao.mapper.ScheduleMapper;
import com.example.huiliao.service.ScheduleService;
import com.example.huiliao.vo.ScheduleVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ScheduleServiceImpl implements ScheduleService {

    private final ScheduleMapper scheduleMapper;

    @Override
    public List<ScheduleVO> list(Long deptId, LocalDate workDate, Long staffId) {
        return scheduleMapper.selectList(deptId, workDate, staffId);
    }

    @Override
    public Schedule getById(Long id) {
        Schedule schedule = scheduleMapper.selectById(id);
        if (schedule == null) {
            throw new BusinessException("排班不存在");
        }
        return schedule;
    }

    @Override
    public Long create(Schedule schedule) {
        if (schedule.getRemainingCount() == null) {
            schedule.setRemainingCount(schedule.getTotalCount());
        }
        scheduleMapper.insert(schedule);
        return schedule.getId();
    }

    @Override
    public void update(Schedule schedule) {
        getById(schedule.getId());
        scheduleMapper.updateById(schedule);
    }
}
