-- Migration: default_model_gpt_5_mini
-- Update Conversation.modelId default to openai/gpt-5-mini

ALTER TABLE "Conversation" ALTER COLUMN "modelId" SET DEFAULT 'openai/gpt-5-mini';
