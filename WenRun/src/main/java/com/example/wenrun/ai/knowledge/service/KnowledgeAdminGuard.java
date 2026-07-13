package com.example.wenrun.ai.knowledge.service;

import com.example.wenrun.common.ResultCode;
import com.example.wenrun.common.context.UserContext;
import com.example.wenrun.common.exception.BusinessException;
import com.example.wenrun.entity.SysRole;
import com.example.wenrun.mapper.SysUserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class KnowledgeAdminGuard {

    private final SysUserMapper userMapper;

    public void requireAdmin() {
        Long userId = currentUserId();
        List<SysRole> roles = userMapper.selectRolesByUserId(userId);
        boolean admin = roles != null && roles.stream()
                .anyMatch(role -> "admin".equals(role.getRoleCode()));
        if (!admin) {
            throw new BusinessException(ResultCode.FORBIDDEN, "仅管理员可管理知识库");
        }
    }

    public Long currentUserId() {
        Long userId = UserContext.getUserId();
        if (userId == null) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "未登录或登录状态已失效");
        }
        return userId;
    }
}
