-- Migration: add_new_enum_values
-- ALTER TYPE ADD VALUE must be committed before new values can be used in subsequent migrations.
ALTER TYPE "ModelDeveloper" ADD VALUE IF NOT EXISTS 'xai';
ALTER TYPE "ModelDeveloper" ADD VALUE IF NOT EXISTS 'qwen';
ALTER TYPE "ModelDeveloper" ADD VALUE IF NOT EXISTS 'moonshot';
ALTER TYPE "ModelDeveloper" ADD VALUE IF NOT EXISTS 'zhipuai';
ALTER TYPE "ModelDeveloper" ADD VALUE IF NOT EXISTS 'minimax';

ALTER TYPE "ModelProvider" ADD VALUE IF NOT EXISTS 'xai';
ALTER TYPE "ModelProvider" ADD VALUE IF NOT EXISTS 'qwen';
ALTER TYPE "ModelProvider" ADD VALUE IF NOT EXISTS 'moonshot';
ALTER TYPE "ModelProvider" ADD VALUE IF NOT EXISTS 'zhipuai';
ALTER TYPE "ModelProvider" ADD VALUE IF NOT EXISTS 'minimax';
