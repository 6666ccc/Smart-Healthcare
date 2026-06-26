package com.example.wenrun.service;

import com.example.wenrun.dto.LoginDTO;
import com.example.wenrun.dto.RegisterDTO;
import com.example.wenrun.dto.UpdateProfileDTO;
import com.example.wenrun.vo.LoginVO;

public interface AuthService {

    LoginVO login(LoginDTO dto);

    void logout(String accessToken);

    LoginVO register(RegisterDTO dto);

    void updateProfile(Long userId, UpdateProfileDTO dto);

    Long resolveUserId(String token);
}
