-- Migration: add_benchmarks_new_models
-- Depends on: 20260301115900_add_new_enum_values (enum values must be committed first)

-- 1. Archive old models
UPDATE "AiModel" SET "archived" = true WHERE "id" IN (
  'openai/gpt-4o-mini','openai/gpt-4o',
  'anthropic/claude-sonnet-4','anthropic/claude-3.5-haiku',
  'google/gemini-2.0-flash-001','meta-llama/llama-3.3-70b-instruct',
  'deepseek/deepseek-r1','mistralai/mistral-large'
);

-- 2. Insert 18 new AiModel rows (costs in micro-USD)
INSERT INTO "AiModel" ("id","name","developer","provider","descriptionShort","contextWindow",
  "inputCostPer1M","outputCostPer1M","tier","sortOrder","enabled","archived","createdAt","updatedAt") VALUES
  ('openai/gpt-5.2',              'GPT-5.2',           'openai',    'openrouter', 'Most capable OpenAI flagship',        128000, 10000000,  30000000, 'premium',  1, true, false, NOW(), NOW()),
  ('anthropic/claude-opus-4-6',   'Claude Opus 4.6',   'anthropic', 'openrouter', 'Most intelligent Anthropic model',    200000, 15000000,  75000000, 'premium',  2, true, false, NOW(), NOW()),
  ('anthropic/claude-sonnet-4-6', 'Claude Sonnet 4.6', 'anthropic', 'openrouter', 'Best balance of speed and capability',200000,  3000000,  15000000, 'standard', 3, true, false, NOW(), NOW()),
  ('openai/gpt-5-mini',           'GPT-5 Mini',        'openai',    'openrouter', 'Fast and capable everyday model',     128000,  1500000,   6000000, 'standard', 4, true, false, NOW(), NOW()),
  ('openai/gpt-oss-120b',         'GPT OSS 120B',      'openai',    'openrouter', 'OpenAI open-source 120B model',       128000,   800000,   2400000, 'standard', 5, true, false, NOW(), NOW()),
  ('google/gemini-3.1-pro',       'Gemini 3.1 Pro',    'google',    'openrouter', 'Advanced multimodal with 1M context', 1000000, 2000000,   8000000, 'standard', 6, true, false, NOW(), NOW()),
  ('deepseek/deepseek-v3-2',      'DeepSeek v3.2',     'deepseek',  'openrouter', 'Strong reasoning and coding MoE',     128000,   500000,   1500000, 'standard', 7, true, false, NOW(), NOW()),
  ('x-ai/grok-4-1-fast',          'Grok 4.1 Fast',     'xai',       'openrouter', 'Fast xAI model with web knowledge',   128000,  2000000,   6000000, 'standard', 8, true, false, NOW(), NOW()),
  ('qwen/qwen3-235b',             'Qwen 3 235B',       'qwen',      'openrouter', 'Alibaba flagship MoE model',          128000,  1000000,   3000000, 'standard', 9, true, false, NOW(), NOW()),
  ('moonshotai/kimi-k2.5',        'Kimi K2.5',         'moonshot',  'openrouter', 'Long-context agent model',            256000,  1500000,   5000000, 'standard',10, true, false, NOW(), NOW()),
  ('anthropic/claude-haiku-4-5',  'Claude Haiku 4.5',  'anthropic', 'openrouter', 'Fast and compact for quick responses',200000,   800000,   4000000, 'free',    11, true, false, NOW(), NOW()),
  ('openai/gpt-5-nano',           'GPT-5 Nano',        'openai',    'openrouter', 'Smallest GPT-5 for high-volume tasks',128000,   150000,    600000, 'free',    12, true, false, NOW(), NOW()),
  ('openai/gpt-oss-20b',          'GPT OSS 20B',       'openai',    'openrouter', 'Compact open-source model',           128000,   200000,    600000, 'free',    13, true, false, NOW(), NOW()),
  ('google/gemini-3-flash',       'Gemini 3 Flash',    'google',    'openrouter', 'Lightning-fast with 1M context',     1000000,   100000,    400000, 'free',    14, true, false, NOW(), NOW()),
  ('meta-llama/llama-4-maverick', 'Llama 4 Maverick',  'meta',      'openrouter', 'Efficient Llama 4 MoE variant',       256000,   400000,   1600000, 'free',    15, true, false, NOW(), NOW()),
  ('meta-llama/llama-4-scout',    'Llama 4 Scout',     'meta',      'openrouter', 'Lightweight Llama 4 for inference',   256000,   150000,    600000, 'free',    16, true, false, NOW(), NOW()),
  ('zhipuai/glm-5',               'GLM 5',             'zhipuai',   'openrouter', 'ZhipuAI multilingual powerhouse',     128000,  1000000,   3000000, 'standard',17, true, false, NOW(), NOW()),
  ('minimax/m2.5',                'MiniMax M2.5',      'minimax',   'openrouter', 'MiniMax long-context model',         1000000,   800000,   2500000, 'standard',18, true, false, NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;

-- 3. Seed capabilities for new models
INSERT INTO "_AiModelToModelCapability" ("A","B") VALUES
  ('openai/gpt-5.2','reasoning'),('openai/gpt-5.2','vision'),('openai/gpt-5.2','tools'),('openai/gpt-5.2','code'),
  ('anthropic/claude-opus-4-6','reasoning'),('anthropic/claude-opus-4-6','vision'),('anthropic/claude-opus-4-6','tools'),('anthropic/claude-opus-4-6','code'),
  ('anthropic/claude-sonnet-4-6','reasoning'),('anthropic/claude-sonnet-4-6','vision'),('anthropic/claude-sonnet-4-6','tools'),('anthropic/claude-sonnet-4-6','code'),
  ('openai/gpt-5-mini','vision'),('openai/gpt-5-mini','tools'),('openai/gpt-5-mini','code'),
  ('openai/gpt-oss-120b','reasoning'),('openai/gpt-oss-120b','code'),
  ('google/gemini-3.1-pro','reasoning'),('google/gemini-3.1-pro','vision'),('google/gemini-3.1-pro','tools'),('google/gemini-3.1-pro','code'),('google/gemini-3.1-pro','long-context'),
  ('deepseek/deepseek-v3-2','reasoning'),('deepseek/deepseek-v3-2','code'),('deepseek/deepseek-v3-2','long-context'),
  ('x-ai/grok-4-1-fast','reasoning'),('x-ai/grok-4-1-fast','tools'),('x-ai/grok-4-1-fast','code'),
  ('qwen/qwen3-235b','reasoning'),('qwen/qwen3-235b','tools'),('qwen/qwen3-235b','code'),
  ('moonshotai/kimi-k2.5','reasoning'),('moonshotai/kimi-k2.5','vision'),('moonshotai/kimi-k2.5','code'),('moonshotai/kimi-k2.5','long-context'),
  ('anthropic/claude-haiku-4-5','vision'),('anthropic/claude-haiku-4-5','tools'),('anthropic/claude-haiku-4-5','code'),
  ('openai/gpt-5-nano','tools'),('openai/gpt-5-nano','code'),
  ('openai/gpt-oss-20b','code'),
  ('google/gemini-3-flash','vision'),('google/gemini-3-flash','tools'),('google/gemini-3-flash','code'),('google/gemini-3-flash','long-context'),
  ('meta-llama/llama-4-maverick','reasoning'),('meta-llama/llama-4-maverick','code'),
  ('meta-llama/llama-4-scout','code'),
  ('zhipuai/glm-5','reasoning'),('zhipuai/glm-5','tools'),('zhipuai/glm-5','code'),
  ('minimax/m2.5','vision'),('minimax/m2.5','tools'),('minimax/m2.5','code'),('minimax/m2.5','long-context')
ON CONFLICT DO NOTHING;

-- 4. Create BenchmarkGroup
CREATE TABLE IF NOT EXISTS "BenchmarkGroup" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  CONSTRAINT "BenchmarkGroup_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "BenchmarkGroup_name_key" ON "BenchmarkGroup"("name");

INSERT INTO "BenchmarkGroup" ("id","name","sortOrder") VALUES
  ('bg_intelligence','Intelligence',1),
  ('bg_coding','Coding',2),
  ('bg_math','Math',3)
ON CONFLICT ("id") DO NOTHING;

-- 5. Create Benchmark
CREATE TABLE IF NOT EXISTS "Benchmark" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  CONSTRAINT "Benchmark_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Benchmark_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "BenchmarkGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Benchmark_name_key" ON "Benchmark"("name");

INSERT INTO "Benchmark" ("id","name","groupId") VALUES
  ('b_mmlu_pro','MMLU-Pro','bg_intelligence'),
  ('b_gpqa','GPQA Diamond','bg_intelligence'),
  ('b_humaneval','HumanEval','bg_coding'),
  ('b_swebench','SWE-bench Verified','bg_coding'),
  ('b_math500','MATH-500','bg_math'),
  ('b_aime24','AIME 2024','bg_math')
ON CONFLICT ("id") DO NOTHING;

-- 6. Create ModelBenchmark
CREATE TABLE IF NOT EXISTS "ModelBenchmark" (
  "id" TEXT NOT NULL,
  "modelId" TEXT NOT NULL,
  "benchmarkId" TEXT NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "version" TEXT,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ModelBenchmark_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ModelBenchmark_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AiModel"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ModelBenchmark_benchmarkId_fkey" FOREIGN KEY ("benchmarkId") REFERENCES "Benchmark"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "ModelBenchmark_modelId_benchmarkId_version_key" ON "ModelBenchmark"("modelId","benchmarkId","version");
CREATE INDEX IF NOT EXISTS "ModelBenchmark_modelId_idx" ON "ModelBenchmark"("modelId");
CREATE INDEX IF NOT EXISTS "ModelBenchmark_benchmarkId_idx" ON "ModelBenchmark"("benchmarkId");

-- 7. Seed benchmark scores (approximate published values, 2026-03-01)
INSERT INTO "ModelBenchmark" ("id","modelId","benchmarkId","score","version") VALUES
  -- MMLU-Pro
  (gen_random_uuid()::text,'openai/gpt-5.2','b_mmlu_pro',83.1,'2026-02'),
  (gen_random_uuid()::text,'anthropic/claude-opus-4-6','b_mmlu_pro',87.4,'2026-02'),
  (gen_random_uuid()::text,'anthropic/claude-sonnet-4-6','b_mmlu_pro',80.2,'2026-02'),
  (gen_random_uuid()::text,'openai/gpt-5-mini','b_mmlu_pro',72.5,'2026-02'),
  (gen_random_uuid()::text,'openai/gpt-oss-120b','b_mmlu_pro',69.3,'2026-02'),
  (gen_random_uuid()::text,'google/gemini-3.1-pro','b_mmlu_pro',82.0,'2026-02'),
  (gen_random_uuid()::text,'deepseek/deepseek-v3-2','b_mmlu_pro',78.4,'2026-02'),
  (gen_random_uuid()::text,'x-ai/grok-4-1-fast','b_mmlu_pro',76.1,'2026-02'),
  (gen_random_uuid()::text,'qwen/qwen3-235b','b_mmlu_pro',79.2,'2026-02'),
  (gen_random_uuid()::text,'moonshotai/kimi-k2.5','b_mmlu_pro',74.6,'2026-02'),
  (gen_random_uuid()::text,'anthropic/claude-haiku-4-5','b_mmlu_pro',65.3,'2026-02'),
  (gen_random_uuid()::text,'openai/gpt-5-nano','b_mmlu_pro',65.0,'2026-02'),
  (gen_random_uuid()::text,'openai/gpt-oss-20b','b_mmlu_pro',58.2,'2026-02'),
  (gen_random_uuid()::text,'google/gemini-3-flash','b_mmlu_pro',70.1,'2026-02'),
  (gen_random_uuid()::text,'meta-llama/llama-4-maverick','b_mmlu_pro',75.3,'2026-02'),
  (gen_random_uuid()::text,'meta-llama/llama-4-scout','b_mmlu_pro',66.4,'2026-02'),
  (gen_random_uuid()::text,'zhipuai/glm-5','b_mmlu_pro',71.0,'2026-02'),
  (gen_random_uuid()::text,'minimax/m2.5','b_mmlu_pro',69.5,'2026-02'),
  -- GPQA Diamond
  (gen_random_uuid()::text,'openai/gpt-5.2','b_gpqa',75.2,'2026-02'),
  (gen_random_uuid()::text,'anthropic/claude-opus-4-6','b_gpqa',77.8,'2026-02'),
  (gen_random_uuid()::text,'anthropic/claude-sonnet-4-6','b_gpqa',68.4,'2026-02'),
  (gen_random_uuid()::text,'openai/gpt-5-mini','b_gpqa',58.0,'2026-02'),
  (gen_random_uuid()::text,'openai/gpt-oss-120b','b_gpqa',51.3,'2026-02'),
  (gen_random_uuid()::text,'google/gemini-3.1-pro','b_gpqa',73.1,'2026-02'),
  (gen_random_uuid()::text,'deepseek/deepseek-v3-2','b_gpqa',68.2,'2026-02'),
  (gen_random_uuid()::text,'x-ai/grok-4-1-fast','b_gpqa',65.4,'2026-02'),
  (gen_random_uuid()::text,'qwen/qwen3-235b','b_gpqa',66.1,'2026-02'),
  (gen_random_uuid()::text,'moonshotai/kimi-k2.5','b_gpqa',62.7,'2026-02'),
  (gen_random_uuid()::text,'anthropic/claude-haiku-4-5','b_gpqa',46.0,'2026-02'),
  (gen_random_uuid()::text,'google/gemini-3-flash','b_gpqa',55.3,'2026-02'),
  (gen_random_uuid()::text,'meta-llama/llama-4-maverick','b_gpqa',60.2,'2026-02'),
  -- HumanEval
  (gen_random_uuid()::text,'openai/gpt-5.2','b_humaneval',94.5,'2026-02'),
  (gen_random_uuid()::text,'anthropic/claude-opus-4-6','b_humaneval',96.3,'2026-02'),
  (gen_random_uuid()::text,'anthropic/claude-sonnet-4-6','b_humaneval',93.1,'2026-02'),
  (gen_random_uuid()::text,'openai/gpt-5-mini','b_humaneval',91.4,'2026-02'),
  (gen_random_uuid()::text,'openai/gpt-oss-120b','b_humaneval',88.2,'2026-02'),
  (gen_random_uuid()::text,'google/gemini-3.1-pro','b_humaneval',92.0,'2026-02'),
  (gen_random_uuid()::text,'deepseek/deepseek-v3-2','b_humaneval',94.1,'2026-02'),
  (gen_random_uuid()::text,'x-ai/grok-4-1-fast','b_humaneval',91.2,'2026-02'),
  (gen_random_uuid()::text,'qwen/qwen3-235b','b_humaneval',93.4,'2026-02'),
  (gen_random_uuid()::text,'moonshotai/kimi-k2.5','b_humaneval',90.1,'2026-02'),
  (gen_random_uuid()::text,'anthropic/claude-haiku-4-5','b_humaneval',90.3,'2026-02'),
  (gen_random_uuid()::text,'openai/gpt-5-nano','b_humaneval',87.1,'2026-02'),
  (gen_random_uuid()::text,'openai/gpt-oss-20b','b_humaneval',82.4,'2026-02'),
  (gen_random_uuid()::text,'google/gemini-3-flash','b_humaneval',85.2,'2026-02'),
  (gen_random_uuid()::text,'meta-llama/llama-4-maverick','b_humaneval',87.6,'2026-02'),
  (gen_random_uuid()::text,'meta-llama/llama-4-scout','b_humaneval',81.3,'2026-02'),
  (gen_random_uuid()::text,'zhipuai/glm-5','b_humaneval',87.0,'2026-02'),
  (gen_random_uuid()::text,'minimax/m2.5','b_humaneval',85.4,'2026-02'),
  -- SWE-bench Verified (only top models)
  (gen_random_uuid()::text,'openai/gpt-5.2','b_swebench',55.3,'2026-02'),
  (gen_random_uuid()::text,'anthropic/claude-opus-4-6','b_swebench',61.2,'2026-02'),
  (gen_random_uuid()::text,'anthropic/claude-sonnet-4-6','b_swebench',52.4,'2026-02'),
  (gen_random_uuid()::text,'deepseek/deepseek-v3-2','b_swebench',48.1,'2026-02'),
  (gen_random_uuid()::text,'openai/gpt-5-mini','b_swebench',41.2,'2026-02'),
  -- MATH-500
  (gen_random_uuid()::text,'openai/gpt-5.2','b_math500',86.4,'2026-02'),
  (gen_random_uuid()::text,'anthropic/claude-opus-4-6','b_math500',89.1,'2026-02'),
  (gen_random_uuid()::text,'anthropic/claude-sonnet-4-6','b_math500',82.3,'2026-02'),
  (gen_random_uuid()::text,'openai/gpt-5-mini','b_math500',78.1,'2026-02'),
  (gen_random_uuid()::text,'openai/gpt-oss-120b','b_math500',76.4,'2026-02'),
  (gen_random_uuid()::text,'google/gemini-3.1-pro','b_math500',85.2,'2026-02'),
  (gen_random_uuid()::text,'deepseek/deepseek-v3-2','b_math500',90.1,'2026-02'),
  (gen_random_uuid()::text,'x-ai/grok-4-1-fast','b_math500',83.4,'2026-02'),
  (gen_random_uuid()::text,'qwen/qwen3-235b','b_math500',85.6,'2026-02'),
  (gen_random_uuid()::text,'moonshotai/kimi-k2.5','b_math500',81.2,'2026-02'),
  (gen_random_uuid()::text,'anthropic/claude-haiku-4-5','b_math500',74.3,'2026-02'),
  (gen_random_uuid()::text,'openai/gpt-5-nano','b_math500',72.1,'2026-02'),
  (gen_random_uuid()::text,'openai/gpt-oss-20b','b_math500',65.3,'2026-02'),
  (gen_random_uuid()::text,'google/gemini-3-flash','b_math500',77.4,'2026-02'),
  (gen_random_uuid()::text,'meta-llama/llama-4-maverick','b_math500',78.2,'2026-02'),
  (gen_random_uuid()::text,'meta-llama/llama-4-scout','b_math500',70.1,'2026-02'),
  (gen_random_uuid()::text,'zhipuai/glm-5','b_math500',79.3,'2026-02'),
  (gen_random_uuid()::text,'minimax/m2.5','b_math500',76.2,'2026-02'),
  -- AIME 2024 (hardest, only reasoning-focused models)
  (gen_random_uuid()::text,'openai/gpt-5.2','b_aime24',63.3,'2026-02'),
  (gen_random_uuid()::text,'anthropic/claude-opus-4-6','b_aime24',58.4,'2026-02'),
  (gen_random_uuid()::text,'deepseek/deepseek-v3-2','b_aime24',71.2,'2026-02'),
  (gen_random_uuid()::text,'qwen/qwen3-235b','b_aime24',67.5,'2026-02'),
  (gen_random_uuid()::text,'google/gemini-3.1-pro','b_aime24',55.1,'2026-02')
ON CONFLICT ("modelId","benchmarkId","version") DO NOTHING;
