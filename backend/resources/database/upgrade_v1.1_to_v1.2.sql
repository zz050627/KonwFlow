-- 升级脚本：v1.1 到 v1.2
-- 添加关键词功能支持

-- 1. 为 t_knowledge_chunk 表添加 keywords 字段
ALTER TABLE t_knowledge_chunk ADD COLUMN IF NOT EXISTS keywords VARCHAR(512);
COMMENT ON COLUMN t_knowledge_chunk.keywords IS '关键词（逗号分隔）';

-- 2. 创建文件元数据表
CREATE TABLE IF NOT EXISTS t_file_metadata (
    id VARCHAR(20) PRIMARY KEY,
    kb_id VARCHAR(20) NOT NULL,
    file_name VARCHAR(256) NOT NULL,
    file_type VARCHAR(16) NOT NULL,
    file_size BIGINT,
    file_url VARCHAR(1024) NOT NULL,
    category VARCHAR(32),
    keywords VARCHAR(512),
    upload_by VARCHAR(20),
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted SMALLINT DEFAULT 0
);

COMMENT ON TABLE t_file_metadata IS '文件元数据表';
COMMENT ON COLUMN t_file_metadata.id IS '主键ID';
COMMENT ON COLUMN t_file_metadata.kb_id IS '知识库ID';
COMMENT ON COLUMN t_file_metadata.file_name IS '文件名';
COMMENT ON COLUMN t_file_metadata.file_type IS '文件类型（MIME type）';
COMMENT ON COLUMN t_file_metadata.file_size IS '文件大小（字节）';
COMMENT ON COLUMN t_file_metadata.file_url IS '文件存储URL（S3）';
COMMENT ON COLUMN t_file_metadata.category IS '文件分类：document/code/image/other';
COMMENT ON COLUMN t_file_metadata.keywords IS '关键词（逗号分隔）';
COMMENT ON COLUMN t_file_metadata.upload_by IS '上传人';
COMMENT ON COLUMN t_file_metadata.create_time IS '创建时间';
COMMENT ON COLUMN t_file_metadata.update_time IS '更新时间';
COMMENT ON COLUMN t_file_metadata.deleted IS '逻辑删除标志';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_file_kb_id ON t_file_metadata(kb_id);
CREATE INDEX IF NOT EXISTS idx_file_category ON t_file_metadata(category);
CREATE INDEX IF NOT EXISTS idx_file_deleted ON t_file_metadata(deleted);

-- 3. 创建同义词映射表
CREATE TABLE IF NOT EXISTS t_synonym_mapping (
    id VARCHAR(20) PRIMARY KEY,
    source_word VARCHAR(64) NOT NULL,
    target_words VARCHAR(256) NOT NULL,
    enabled SMALLINT DEFAULT 1,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted SMALLINT DEFAULT 0
);

COMMENT ON TABLE t_synonym_mapping IS '同义词映射表';
COMMENT ON COLUMN t_synonym_mapping.id IS '主键ID';
COMMENT ON COLUMN t_synonym_mapping.source_word IS '源词';
COMMENT ON COLUMN t_synonym_mapping.target_words IS '目标词列表（JSON数组）';
COMMENT ON COLUMN t_synonym_mapping.enabled IS '启用标志';
COMMENT ON COLUMN t_synonym_mapping.create_time IS '创建时间';
COMMENT ON COLUMN t_synonym_mapping.update_time IS '更新时间';
COMMENT ON COLUMN t_synonym_mapping.deleted IS '逻辑删除标志';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_synonym_source ON t_synonym_mapping(source_word);
CREATE INDEX IF NOT EXISTS idx_synonym_enabled ON t_synonym_mapping(enabled);
