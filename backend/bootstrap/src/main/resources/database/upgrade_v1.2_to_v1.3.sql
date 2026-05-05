-- 对话优化 - 分层记忆表
-- 执行时间: 2026-04-08

-- 创建用户画像表
CREATE TABLE IF NOT EXISTS t_user_profile (
    id           VARCHAR(64)  NOT NULL PRIMARY KEY,
    user_id      VARCHAR(64)  NOT NULL,
    preferences  TEXT,
    expertise    TEXT,
    common_topics TEXT,
    create_time  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    update_time  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    deleted      SMALLINT     DEFAULT 0,
    CONSTRAINT uk_user_profile_user_id UNIQUE (user_id)
);
COMMENT ON TABLE t_user_profile IS '用户画像表';
COMMENT ON COLUMN t_user_profile.id IS '主键ID';
COMMENT ON COLUMN t_user_profile.user_id IS '用户ID';
COMMENT ON COLUMN t_user_profile.preferences IS '用户偏好';
COMMENT ON COLUMN t_user_profile.expertise IS '专业领域';
COMMENT ON COLUMN t_user_profile.common_topics IS '常见话题';
COMMENT ON COLUMN t_user_profile.create_time IS '创建时间';
COMMENT ON COLUMN t_user_profile.update_time IS '更新时间';
COMMENT ON COLUMN t_user_profile.deleted IS '删除标识';
