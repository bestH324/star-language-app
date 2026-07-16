# 星语 · 孤独症早期支持平台

> 🌟 基于 SACS 量表的孤独症（自闭症）早期筛查微信小程序 — 完整项目

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![WeChat Miniapp](https://img.shields.io/badge/platform-微信小程序-green.svg)](https://developers.weixin.qq.com/miniprogram/dev/)

## 项目简介

**星语**是一款面向 1-5 岁儿童的孤独症谱系障碍（ASD）早期筛查支持平台。采用国际权威的 **SACS**（Social Attention and Communication Study）改编量表，通过「看视频 + 做问卷」的方式，帮助家长快速了解孩子的社交沟通发育状况，并提供专业建议和转诊资源。

> 🏫 学术支持：南开大学 · 儿童发育行为研究团队

## 📁 项目结构

```
star-language-app/
├── miniapp/                # 微信小程序端（原生框架）
│   ├── app.js/json/wxss   # 应用入口
│   ├── pages/             # 16 个页面
│   │   ├── splash/        # 启动页
│   │   ├── index/         # 首页
│   │   ├── login/         # 登录
│   │   ├── register/      # 注册
│   │   ├── screening/     # 筛查问卷（核心）
│   │   ├── result/        # 筛查结果报告
│   │   ├── history/       # 筛查历史
│   │   ├── child-manage/  # 儿童信息管理
│   │   ├── science/       # 科普知识
│   │   ├── referral/      # 转诊服务
│   │   ├── empowerment/   # 赋能支持
│   │   ├── profile/       # 个人中心
│   │   ├── about/         # 关于我们
│   │   ├── admin-login/   # 管理员登录
│   │   └── admin-dashboard/ # 管理后台
│   ├── assets/icons/      # 图标资源
│   ├── utils/             # 工具函数 & 数据
│   ├── project.config.json
│   └── sitemap.json
│
├── web/                   # H5/Web 前端（移动端优先）
│   ├── index.html         # SPA 单页应用入口
│   ├── css/style.css      # 全局样式（南开紫主题）
│   ├── js/
│   │   ├── app.js         # 应用逻辑
│   │   └── data.js        # 数据层
│   └── assets/            # 图片 & 视频资源
│
├── server/                # 后端服务（Java Spring Boot）
│   ├── pom.xml
│   ├── src/main/java/com/xingyu/autism/
│   │   ├── controller/    # 接口控制器
│   │   ├── service/       # 业务逻辑层
│   │   ├── dto/           # 数据传输对象
│   │   ├── config/        # 配置（认证/拦截器）
│   │   └── common/        # 通用类（异常/响应）
│   └── src/main/resources/
│       ├── application.yml
│       ├── schema.sql     # 数据库表结构
│       └── data.sql       # 初始数据
│
└── docs/                  # 项目文档
    ├── screenshots/       # 小程序页面截图（26张）
    ├── 接口文档.md
    ├── 数据库设计文档.md
    └── 部署文档.md
```

## ✨ 功能模块

### 👨‍👩‍👧 用户端
| 模块 | 说明 |
|------|------|
| 🔍 **快速筛查** | 选择宝宝 → 观看示范视频 → 回答20道题目 → 生成风险评估报告 |
| 📚 **科普知识** | 孤独症认知、早期信号识别、干预方法等科普文章 |
| 🏥 **转诊服务** | 全国12家专业医疗机构信息，按地区分类 |
| 💪 **赋能支持** | 家庭干预资源、家长指南、亲子游戏等 |
| 👶 **儿童管理** | 添加/编辑/删除宝宝信息（1-5岁） |
| 📋 **历史记录** | 查看历次筛查报告 |
| 👤 **个人中心** | 用户信息、隐私政策、关于我们 |

### 🔐 管理员端
| 模块 | 说明 |
|------|------|
| 📊 **数据统计** | 用户数、儿童数、筛查次数、高风险数 |
| 📈 **风险分布图** | 高/中/低风险可视化展示 |
| 📋 **数据管理** | 用户列表、儿童列表、筛查记录 |
| 📥 **数据导出** | 支持 CSV 格式导出 |

## 🛠 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 小程序前端 | 微信原生框架 | WXML + WXSS + JavaScript |
| Web 前端 | HTML5 + CSS3 + ES6 | 移动优先 SPA |
| 后端 | Java Spring Boot | RESTful API |
| 数据库 | MySQL | 用户/儿童/筛查数据 |
| 认证 | JWT Token | 无状态认证 |

## 🎨 设计规范

- **主色调**：南开紫 `#6B1D5E`
- **辅助色**：金色点缀 `#E8A838`
- **风险等级色**：
  - 🟢 低风险：`#27AE60`
  - 🟡 中风险：`#F39C12`
  - 🔴 高风险：`#E74C3C`

## 📊 筛查量表说明

本平台采用的筛查问卷基于 **SACS（Social Attention and Communication Study）** 改编，共 20 道题目，涵盖 5 大维度：

- 🗣 **社交互动**：目光对视、回应微笑、模仿能力
- 👆 **共同注意**：指物、展示、名字反应
- 💬 **沟通能力**：语言理解、发声表达
- 🔄 **行为模式**：重复行为、感官反应、刻板兴趣
- 😊 **情绪调节**：情绪稳定性和社交寻求

**评分标准**：每题 0-3 分，总分 0-60 分

| 风险等级 | 分数区间 | 建议 |
|---------|---------|------|
| 🟢 低风险 | 0-15 分 | 发育表现良好，定期监测 |
| 🟡 中风险 | 16-35 分 | 建议进一步观察，1-2月内复筛 |
| 🔴 高风险 | 36-60 分 | 建议尽快专业评估 |

## 🚀 快速开始

### 小程序端
1. 下载[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 导入 `miniapp/` 目录
3. 配置 AppID（`project.config.json`）
4. 编译预览

### Web 前端
```bash
cd web
python -m http.server 8080
```

### 后端服务
```bash
cd server
mvn spring-boot:run
```

### 演示账号

| 角色 | 账号 | 密码/验证码 |
|------|------|-------------|
| 用户 | 任意手机号 | 验证码：123456 |
| 管理员 | admin | admin123 |

## ⚠️ 免责声明

本平台的筛查结果仅供早期参考，**不能替代专业医疗诊断**。如发现孩子有发育行为方面的疑虑，请及时到正规医疗机构就诊。

## 👥 开发团队

| 角色 | 姓名 |
|------|------|
| 学术支持 | 南开大学 · 儿童发育行为研究 |
| 项目发起 | 潘晓光 |
| 需求设计 | 王雪、尹传志 |
| 前端开发 | 韩俊仕 |

## 📄 开源协议

本项目仅供学习和研究使用。© 2026 南开大学
