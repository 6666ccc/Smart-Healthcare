package com.example.wenrun.service.support;

import com.example.wenrun.common.context.UserContext;
import com.example.wenrun.common.exception.BusinessException;
import com.example.wenrun.entity.Staff;
import com.example.wenrun.mapper.StaffMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * 从当前登录用户解析医护人员身份，用于医生端数据范围与权限校验。
 */
@Component
@RequiredArgsConstructor
public class CurrentStaffSupport {

    private final StaffMapper staffMapper;

    /**
     * 医护人员登录时强制返回本人 staffId；无 staff 绑定（如管理员）时使用请求参数。
     */
    public Long resolveStaffId(Long requestedStaffId) {
        Staff staff = currentStaff();
        if (staff != null) {
            return staff.getId();
        }
        return requestedStaffId;
    }

    public Staff currentStaff() {
        Long userId = UserContext.getUserId();
        if (userId == null) {
            return null;
        }
        return staffMapper.selectByUserId(userId);
    }

    public void assertOwnsStaff(Long targetStaffId) {
        Staff staff = currentStaff();
        if (staff == null || targetStaffId == null) {
            return;
        }
        if (!staff.getId().equals(targetStaffId)) {
            throw new BusinessException("无权操作该医生的业务数据");
        }
    }
}
