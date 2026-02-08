-- Add filtering metadata columns to photos_staging table

ALTER TABLE photos_staging
ADD COLUMN IF NOT EXISTS filter_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS filter_reason TEXT,
ADD COLUMN IF NOT EXISTS is_filtered BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS perceptual_hash TEXT;

-- Add index for filtered photos
CREATE INDEX IF NOT EXISTS idx_staging_filtered ON photos_staging(is_filtered, filter_score DESC);

-- Add index for perceptual hash (for duplicate detection)
CREATE INDEX IF NOT EXISTS idx_staging_hash ON photos_staging(perceptual_hash) WHERE perceptual_hash IS NOT NULL;

COMMENT ON COLUMN photos_staging.filter_score IS 'Quality score from 0-100 (higher is better)';
COMMENT ON COLUMN photos_staging.filter_reason IS 'Reason why photo was filtered out';
COMMENT ON COLUMN photos_staging.is_filtered IS 'Whether this photo was filtered out';
COMMENT ON COLUMN photos_staging.perceptual_hash IS 'Perceptual hash for duplicate detection';
