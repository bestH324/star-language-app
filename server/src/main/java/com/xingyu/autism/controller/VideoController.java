package com.xingyu.autism.controller;

import com.xingyu.autism.common.BizException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * 视频资源服务（支持 Range 分段播放 + 简单防盗链）
 */
@RestController
@RequestMapping("/api/video")
public class VideoController {

    @Value("${autism.video-dir:data/videos}")
    private String videoDir;

    @Value("${autism.allowed-referer:}")
    private String allowedReferer;

    @GetMapping("/{name:.+}")
    public void stream(@PathVariable String name, HttpServletRequest req, HttpServletResponse resp) throws IOException {
        // 防盗链：校验 Referer（配置为空时跳过）
        if (allowedReferer != null && !allowedReferer.isBlank()) {
            String referer = req.getHeader("Referer");
            if (referer == null || !referer.startsWith(allowedReferer)) {
                resp.sendError(403, "防盗链：非法来源");
                return;
            }
        }

        Path file = Paths.get(videoDir).resolve(name).normalize();
        if (!file.startsWith(Paths.get(videoDir).normalize()) || !Files.exists(file)) {
            resp.sendError(404, "视频不存在");
            return;
        }

        long fileLength = Files.size(file);
        String range = req.getHeader("Range");
        long start = 0;
        long end = fileLength - 1;

        if (range != null && range.startsWith("bytes=")) {
            String[] parts = range.substring(6).split("-");
            try {
                start = Long.parseLong(parts[0]);
                if (parts.length > 1 && !parts[1].isEmpty()) end = Long.parseLong(parts[1]);
            } catch (NumberFormatException ignored) {}
            resp.setStatus(206);
        } else {
            resp.setStatus(200);
        }

        long contentLength = end - start + 1;
        resp.setHeader("Accept-Ranges", "bytes");
        resp.setHeader("Content-Length", String.valueOf(contentLength));
        resp.setHeader("Content-Range", "bytes " + start + "-" + end + "/" + fileLength);
        String contentType = Files.probeContentType(file);
        resp.setContentType(contentType != null ? contentType : "video/mp4");

        try (RandomAccessFile raf = new RandomAccessFile(file.toFile(), "r")) {
            raf.seek(start);
            byte[] buffer = new byte[8192];
            long remaining = contentLength;
            while (remaining > 0) {
                int read = raf.read(buffer, 0, (int) Math.min(buffer.length, remaining));
                if (read == -1) break;
                resp.getOutputStream().write(buffer, 0, read);
                remaining -= read;
            }
        }
    }
}
