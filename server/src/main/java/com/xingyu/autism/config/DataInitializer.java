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

            // 2. 数据库迁移（幂等 ALTER TABLE，忽略重复列错误）
            String[] migrations = {
                "ALTER TABLE users ADD COLUMN gender VARCHAR(10) DEFAULT NULL",
                "ALTER TABLE users ADD COLUMN birth_date DATE DEFAULT NULL",
                "ALTER TABLE users ADD COLUMN education VARCHAR(50) DEFAULT NULL",
                "ALTER TABLE users ADD COLUMN income VARCHAR(50) DEFAULT NULL",
                "ALTER TABLE users ADD COLUMN relationship VARCHAR(50) DEFAULT NULL",
                "ALTER TABLE users ADD COLUMN single_parent TINYINT(1) DEFAULT 0",
                "ALTER TABLE questions ADD COLUMN is_key TINYINT(1) DEFAULT 0",
                "ALTER TABLE questions ADD COLUMN is_reverse TINYINT(1) DEFAULT 0",
                "ALTER TABLE questionnaires ADD COLUMN min_age_months INT DEFAULT 0",
                "ALTER TABLE questionnaires ADD COLUMN max_age_months INT DEFAULT 240",
                "ALTER TABLE users ADD COLUMN agreed_privacy TINYINT(1) DEFAULT 0",
                "ALTER TABLE users ADD COLUMN agreed_research TINYINT(1) DEFAULT 0",
                "ALTER TABLE users ADD COLUMN privacy_agreed_at DATETIME",
                "ALTER TABLE children ADD COLUMN is_premature TINYINT(1) DEFAULT 0",
                "ALTER TABLE children ADD COLUMN premature_weeks INT DEFAULT 0",
                "ALTER TABLE children ADD COLUMN city VARCHAR(50)",
                "CREATE TABLE IF NOT EXISTS caregivers (" +
                    " id INT PRIMARY KEY AUTO_INCREMENT," +
                    " child_id INT NOT NULL UNIQUE," +
                    " name VARCHAR(50), gender VARCHAR(10), age INT," +
                    " relationship VARCHAR(20), is_single_parent VARCHAR(4)," +
                    " education VARCHAR(30), income VARCHAR(30)," +
                    " create_time DATETIME DEFAULT CURRENT_TIMESTAMP," +
                    " update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP," +
                    " FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE" +
                    ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
                "CREATE TABLE IF NOT EXISTS reminders (" +
                    " id INT PRIMARY KEY AUTO_INCREMENT," +
                    " user_id INT NOT NULL, child_id INT NOT NULL," +
                    " reminder_type VARCHAR(30) NOT NULL," +
                    " scheduled_days INT NOT NULL," +
                    " trigger_reason VARCHAR(100)," +
                    " status VARCHAR(20) DEFAULT 'pending'," +
                    " sent_at DATETIME, cancelled_at DATETIME," +
                    " create_time DATETIME DEFAULT CURRENT_TIMESTAMP," +
                    " FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE," +
                    " FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE" +
                    ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
            };
            for (String sql : migrations) {
                try {
                    jdbc.execute(sql);
                    log.info("迁移成功: {}", sql.substring(0, Math.min(50, sql.length())));
                } catch (Exception e) {
                    log.info("迁移跳过: {}", e.getMessage().replace("\n", " "));
                }
            }

            // 3. 视频目录
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
