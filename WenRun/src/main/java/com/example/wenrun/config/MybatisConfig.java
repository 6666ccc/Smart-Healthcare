package com.example.wenrun.config;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.context.annotation.Configuration;

@Configuration
@MapperScan({
        "com.example.wenrun.mapper",
        "com.example.wenrun.ai.knowledge.mapper"
})
public class MybatisConfig {
}
