package com.example.huiliao.oauth.mapper;

import com.example.huiliao.oauth.entity.OAuthRefreshToken;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface OAuthRefreshTokenMapper {

    int insert(OAuthRefreshToken token);

    OAuthRefreshToken selectByTokenHash(@Param("tokenHash") String tokenHash);

    int revokeById(@Param("id") Long id, @Param("replacedBy") Long replacedBy);

    int revokeByTokenHash(@Param("tokenHash") String tokenHash);

    List<OAuthRefreshToken> selectActiveByUserAndClient(@Param("userId") Long userId,
                                                        @Param("clientId") String clientId);

    int revokeOldestActive(@Param("userId") Long userId,
                           @Param("clientId") String clientId,
                           @Param("keepCount") int keepCount);
}
