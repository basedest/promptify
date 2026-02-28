-- Migration: add_model_i18n_keys
-- Replace name, descriptionShort, descriptionLong with i18n keys for frontend translation.

-- 1. Add new key columns
ALTER TABLE "AiModel" ADD COLUMN "nameKey" TEXT;
ALTER TABLE "AiModel" ADD COLUMN "descriptionShortKey" TEXT;
ALTER TABLE "AiModel" ADD COLUMN "descriptionLongKey" TEXT;

-- 2. Populate keys: models.items.{id-with-dashes}.name (id: openai/gpt-5.2 -> openai-gpt-5-2)
UPDATE "AiModel" SET
  "nameKey" = 'models.items.' || REPLACE(REPLACE("id", '/', '-'), '.', '-') || '.name',
  "descriptionShortKey" = CASE
    WHEN "descriptionShort" IS NOT NULL THEN 'models.items.' || REPLACE(REPLACE("id", '/', '-'), '.', '-') || '.descriptionShort'
    ELSE NULL
  END,
  "descriptionLongKey" = CASE
    WHEN "descriptionLong" IS NOT NULL THEN 'models.items.' || REPLACE(REPLACE("id", '/', '-'), '.', '-') || '.descriptionLong'
    ELSE NULL
  END;

-- 3. Drop old columns
ALTER TABLE "AiModel" DROP COLUMN "name";
ALTER TABLE "AiModel" DROP COLUMN "descriptionShort";
ALTER TABLE "AiModel" DROP COLUMN "descriptionLong";

-- 4. Make nameKey required
ALTER TABLE "AiModel" ALTER COLUMN "nameKey" SET NOT NULL;
