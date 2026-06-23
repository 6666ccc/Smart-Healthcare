package com.example.huiliao.service;

import com.example.huiliao.dto.LoginDTO;
import com.example.huiliao.dto.RegisterDTO;
import com.example.huiliao.dto.UpdateProfileDTO;
import com.example.huiliao.vo.LoginVO;

public interface AuthService {

    LoginVO login(LoginDTO dto);

    void logout(String token);

    LoginVO register(RegisterDTO dto);

    /** 更新个人资料 */
    void updateProfile(Long userId, UpdateProfileDTO dto);

    /** 根据 Token 解析用户 ID */
    Long resolveUserId(String token);
}
