package com.example.huiliao.service.impl;

import com.example.huiliao.mapper.DashboardMapper;
import com.example.huiliao.mapper.DrugStockMapper;
import com.example.huiliao.service.DashboardService;
import com.example.huiliao.vo.DashboardVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

/**
 * 工作台统计服务实现 — 汇总今日运营数据
 */
@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final DashboardMapper dashboardMapper;
    private final DrugStockMapper drugStockMapper;

    /** 汇总今日挂号、就诊、收费、营收、待发药及低库存药品数量 */
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
