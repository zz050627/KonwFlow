-- 知识库优化 - 版本管理表
-- 执行时间: 2026-04-08

-- 创建知识库版本表
CREATE TABLE IF NOT EXISTS t_knowledge_version (
    id            VARCHAR(64)  NOT NULL PRIMARY KEY,
    kb_id         VARCHAR(64)  NOT NULL,
    version_tag   VARCHAR(64)  NOT NULL,
    description   VARCHAR(512),
    snapshot_path TEXT,
    doc_count     BIGINT       DEFAULT 0,
    chunk_count   BIGINT       DEFAULT 0,
    created_by    VARCHAR(64),
    create_time   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    deleted       SMALLINT     DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_knowledge_version_kb_id ON t_knowledge_version(kb_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_version_tag ON t_knowledge_version(version_tag);
COMMENT ON TABLE t_knowledge_version IS '知识库版本表';
COMMENT ON COLUMN t_knowledge_version.id IS '版本ID';
COMMENT ON COLUMN t_knowledge_version.kb_id IS '知识库ID';
COMMENT ON COLUMN t_knowledge_version.version_tag IS '版本标签';
COMMENT ON COLUMN t_knowledge_version.description IS '版本描述';
COMMENT ON COLUMN t_knowledge_version.snapshot_path IS '快照数据(JSON)';
COMMENT ON COLUMN t_knowledge_version.doc_count IS '文档数量';
COMMENT ON COLUMN t_knowledge_version.chunk_count IS '分块数量';
COMMENT ON COLUMN t_knowledge_version.created_by IS '创建人';
COMMENT ON COLUMN t_knowledge_version.create_time IS '创建时间';
COMMENT ON COLUMN t_knowledge_version.deleted IS '删除标识';

-- 为知识库分块表添加索引
CREATE INDEX IF NOT EXISTS idx_chunk_index ON t_knowledge_chunk(chunk_index);
