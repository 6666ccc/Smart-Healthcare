package com.example.wenrun.service.impl;

import com.example.wenrun.common.ResultCode;
import com.example.wenrun.common.constant.AccountType;
import com.example.wenrun.common.constant.BizStatus;
import com.example.wenrun.common.exception.BusinessException;
import com.example.wenrun.config.JwtProperties;
import com.example.wenrun.dto.LoginDTO;
import com.example.wenrun.dto.RegisterDTO;
import com.example.wenrun.dto.UpdateProfileDTO;
import com.example.wenrun.entity.Patient;
import com.example.wenrun.entity.Staff;
import com.example.wenrun.entity.SysRole;
import com.example.wenrun.entity.SysUser;
import com.example.wenrun.mapper.PatientMapper;
import com.example.wenrun.mapper.StaffMapper;
import com.example.wenrun.mapper.SysUserMapper;
import com.example.wenrun.mapper.TokenBlacklistMapper;
import com.example.wenrun.service.AuthService;
import com.example.wenrun.service.PatientService;
import com.example.wenrun.service.support.LoginAssembler;
import com.example.wenrun.util.JwtUtil;
import com.example.wenrun.vo.LoginVO;
import com.nimbusds.jwt.JWTClaimsSet;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 认证服务实现 —— 登录、注册、登出。
 */
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final SysUserMapper sysUserMapper;
    private final StaffMapper staffMapper;
    private final PatientMapper patientMapper;
    private final PatientService patientService;
    private final PasswordEncoder passwordEncoder;
    private final JwtProperties jwtProperties;
    private final TokenBlacklistMapper blacklistMapper;

    @Override
    public LoginVO login(LoginDTO dto) {
        SysUser user = sysUserMapper.selectByUsername(dto.getUsername());
        if (user == null || user.getStatus() != BizStatus.ENABLED) {
            throw new BusinessException("用户名或密码错误");
        }
        if (!passwordEncoder.matches(dto.getPassword(), user.getPassword())) {
            throw new BusinessException("用户名或密码错误");
        }
        return buildLoginVO(user);
    }

    @Override
    public void logout(String accessToken) {
        if (!StringUtils.hasText(accessToken)) return;
        JWTClaimsSet claims = JwtUtil.parseWithoutVerify(accessToken);
        if (claims == null) return;
        String jti = JwtUtil.getJti(claims);
        LocalDateTime expiresAt = JwtUtil.getExpiresAtLocal(claims);
        if (jti == null || expiresAt == null || expiresAt.isBefore(LocalDateTime.now())) return;
        if (blacklistMapper.existsByJti(jti) == 0) {
            blacklistMapper.insert(jti, expiresAt);
        }
    }

    @Override
    public Long resolveUserId(String token) {
        if (!StringUtils.hasText(token)) {
            throw new BusinessException(ResultCode.UNAUTHORIZED, "未登录");
        }
        JWTClaimsSet claims = JwtUtil.verifyAndParse(token, jwtProperties.getSecret());
        return JwtUtil.getUserId(claims);
    }

    @Override
    public void updateProfile(Long userId, UpdateProfileDTO dto) {
        SysUser user = sysUserMapper.selectById(userId);
        if (user == null) throw new BusinessException("用户不存在");

        boolean needUpdateUser = false;
        if (dto.getRealName() != null) { user.setRealName(dto.getRealName()); needUpdateUser = true; }
        if (dto.getPhone() != null) {
            SysUser exist = sysUserMapper.selectByPhone(dto.getPhone());
            if (exist != null && !exist.getId().equals(userId)) throw new BusinessException("手机号已被其他账号使用");
            user.setPhone(dto.getPhone());
            needUpdateUser = true;
        }
        if (needUpdateUser) sysUserMapper.updateById(user);

        if (AccountType.PATIENT.equals(user.getAccountType())) {
            Patient patient = patientMapper.selectByUserId(userId);
            if (patient == null) return;
            boolean needUpdatePatient = false;
            if (dto.getRealName() != null) { patient.setName(dto.getRealName()); needUpdatePatient = true; }
            if (dto.getPhone() != null) { patient.setPhone(dto.getPhone()); needUpdatePatient = true; }
            if (dto.getGender() != null) { patient.setGender(dto.getGender()); needUpdatePatient = true; }
            if (dto.getBirthDate() != null) { patient.setBirthDate(dto.getBirthDate()); needUpdatePatient = true; }
            if (dto.getIdCard() != null) { patient.setIdCard(dto.getIdCard()); needUpdatePatient = true; }
            if (dto.getAddress() != null) { patient.setAddress(dto.getAddress()); needUpdatePatient = true; }
            if (dto.getAllergyHistory() != null) { patient.setAllergyHistory(dto.getAllergyHistory()); needUpdatePatient = true; }
            if (needUpdatePatient) patientMapper.updateById(patient);
        }
    }

    @Override
    public LoginVO register(RegisterDTO dto) {
        if (!dto.getPassword().equals(dto.getConfirmPassword())) throw new BusinessException("两次输入的密码不一致");
        if (sysUserMapper.selectByUsername(dto.getUsername()) != null) throw new BusinessException("用户名已被注册");
        if (sysUserMapper.selectByPhone(dto.getPhone()) != null) throw new BusinessException("手机号已被注册");

        SysRole patientRole = sysUserMapper.selectRoleByCode("patient");
        if (patientRole == null) throw new BusinessException("系统配置错误：患者角色不存在");

        SysUser user = new SysUser();
        user.setUsername(dto.getUsername());
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        user.setPhone(dto.getPhone());
        user.setAccountType(AccountType.PATIENT);
        user.setStatus(BizStatus.ENABLED);
        sysUserMapper.insert(user);
        sysUserMapper.insertUserRole(user.getId(), patientRole.getId());

        Patient patient = new Patient();
        patient.setName(dto.getUsername());
        patient.setPhone(dto.getPhone());
        patient.setGender(2);
        patient.setUserId(user.getId());
        patientService.create(patient);

        return buildLoginVO(user);
    }

    /** 构建登录响应：签发 JWT + 组装用户信息 */
    private LoginVO buildLoginVO(SysUser user) {
        List<SysRole> roleList = sysUserMapper.selectRolesByUserId(user.getId());
        SysRole primaryRole = LoginAssembler.pickPrimaryRole(roleList);
        String portalType = LoginAssembler.resolvePortalType(user, primaryRole);
        List<String> roles = roleList.stream().map(SysRole::getRoleCode).toList();

        Long staffId = null;
        Long patientId = null;
        String accountType = user.getAccountType();
        if (!StringUtils.hasText(accountType)) accountType = AccountType.INTERNAL;
        if (AccountType.STAFF.equals(accountType)) {
            Staff staff = staffMapper.selectByUserId(user.getId());
            if (staff != null) staffId = staff.getId();
        }
        if (AccountType.PATIENT.equals(accountType)) {
            Patient patient = patientMapper.selectByUserId(user.getId());
            if (patient != null) patientId = patient.getId();
        }

        String token = JwtUtil.createToken(
                user.getId(), user.getUsername(), accountType, portalType,
                roles, staffId, patientId,
                jwtProperties.getSecret(), jwtProperties.getExpiry());

        LoginVO vo = new LoginVO();
        vo.setToken(token);
        vo.setAccessToken(token);
        vo.setExpiresIn(jwtProperties.getExpiry());
        vo.setUserId(user.getId());
        vo.setUsername(user.getUsername());
        vo.setRealName(user.getRealName());
        vo.setPortalType(portalType);
        vo.setUserType(portalType);
        vo.setRoles(roles);
        if (primaryRole != null) {
            vo.setRoleCode(primaryRole.getRoleCode());
            vo.setRoleName(primaryRole.getRoleName());
        }
        vo.setStaffId(staffId);
        vo.setPatientId(patientId);
        return vo;
    }
}
