-- ============================================
-- PLACES MODULE - CORE DATABASE SCHEMA
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CORE TABLES
-- ============================================

-- Places table: Core location information
CREATE TABLE places (
    place_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    name_kr VARCHAR(200) NOT NULL,
    name_en VARCHAR(200),

    -- Location
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    address TEXT,
    address_kr TEXT,

    -- Categorization
    city_code VARCHAR(3) NOT NULL DEFAULT 'TYO',
    region VARCHAR(100),  -- 'Shibuya', 'Harajuku', etc.
    category VARCHAR(50) NOT NULL CHECK (category IN ('cafe', 'viewspot')),

    -- Metadata
    description TEXT,
    description_kr TEXT,
    opening_hours JSONB,  -- {mon: "9:00-18:00", ...}
    average_wait_time INTEGER,  -- minutes
    price_range INTEGER CHECK (price_range BETWEEN 1 AND 4),  -- 1-4 scale

    -- Engagement metrics
    view_count INTEGER DEFAULT 0,
    save_count INTEGER DEFAULT 0,
    visit_count INTEGER DEFAULT 0,

    -- Status
    is_active BOOLEAN DEFAULT true,
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'flagged')),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Place photos table: Photo metadata and shooting guides
CREATE TABLE place_photos (
    photo_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    place_id UUID NOT NULL REFERENCES places(place_id) ON DELETE CASCADE,

    -- Image data
    image_url TEXT NOT NULL,
    image_thumbnail_url TEXT,
    original_width INTEGER,
    original_height INTEGER,
    aspect_ratio DECIMAL(5,2),

    -- Source attribution (for copyright compliance)
    source_platform VARCHAR(50),  -- 'instagram', 'youtube', etc.
    source_account VARCHAR(200),
    source_post_url TEXT,
    collection_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Shooting guide (JSONB for flexibility)
    shooting_guide JSONB NOT NULL,
    /*
    Structure:
    {
      "location": {
        "specific_spot": "창가 2번 테이블",
        "floor": "2층",
        "direction": "동쪽 창가"
      },
      "time": {
        "optimal_hours": ["14:00-16:00"],
        "day_of_week": ["weekday"],
        "season": ["spring", "summer"],
        "lighting": "자연광"
      },
      "composition": {
        "angle": "정면",
        "distance": "근접",
        "include_person": true,
        "props": ["커피", "디저트"]
      },
      "camera_settings": {
        "recommended": "포트레이트 모드",
        "tips": "배경 흐림 효과 활성화"
      }
    }
    */

    -- Failure conditions
    failure_conditions JSONB,
    /*
    Structure:
    {
      "wait_time": "주말 오후 2시간 대기",
      "lighting": "오전 역광 주의",
      "seasonal": "여름 휴가 기간 혼잡",
      "weather": "흐린 날 사진 어두움"
    }
    */

    -- Tags for filtering
    time_tags TEXT[],  -- ['morning', 'afternoon', 'golden_hour', 'night']
    composition_tags TEXT[],  -- ['portrait', 'landscape', 'food', 'interior']
    mood_tags TEXT[],  -- ['aesthetic', 'cozy', 'minimal', 'vibrant']
    season_tags TEXT[],  -- ['spring', 'summer', 'fall', 'winter', 'all']

    -- Engagement metrics
    view_count INTEGER DEFAULT 0,
    save_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    success_report_count INTEGER DEFAULT 0,  -- Users who successfully recreated

    -- Priority/ranking
    display_priority INTEGER DEFAULT 0,  -- Higher = shown first
    is_featured BOOLEAN DEFAULT false,

    -- Status
    is_active BOOLEAN DEFAULT true,
    moderation_status VARCHAR(20) DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User itineraries: Save places to trip schedules
CREATE TABLE user_itineraries (
    itinerary_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,  -- NULL for anonymous sessions
    session_id VARCHAR(100),  -- For anonymous users

    -- Trip metadata
    trip_name VARCHAR(200),
    city_code VARCHAR(3) NOT NULL DEFAULT 'TYO',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Itinerary items: Individual place saves
CREATE TABLE itinerary_items (
    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    itinerary_id UUID NOT NULL REFERENCES user_itineraries(itinerary_id) ON DELETE CASCADE,
    place_id UUID NOT NULL REFERENCES places(place_id) ON DELETE CASCADE,
    photo_id UUID REFERENCES place_photos(photo_id) ON DELETE SET NULL,

    -- Scheduling
    planned_date DATE,
    planned_time TIME,
    visit_duration_minutes INTEGER,  -- Estimated visit duration

    -- Status
    visit_status VARCHAR(20) DEFAULT 'planned' CHECK (visit_status IN ('planned', 'visited', 'skipped')),
    visited_at TIMESTAMP WITH TIME ZONE,

    -- User notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User interactions: Track engagement for analytics
CREATE TABLE photo_interactions (
    interaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,  -- NULL for anonymous users
    session_id VARCHAR(100),  -- For anonymous tracking
    photo_id UUID NOT NULL REFERENCES place_photos(photo_id) ON DELETE CASCADE,
    place_id UUID NOT NULL REFERENCES places(place_id) ON DELETE CASCADE,

    -- Interaction type
    interaction_type VARCHAR(50) NOT NULL CHECK (interaction_type IN ('view', 'save', 'share', 'visit_report')),

    -- Context
    user_agent TEXT,

    -- Location context (for recommendation engine)
    user_lat DECIMAL(10, 8),
    user_lng DECIMAL(11, 8),
    distance_to_place_km DECIMAL(10, 2),

    -- Time context
    local_time TIME,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),  -- 0-6 (Sunday-Saturday)

    -- Metadata
    metadata JSONB,  -- Additional interaction data

    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recommendation context: Store user context for personalization
CREATE TABLE user_contexts (
    context_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,  -- NULL for anonymous users
    session_id VARCHAR(100) NOT NULL,

    -- Location
    current_lat DECIMAL(10, 8),
    current_lng DECIMAL(11, 8),
    city_code VARCHAR(3),

    -- Time context
    local_time TIME,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
    is_weekend BOOLEAN,

    -- User state
    trip_days_remaining INTEGER,
    current_activity VARCHAR(50),  -- 'exploring', 'eating', 'commuting'

    -- Preferences (collected over time)
    preferred_categories TEXT[],
    preferred_moods TEXT[],

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- ============================================
-- STAGING TABLE FOR SCRAPING
-- ============================================

CREATE TABLE photos_staging (
    staging_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Scraped data
    image_url TEXT NOT NULL,
    source_platform VARCHAR(50) NOT NULL,
    source_account VARCHAR(200),
    source_post_url TEXT,

    -- Location data
    location_name TEXT,
    location_tags TEXT[],
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- Metadata
    caption TEXT,
    hashtags TEXT[],
    engagement_likes INTEGER,
    engagement_comments INTEGER,

    -- Matching
    matched_place_id UUID REFERENCES places(place_id),
    match_confidence DECIMAL(3, 2),  -- 0.00 to 1.00

    -- Review status
    review_status VARCHAR(20) DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected')),
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE places IS 'Core location information for cafes and view spots';
COMMENT ON TABLE place_photos IS 'Photo metadata with detailed shooting guides';
COMMENT ON TABLE user_itineraries IS 'User trip itineraries';
COMMENT ON TABLE itinerary_items IS 'Individual places saved to itineraries';
COMMENT ON TABLE photo_interactions IS 'Analytics tracking for user interactions';
COMMENT ON TABLE user_contexts IS 'User context for personalized recommendations';
COMMENT ON TABLE photos_staging IS 'Staging table for scraped photos awaiting review';

-- ============================================
-- INITIAL DATA: Add Tokyo to destinations
-- ============================================

-- Note: This assumes a destinations table exists from BeNomad
-- If not, create it here
CREATE TABLE IF NOT EXISTS destinations (
    code VARCHAR(3) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    name_kr VARCHAR(200),
    country VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO destinations (code, name, name_kr, country)
VALUES ('TYO', 'Tokyo', '도쿄', 'Japan')
ON CONFLICT (code) DO NOTHING;
