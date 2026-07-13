package com.example.wenrun.ai.knowledge.service;

import com.example.wenrun.common.context.UserContext;
import com.example.wenrun.common.exception.BusinessException;
import com.example.wenrun.entity.SysRole;
import com.example.wenrun.mapper.SysUserMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class KnowledgeAdminGuardTest {

    @Mock
    private SysUserMapper userMapper;

    @AfterEach
    void tearDown() {
        UserContext.clear();
    }

    @Test
    void allowsOnlyAdminRole() {
        UserContext.setUserId(7L);
        SysRole admin = new SysRole();
        admin.setRoleCode("admin");
        when(userMapper.selectRolesByUserId(7L)).thenReturn(List.of(admin));

        KnowledgeAdminGuard guard = new KnowledgeAdminGuard(userMapper);

        assertDoesNotThrow(guard::requireAdmin);
        assertEquals(7L, guard.currentUserId());
    }

    @Test
    void rejectsAuthenticatedNonAdmin() {
        UserContext.setUserId(8L);
        SysRole doctor = new SysRole();
        doctor.setRoleCode("doctor");
        when(userMapper.selectRolesByUserId(8L)).thenReturn(List.of(doctor));

        BusinessException exception = assertThrows(BusinessException.class,
                () -> new KnowledgeAdminGuard(userMapper).requireAdmin());

        assertEquals(403, exception.getCode());
    }
}
