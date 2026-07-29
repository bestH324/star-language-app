-- ============================================================
-- 星语 · 孤独症早期支持平台 — MySQL 数据库表结构
-- 严格依据项目要求设计：6 张核心表 + 扩展预留表
-- ============================================================

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  phone       VARCHAR(20) UNIQUE NOT NULL,        -- 手机号
  code        VARCHAR(10),                        -- 最近一次验证码
  password    VARCHAR(100),                       -- BCrypt 加密密码（验证码登录可空）
  nickname    VARCHAR(50),                        -- 昵称（微信登录使用）
  openid      VARCHAR(64),                        -- 微信 openid
  avatar      VARCHAR(255),                       -- 头像 URL
  gender      VARCHAR(10),                        -- 家长性别（male/female）
  birth_date  DATE,                               -- 家长出生日期（用于计算年龄）
  education   VARCHAR(50),                        -- 教育程度
  income      VARCHAR(50),                        -- 家庭收入
  relationship VARCHAR(50),                       -- 与儿童关系
  single_parent TINYINT(1) DEFAULT 0,             -- 是否单亲
  agreed_privacy     TINYINT(1) DEFAULT 0,         -- 是否同意隐私条款
  agreed_research    TINYINT(1) DEFAULT 0,         -- 是否同意科研使用
  privacy_agreed_at  DATETIME,                     -- 同意时间
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_deleted TINYINT(1) DEFAULT 0,
  deleted_at DATETIME DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 儿童表
CREATE TABLE IF NOT EXISTS children (
  id               INT PRIMARY KEY AUTO_INCREMENT,
  user_id          INT NOT NULL,                       -- 所属用户
  name             VARCHAR(50) NOT NULL,               -- 昵称
  gender           VARCHAR(10) NOT NULL,               -- male / female
  birth_date       DATE NOT NULL,                      -- 出生日期
  avatar           VARCHAR(20),                        -- 头像 emoji
  is_premature     TINYINT(1) DEFAULT 0,               -- 是否早产
  premature_weeks  INT DEFAULT 0,                      -- 早产周数
  city             VARCHAR(50),                        -- 居住地市
  create_time      DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_deleted       TINYINT(1) DEFAULT 0,
  deleted_at       DATETIME DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 问卷表
CREATE TABLE IF NOT EXISTS questionnaires (
  id               INT PRIMARY KEY AUTO_INCREMENT,
  title            VARCHAR(100) NOT NULL,
  description      TEXT,
  total_questions  INT DEFAULT 20,
  min_age_months   INT DEFAULT 0,                 -- 适用最小月龄
  max_age_months   INT DEFAULT 240,               -- 适用最大月龄
  create_time      DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. 题目表（含视频）
CREATE TABLE IF NOT EXISTS questions (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  qid         INT NOT NULL,                       -- 所属问卷 id
  video_url   VARCHAR(255),                       -- 讲解视频地址
  content     TEXT NOT NULL,                      -- 题干
  options     TEXT NOT NULL,                      -- 选项 JSON：[{value,label}]
  sort        INT NOT NULL,                       -- 排序
  is_key      TINYINT(1) DEFAULT 0,              -- 是否关键题目（1=是 0=否）
  is_reverse  TINYINT(1) DEFAULT 0,              -- 是否反选计分（1=是 0=否）
  FOREIGN KEY (qid) REFERENCES questionnaires(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. 答卷表（含报告）
CREATE TABLE IF NOT EXISTS answers (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  child_id     INT NOT NULL,                      -- 筛查儿童
  qid          INT NOT NULL,                      -- 问卷 id
  answer_json  TEXT NOT NULL,                     -- 答案 JSON：[{questionId,value,score}]
  total_score  INT NOT NULL,                      -- 总得分
  risk_level   VARCHAR(10) NOT NULL,              -- low / medium / high
  create_time  DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_deleted    TINYINT(1) DEFAULT 0,
  deleted_at    DATETIME DEFAULT NULL,
  INDEX idx_answers_risk (risk_level),
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
  FOREIGN KEY (qid) REFERENCES questionnaires(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. 管理员表
CREATE TABLE IF NOT EXISTS admins (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  username    VARCHAR(50) UNIQUE NOT NULL,
  password    VARCHAR(100) NOT NULL,              -- BCrypt 加密
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 扩展预留表（科普文章、转诊机构、赋能资源等）
-- ============================================================

-- 科普文章
CREATE TABLE IF NOT EXISTS articles (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  category    VARCHAR(30) NOT NULL,               -- knowledge / early / intervene
  title       VARCHAR(200) NOT NULL,
  summary     TEXT,
  content     TEXT,
  author      VARCHAR(100),
  date        VARCHAR(20),
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 转诊机构
CREATE TABLE IF NOT EXISTS institutions (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  name        VARCHAR(200) NOT NULL,
  region      VARCHAR(50) NOT NULL,
  department  VARCHAR(100),
  address     VARCHAR(255),
  phone       VARCHAR(50),
  description TEXT,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 赋能资源
CREATE TABLE IF NOT EXISTS resources (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  icon        VARCHAR(20),
  title       VARCHAR(100) NOT NULL,
  description TEXT,
  url         VARCHAR(255),
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. 预约记录表
CREATE TABLE IF NOT EXISTS appointments (
  id               INT PRIMARY KEY AUTO_INCREMENT,
  user_id          INT NOT NULL,
  child_id         INT NOT NULL,
  hospital_id      INT NOT NULL,
  hospital_name    VARCHAR(200),
  type             VARCHAR(50) NOT NULL,              -- 门诊 / 线下评估 / 康复体验课
  appointment_time VARCHAR(50) NOT NULL,              -- 预约时间
  status           VARCHAR(20) DEFAULT '待确认',       -- 待确认 / 已确认 / 已取消 / 已完成
  create_time      DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. 照护者信息表（儿童 1:1 照护者，用于 Excel 导出人口学统计）
CREATE TABLE IF NOT EXISTS caregivers (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    child_id        INT NOT NULL UNIQUE,
    name            VARCHAR(50),
    gender          VARCHAR(10),
    age             INT,
    relationship    VARCHAR(20),
    is_single_parent VARCHAR(4),
    education       VARCHAR(30),
    income          VARCHAR(30),
    create_time     DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. 筛查提醒表
CREATE TABLE IF NOT EXISTS reminders (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    user_id         INT NOT NULL,
    child_id        INT NOT NULL,
    reminder_type   VARCHAR(30) NOT NULL,
    scheduled_days  INT NOT NULL,
    trigger_reason  VARCHAR(100),
    status          VARCHAR(20) DEFAULT 'pending',
    sent_at         DATETIME,
    cancelled_at    DATETIME,
    create_time     DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_deleted      TINYINT(1) DEFAULT 0,
    deleted_at      DATETIME DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
