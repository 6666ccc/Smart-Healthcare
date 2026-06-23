package com.example.huiliao.oauth.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;

@Mapper
public interface OAuthTokenBlacklistMapper {

    int insert(@Param("jti") String jti, @Param("expiresAt") LocalDateTime expiresAt);

    int existsByJti(@Param("jti") String jti);

    int deleteExpired(@Param("now") LocalDateTime now);
}
