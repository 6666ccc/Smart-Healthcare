package com.example.huiliao.service.impl;

import com.example.huiliao.common.constant.AccountType;
import com.example.huiliao.common.constant.BizStatus;
import com.example.huiliao.common.exception.BusinessException;
import com.example.huiliao.config.AuthTokenStore;
import com.example.huiliao.dto.LoginDTO;
import com.example.huiliao.entity.Patient;
import com.example.huiliao.entity.Staff;
import com.example.huiliao.entity.SysRole;
import com.example.huiliao.entity.SysUser;
import com.example.huiliao.mapper.PatientMapper;
import com.example.huiliao.mapper.StaffMapper;
import com.example.huiliao.mapper.SysUserMapper;
import com.example.huiliao.service.AuthService;
import com.example.huiliao.service.support.LoginAssembler;
import com.example.huiliao.vo.LoginVO;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final SysUserMapper sysUserMapper;
    private final StaffMapper staffMapper;
    private final PatientMapper patientMapper;
    private final AuthTokenStore authTokenStore;
    private final PasswordEncoder passwordEncoder;

    @Override
    public LoginVO login(LoginDTO dto) {
        SysUser user = sysUserMapper.selectByUsername(dto.getUsername());
        if (user == null || user.getStatus() != BizStatus.ENABLED) {
            throw new BusinessException("用户名或密码错误");
        }
        if (!passwordEncoder.matches(dto.getPassword(), user.getPassword())) {
            throw new BusinessException("用户名或密码错误");
        }
        String token = authTokenStore.createToken(user.getId());
        List<SysRole> roleList = sysUserMapper.selectRolesByUserId(user.getId());
        SysRole primaryRole = LoginAssembler.pickPrimaryRole(roleList);
        String portalType = LoginAssembler.resolvePortalType(user, primaryRole);

        LoginVO vo = new LoginVO();
        vo.setToken(token);
        vo.setUserId(user.getId());
        vo.setUsername(user.getUsername());
        vo.setRealName(user.getRealName());
        vo.setPortalType(portalType);
        vo.setUserType(portalType);
        vo.setRoles(roleList.stream().map(SysRole::getRoleCode).toList());
        if (primaryRole != null) {
            vo.setRoleCode(primaryRole.getRoleCode());
            vo.setRoleName(primaryRole.getRoleName());
        }
        fillBusinessIds(user, vo);
        return vo;
    }

    private void fillBusinessIds(SysUser user, LoginVO vo) {
        String accountType = user.getAccountType();
        if (!StringUtils.hasText(accountType)) {
            accountType = AccountType.INTERNAL;
        }
        if (AccountType.STAFF.equals(accountType)) {
            Staff staff = staffMapper.selectByUserId(user.getId());
            if (staff != null) {
                vo.setStaffId(staff.getId());
            }
            return;
        }
        if (AccountType.PATIENT.equals(accountType)) {
            Patient patient = patientMapper.selectByUserId(user.getId());
            if (patient != null) {
                vo.setPatientId(patient.getId());
            }
        }
    }

    @Override
    public void logout(String token) {
        if (StringUtils.hasText(token)) {
            authTokenStore.remove(token);
        }
    }
}
