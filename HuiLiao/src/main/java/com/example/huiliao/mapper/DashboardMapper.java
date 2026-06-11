package com.example.huiliao.mapper;

import org.apache.ibatis.annotations.Mapper;

import java.math.BigDecimal;

@Mapper
public interface DashboardMapper {

    long countTodayRegistrations();

    long countTodayVisits();

    long countTodayPaidCharges();

    BigDecimal sumTodayRevenue();

    long countPendingDispense();
}
