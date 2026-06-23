package com.example.huiliao.service.impl;

import com.example.huiliao.common.constant.AccountType;
import com.example.huiliao.common.constant.BizStatus;
import com.example.huiliao.common.exception.BusinessException;
import com.example.huiliao.dto.LoginDTO;
import com.example.huiliao.dto.RegisterDTO;
import com.example.huiliao.dto.UpdateProfileDTO;
import com.example.huiliao.entity.Patient;
import com.example.huiliao.entity.Staff;
import com.example.huiliao.entity.SysRole;
import com.example.huiliao.entity.SysUser;
import com.example.huiliao.mapper.PatientMapper;
import com.example.huiliao.mapper.StaffMapper;
import com.example.huiliao.mapper.SysUserMapper;
import com.example.huiliao.oauth.config.OAuthProperties;
import com.example.huiliao.oauth.dto.TokenPair;
import com.example.huiliao.oauth.service.JwtTokenProvider;
import com.example.huiliao.oauth.service.TokenService;
import com.example.huiliao.service.AuthService;
import com.example.huiliao.service.PatientService;
import com.example.huiliao.service.support.LoginAssembler;
import com.example.huiliao.vo.LoginVO;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.List;

/**
 * 认证服务实现 — 登录、注册、登出及个人资料管理
 */
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final SysUserMapper sysUserMapper;
    private final StaffMapper staffMapper;
    private final PatientMapper patientMapper;
    private final PatientService patientService;
    private final TokenService tokenService;
    private final JwtTokenProvider jwtTokenProvider;
    private final OAuthProperties oauthProperties;
    private final PasswordEncoder passwordEncoder;

    /** 校验账号密码，签发 Token 并组装登录响应（含角色与业务 ID） */
    @Override
    public LoginVO login(LoginDTO dto) {
        TokenPair pair = tokenService.issueByPassword(
                dto.getUsername(),
                dto.getPassword(),
                oauthProperties.getDefaultClientId(),
                currentUserAgent(),
                currentClientIp()
        );
        SysUser user = sysUserMapper.selectByUsername(dto.getUsername());
        return buildLoginVO(user, pair);
    }

    /** 移除 Token，实现登出 */
    @Override
    public void logout(String accessToken, String refreshToken) {
        if (StringUtils.hasText(accessToken)) {
            tokenService.revokeAccessToken(accessToken);
        }
        if (StringUtils.hasText(refreshToken)) {
            tokenService.revokeRefreshToken(refreshToken);
        }
    }

    /** 根据 Token 解析并校验用户 ID */
    @Override
    public Long resolveUserId(String token) {
        if (!StringUtils.hasText(token)) {
            throw new BusinessException("未登录");
        }
        return jwtTokenProvider.parseUserId(token);
    }

    /** 更新 sys_user 基础信息；患者账号同步更新 patient 档案 */
    @Override
    public void updateProfile(Long userId, UpdateProfileDTO dto) {
        SysUser user = sysUserMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException("用户不存在");
        }

        // 更新 sys_user 基础信息
        boolean needUpdateUser = false;
        if (dto.getRealName() != null) {
            user.setRealName(dto.getRealName());
            needUpdateUser = true;
        }
        if (dto.getPhone() != null) {
            // 校验手机号唯一（排除自己）
            SysUser exist = sysUserMapper.selectByPhone(dto.getPhone());
            if (exist != null && !exist.getId().equals(userId)) {
                throw new BusinessException("手机号已被其他账号使用");
            }
            user.setPhone(dto.getPhone());
            needUpdateUser = true;
        }
        if (needUpdateUser) {
            sysUserMapper.updateById(user);
        }

        // 更新 patient 档案（仅患者端）
        if (AccountType.PATIENT.equals(user.getAccountType())) {
            Patient patient = patientMapper.selectByUserId(userId);
            if (patient == null) return;

            boolean needUpdatePatient = false;
            if (dto.getRealName() != null) {
                patient.setName(dto.getRealName());
                needUpdatePatient = true;
            }
            if (dto.getPhone() != null) {
                patient.setPhone(dto.getPhone());
                needUpdatePatient = true;
            }
            if (dto.getGender() != null) {
                patient.setGender(dto.getGender());
                needUpdatePatient = true;
            }
            if (dto.getBirthDate() != null) {
                patient.setBirthDate(dto.getBirthDate());
                needUpdatePatient = true;
            }
            if (dto.getIdCard() != null) {
                patient.setIdCard(dto.getIdCard());
                needUpdatePatient = true;
            }
            if (dto.getAddress() != null) {
                patient.setAddress(dto.getAddress());
                needUpdatePatient = true;
            }
            if (dto.getAllergyHistory() != null) {
                patient.setAllergyHistory(dto.getAllergyHistory());
                needUpdatePatient = true;
            }
            if (needUpdatePatient) {
                patientMapper.updateById(patient);
            }
        }
    }

    /** 患者自助注册：创建用户、分配角色、初始化档案并返回登录信息 */
    @Override
    public LoginVO register(RegisterDTO dto) {
        // 1. 校验两次密码一致
        if (!dto.getPassword().equals(dto.getConfirmPassword())) {
            throw new BusinessException("两次输入的密码不一致");
        }

        // 2. 校验用户名唯一
        if (sysUserMapper.selectByUsername(dto.getUsername()) != null) {
            throw new BusinessException("用户名已被注册");
        }

        // 3. 校验手机号唯一
        if (sysUserMapper.selectByPhone(dto.getPhone()) != null) {
            throw new BusinessException("手机号已被注册");
        }

        // 4. 获取患者角色
        SysRole patientRole = sysUserMapper.selectRoleByCode("patient");
        if (patientRole == null) {
            throw new BusinessException("系统配置错误：患者角色不存在");
        }

        // 5. 创建系统用户（真实姓名注册时无需填写，由用户在个人中心补充）
        SysUser user = new SysUser();
        user.setUsername(dto.getUsername());
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        user.setPhone(dto.getPhone());
        user.setAccountType(AccountType.PATIENT);
        user.setStatus(BizStatus.ENABLED);
        sysUserMapper.insert(user);

        // 6. 分配患者角色
        sysUserMapper.insertUserRole(user.getId(), patientRole.getId());

        // 7. 自动创建患者档案（姓名暂用用户名占位，后续在个人中心完善）
        Patient patient = new Patient();
        patient.setName(dto.getUsername());
        patient.setPhone(dto.getPhone());
        patient.setGender(2); // 默认未知
        patient.setUserId(user.getId());
        patientService.create(patient);

        // 8. 生成 Token 并返回登录信息（注册即登录）
        TokenPair pair = tokenService.issueForUser(
                user,
                oauthProperties.getDefaultClientId(),
                currentUserAgent(),
                currentClientIp()
        );
        return buildLoginVO(user, pair);
    }

    private LoginVO buildLoginVO(SysUser user, TokenPair pair) {
        List<SysRole> roleList = sysUserMapper.selectRolesByUserId(user.getId());
        SysRole primaryRole = LoginAssembler.pickPrimaryRole(roleList);
        String portalType = LoginAssembler.resolvePortalType(user, primaryRole);

        LoginVO vo = new LoginVO();
        vo.setAccessToken(pair.getAccessToken());
        vo.setToken(pair.getAccessToken());
        vo.setRefreshToken(pair.getRefreshToken());
        vo.setExpiresIn(pair.getExpiresIn());
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

    /** 根据账号类型填充 staffId 或 patientId */
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

    private String currentUserAgent() {
        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs == null) {
            return null;
        }
        HttpServletRequest request = attrs.getRequest();
        return request.getHeader("User-Agent");
    }

    private String currentClientIp() {
        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs == null) {
            return null;
        }
        return attrs.getRequest().getRemoteAddr();
    }
}
