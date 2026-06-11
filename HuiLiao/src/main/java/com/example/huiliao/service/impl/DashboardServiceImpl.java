package com.example.huiliao.service.impl;

import com.example.huiliao.mapper.DashboardMapper;
import com.example.huiliao.mapper.DrugStockMapper;
import com.example.huiliao.service.DashboardService;
import com.example.huiliao.vo.DashboardVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final DashboardMapper dashboardMapper;
    private final DrugStockMapper drugStockMapper;

    @Override
    public DashboardVO summary() {
        DashboardVO vo = new DashboardVO();
        vo.setTodayRegistrations(dashboardMapper.countTodayRegistrations());
        vo.setTodayVisits(dashboardMapper.countTodayVisits());
        vo.setTodayCharges(dashboardMapper.countTodayPaidCharges());
        BigDecimal revenue = dashboardMapper.sumTodayRevenue();
        vo.setTodayRevenue(revenue != null ? revenue : BigDecimal.ZERO);
        vo.setPendingDispense(dashboardMapper.countPendingDispense());
        vo.setLowStockDrugs(drugStockMapper.countLowStock());
        return vo;
    }
}
