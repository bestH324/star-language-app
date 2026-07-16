@echo off
chcp 65001 >nul
echo ============================================
echo   星语 · 后端服务启动
echo ============================================
echo.

set "JAVA_HOME=C:\Program Files\Amazon Corretto\jdk25.0.3_9"
set "MAVEN_HOME=C:\tools\apache-maven-3.9.16"
set "PATH=%JAVA_HOME%\bin;%MAVEN_HOME%\bin;%PATH%"

echo JAVA_HOME = %JAVA_HOME%
echo MAVEN_HOME = %MAVEN_HOME%
echo.
echo 正在启动 Spring Boot 服务（端口 8081）...
echo.

cd /d "%~dp0"
mvn spring-boot:run
pause
