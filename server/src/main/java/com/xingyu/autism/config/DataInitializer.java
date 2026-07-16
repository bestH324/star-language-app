package com.xingyu.autism.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * 启动初始化：创建默认管理员、视频目录等
 */
@Configuration
public class DataInitializer {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    @Bean
    public ApplicationRunner initRunner(JdbcTemplate jdbc, PasswordEncoder encoder,
                                        org.springframework.core.env.Environment env) {
        return args -> {
            // 1. 默认管理员 admin / admin123
            Integer adminCount = jdbc.queryForObject("SELECT COUNT(*) FROM admins", Integer.class);
            if (adminCount != null && adminCount == 0) {
                jdbc.update("INSERT INTO admins(username, password) VALUES(?, ?)",
                        "admin", encoder.encode("admin123"));
                log.info("已创建默认管理员账号: admin / admin123");
            }

            // 2. 视频目录
            String videoDir = env.getProperty("autism.video-dir", "data/videos");
            try {
                Path vp = Paths.get(videoDir);
                Files.createDirectories(vp);
                log.info("视频目录: {}", vp.toAbsolutePath());
            } catch (IOException e) {
                log.warn("视频目录创建失败: {}", e.getMessage());
            }

            log.info("===== 星语后端初始化完成 =====");
            log.info("数据库: {}", env.getProperty("spring.datasource.url"));
            log.info("演示验证码: {}", env.getProperty("autism.demo-code"));
        };
    }
}
