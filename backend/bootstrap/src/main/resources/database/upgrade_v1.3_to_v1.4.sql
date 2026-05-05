-- 对话优化 - 意图学习表
-- 执行时间: 2026-04-08

-- 创建意图反馈表
CREATE TABLE IF NOT EXISTS t_intent_feedback (
    id              VARCHAR(64)  NOT NULL PRIMARY KEY,
    query           TEXT         NOT NULL,
    predicted_intent VARCHAR(128),
    actual_intent   VARCHAR(128),
    confidence      DOUBLE PRECISION,
    user_id         VARCHAR(64),
    create_time     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    deleted         SMALLINT     DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_intent_feedback_confidence ON t_intent_feedback(confidence);
CREATE INDEX IF NOT EXISTS idx_intent_feedback_user_id ON t_intent_feedback(user_id);
COMMENT ON TABLE t_intent_feedback IS '意图反馈表';
COMMENT ON COLUMN t_intent_feedback.id IS '主键ID';
COMMENT ON COLUMN t_intent_feedback.query IS '查询文本';
COMMENT ON COLUMN t_intent_feedback.predicted_intent IS '预测意图';
COMMENT ON COLUMN t_intent_feedback.actual_intent IS '实际意图';
COMMENT ON COLUMN t_intent_feedback.confidence IS '置信度';
COMMENT ON COLUMN t_intent_feedback.user_id IS '用户ID';
COMMENT ON COLUMN t_intent_feedback.create_time IS '创建时间';
COMMENT ON COLUMN t_intent_feedback.deleted IS '删除标识';
