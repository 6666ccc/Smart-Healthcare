package com.example.wenrun.service.impl;

import com.example.wenrun.mapper.DashboardMapper;
import com.example.wenrun.mapper.DrugStockMapper;
import com.example.wenrun.service.DashboardService;
import com.example.wenrun.vo.DashboardVO;
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
