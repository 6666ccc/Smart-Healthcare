package com.example.huiliao.oauth.mapper;

import com.example.huiliao.oauth.entity.OAuthClient;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface OAuthClientMapper {

    OAuthClient selectByClientId(@Param("clientId") String clientId);
}
