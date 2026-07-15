package com.xingyu.autism;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * 星语 · 孤独症早期支持平台 — 后端服务启动入口
 */
@SpringBootApplication
public class AutismScreeningApplication {

    public static void main(String[] args) {
        // 启动前确保数据目录存在（SQLite 数据库与视频文件存放）
        try {
            Path dataDir = Paths.get("data");
            Files.createDirectories(dataDir);
            Files.createDirectories(dataDir.resolve("videos"));
        } catch (Exception e) {
            System.err.println("创建数据目录失败: " + e.getMessage());
        }
        SpringApplication.run(AutismScreeningApplication.class, args);
    }
}
