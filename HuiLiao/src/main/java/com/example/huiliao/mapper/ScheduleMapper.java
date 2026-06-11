package com.example.huiliao.mapper;

import com.example.huiliao.entity.Schedule;
import com.example.huiliao.vo.ScheduleVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDate;
import java.util.List;

@Mapper
public interface ScheduleMapper {

    List<ScheduleVO> selectList(@Param("deptId") Long deptId,
                                @Param("workDate") LocalDate workDate,
                                @Param("staffId") Long staffId);

    Schedule selectById(@Param("id") Long id);

    Schedule selectByIdForUpdate(@Param("id") Long id);

    int insert(Schedule schedule);

    int updateById(Schedule schedule);

    int decrementRemaining(@Param("id") Long id);

    int incrementRemaining(@Param("id") Long id);
}
