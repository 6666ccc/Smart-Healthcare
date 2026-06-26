package com.example.wenrun.config;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.context.annotation.Configuration;

@Configuration
@MapperScan("com.example.wenrun.mapper")
public class MybatisConfig {
}
