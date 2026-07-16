# 星语 · 孤独症早期支持平台 — 后端服务

> 基于 Spring Boot + SQLite3，提供 HTTP/JSON API，适配微信小程序（`wx.request`）调用。

## 技术栈
| 层级 | 技术 |
|------|------|
| 框架 | Spring Boot 3.5.3 / Java 17+ |
| 数据库 | SQLite3（sqlite-jdbc） |
| 数据访问 | Spring JdbcTemplate |
| 鉴权 | 自定义 Token 拦截器 + BCrypt 密码加密 |
| 构建 | Maven |

## 项目结构
```
autism-screening-backend/
├── pom.xml
├── src/main/java/com/xingyu/autism/
│   ├── AutismScreeningApplication.java   # 启动入口
│   ├── config/                            # 配置：Token/拦截器/CORS/初始化
│   ├── common/                            # 统一响应、异常处理
│   ├── dto/                               # 请求/响应对象
│   ├── service/                           # 业务逻辑
│   └── controller/                        # 接口控制器
├── src/main/resources/
│   ├── application.yml                    # 配置
│   ├── schema.sql                         # 建表脚本
│   └── data.sql                           # 种子数据
└── docs/                                  # 数据库/接口/部署文档
```

## 快速开始
```bash
mvn spring-boot:run
# 服务启动于 http://localhost:8081
```
首次启动自动建库建表、写入种子数据、创建管理员 `admin / admin123`。

## 演示账号
| 角色 | 账号 | 密码/验证码 |
|------|------|-------------|
| 用户 | 任意手机号 | 验证码 123456 |
| 管理员 | admin | admin123 |

## 核心接口（详见 docs/接口文档.md）
- 用户：验证码/注册/登录/微信登录
- 儿童档案：CRUD（1-5 岁年龄限制）
- 问卷：题目+视频地址
- 答卷：提交（服务端计分）/ 报告 / 历史
- 管理员：统计 / 列表 / CSV 导出
- 内容：科普文章 / 转诊机构 / 赋能资源

## 业务规则
- SACS 改编量表 20 题，每题 0-3 分，总分 0-60
- 风险判定：低 ≤15 / 中 16-35 / 高 ≥36
- 第 12 题反向计分，服务端按题库重算（防篡改）
- 儿童年龄限制 12-60 个月

## 文档
- [数据库设计文档](docs/数据库设计文档.md)
- [接口文档](docs/接口文档.md)
- [部署文档](docs/部署文档.md)

## 免责声明
筛查结果仅供早期参考，不能替代专业医疗诊断。
