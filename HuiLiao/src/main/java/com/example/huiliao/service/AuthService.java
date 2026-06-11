package com.example.huiliao.service;

import com.example.huiliao.dto.LoginDTO;
import com.example.huiliao.vo.LoginVO;

public interface AuthService {

    LoginVO login(LoginDTO dto);

    void logout(String token);
}
