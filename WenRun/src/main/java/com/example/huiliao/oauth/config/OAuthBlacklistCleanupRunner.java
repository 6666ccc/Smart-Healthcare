package com.example.huiliao.oauth.config;

import com.example.huiliao.oauth.mapper.OAuthTokenBlacklistMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class OAuthBlacklistCleanupRunner implements ApplicationRunner {

    private final OAuthTokenBlacklistMapper blacklistMapper;

    @Override
    public void run(ApplicationArguments args) {
        int removed = blacklistMapper.deleteExpired(LocalDateTime.now());
        if (removed > 0) {
            log.info("已清理 {} 条过期 access token 黑名单记录", removed);
        }
    }
}
