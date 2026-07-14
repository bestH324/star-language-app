-- ============================================================
-- 星语 · 孤独症早期支持平台 — SQLite3 数据库表结构
-- 严格依据项目要求设计：6 张核心表 + 扩展预留表
-- ============================================================

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  phone       VARCHAR(20) UNIQUE NOT NULL,        -- 手机号
  code        VARCHAR(10),                        -- 最近一次验证码
  password    VARCHAR(100),                       -- BCrypt 加密密码（验证码登录可空）
  nickname    VARCHAR(50),                        -- 昵称（微信登录使用）
  openid      VARCHAR(64),                        -- 微信 openid
  avatar      VARCHAR(255),                       -- 头像 URL
  create_time DATETIME DEFAULT (datetime('now','localtime')),
  update_time DATETIME DEFAULT (datetime('now','localtime'))
);

-- 2. 儿童表
CREATE TABLE IF NOT EXISTS children (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,                   -- 所属用户
  name        VARCHAR(50) NOT NULL,               -- 昵称
  gender      VARCHAR(10) NOT NULL,               -- male / female
  birth_date  DATE NOT NULL,                      -- 出生日期
  avatar      VARCHAR(20),                        -- 头像 emoji
  create_time DATETIME DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. 问卷表
CREATE TABLE IF NOT EXISTS questionnaires (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  title            VARCHAR(100) NOT NULL,
  description      TEXT,
  total_questions  INTEGER DEFAULT 20,
  create_time      DATETIME DEFAULT (datetime('now','localtime'))
);

-- 4. 题目表（含视频）
CREATE TABLE IF NOT EXISTS questions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  qid         INTEGER NOT NULL,                   -- 所属问卷 id
  video_url   VARCHAR(255),                       -- 讲解视频地址
  content     TEXT NOT NULL,                      -- 题干
  options     TEXT NOT NULL,                      -- 选项 JSON：[{value,label,score}]
  sort        INTEGER NOT NULL,                   -- 排序
  FOREIGN KEY (qid) REFERENCES questionnaires(id) ON DELETE CASCADE
);

-- 5. 答卷表（含报告）
CREATE TABLE IF NOT EXISTS answers (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id     INTEGER NOT NULL,                  -- 筛查儿童
  qid          INTEGER NOT NULL,                  -- 问卷 id
  answer_json  TEXT NOT NULL,                     -- 答案 JSON：[{questionId,value,score}]
  total_score  INTEGER NOT NULL,                  -- 总得分
  risk_level   VARCHAR(10) NOT NULL,              -- low / medium / high
  create_time  DATETIME DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
  FOREIGN KEY (qid) REFERENCES questionnaires(id) ON DELETE CASCADE
);

-- 6. 管理员表
CREATE TABLE IF NOT EXISTS admins (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  username    VARCHAR(50) UNIQUE NOT NULL,
  password    VARCHAR(100) NOT NULL,              -- BCrypt 加密
  create_time DATETIME DEFAULT (datetime('now','localtime'))
);

-- ============================================================
-- 扩展预留表（科普文章、转诊机构、赋能资源等）
-- ============================================================

-- 科普文章
CREATE TABLE IF NOT EXISTS articles (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  category    VARCHAR(30) NOT NULL,               -- knowledge / early / intervene
  title       VARCHAR(200) NOT NULL,
  summary     TEXT,
  content     TEXT,
  author      VARCHAR(100),
  date        VARCHAR(20),
  create_time DATETIME DEFAULT (datetime('now','localtime'))
);

-- 转诊机构
CREATE TABLE IF NOT EXISTS institutions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        VARCHAR(200) NOT NULL,
  region      VARCHAR(50) NOT NULL,
  department  VARCHAR(100),
  address     VARCHAR(255),
  phone       VARCHAR(50),
  description TEXT,
  create_time DATETIME DEFAULT (datetime('now','localtime'))
);

-- 赋能资源
CREATE TABLE IF NOT EXISTS resources (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  icon        VARCHAR(20),
  title       VARCHAR(100) NOT NULL,
  description TEXT,
  url         VARCHAR(255),
  create_time DATETIME DEFAULT (datetime('now','localtime'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_children_user   ON children(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_qid   ON questions(qid);
CREATE INDEX IF NOT EXISTS idx_answers_child   ON answers(child_id);
CREATE INDEX IF NOT EXISTS idx_answers_risk    ON answers(risk_level);
