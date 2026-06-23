package com.example.huiliao.config;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.context.annotation.Configuration;

@Configuration
@MapperScan("com.example.huiliao.mapper")
public class MybatisConfig {
}
