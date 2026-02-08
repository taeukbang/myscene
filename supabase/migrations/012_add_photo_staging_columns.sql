-- Add missing columns to photos_staging table for photo crawler

ALTER TABLE photos_staging
ADD COLUMN IF NOT EXISTS place_id UUID REFERENCES places(place_id),
ADD COLUMN IF NOT EXISTS place_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS original_width INTEGER,
ADD COLUMN IF NOT EXISTS original_height INTEGER,
ADD COLUMN IF NOT EXISTS aspect_ratio DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS collection_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add index for place queries
CREATE INDEX IF NOT EXISTS idx_staging_place_id ON photos_staging(place_id);
CREATE INDEX IF NOT EXISTS idx_staging_place_name ON photos_staging(place_name);

COMMENT ON COLUMN photos_staging.place_id IS 'Reference to places table';
COMMENT ON COLUMN photos_staging.place_name IS 'Place name for photos not yet matched';
COMMENT ON COLUMN photos_staging.original_width IS 'Original image width in pixels';
COMMENT ON COLUMN photos_staging.original_height IS 'Original image height in pixels';
COMMENT ON COLUMN photos_staging.aspect_ratio IS 'Width divided by height';
COMMENT ON COLUMN photos_staging.collection_date IS 'When the photo was collected';
