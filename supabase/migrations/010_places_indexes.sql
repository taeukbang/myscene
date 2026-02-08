-- ============================================
-- PLACES MODULE - PERFORMANCE INDEXES
-- ============================================

-- ============================================
-- PLACES TABLE INDEXES
-- ============================================

-- City and category lookup (most common query)
CREATE INDEX idx_places_city_category
ON places(city_code, category)
WHERE is_active = true;

-- Geospatial index for proximity queries
-- Simple lat/lng index (works without PostGIS)
CREATE INDEX idx_places_lat ON places(lat);
CREATE INDEX idx_places_lng ON places(lng);

-- Region lookup
CREATE INDEX idx_places_region
ON places(city_code, region)
WHERE is_active = true;

-- Engagement sorting
CREATE INDEX idx_places_engagement
ON places(save_count DESC, view_count DESC)
WHERE is_active = true;

-- Verification status
CREATE INDEX idx_places_verification
ON places(verification_status)
WHERE is_active = true;

-- ============================================
-- PLACE_PHOTOS TABLE INDEXES
-- ============================================

-- Place lookup (most common join)
CREATE INDEX idx_photos_place
ON place_photos(place_id)
WHERE is_active = true;

-- Featured photos (homepage, recommendations)
CREATE INDEX idx_photos_featured
ON place_photos(display_priority DESC, is_featured DESC, save_count DESC)
WHERE is_active = true AND moderation_status = 'approved';

-- Time-based filtering (GIN index for array containment)
CREATE INDEX idx_photos_time_tags
ON place_photos USING GIN(time_tags);

-- Composition filtering
CREATE INDEX idx_photos_composition_tags
ON place_photos USING GIN(composition_tags);

-- Mood filtering
CREATE INDEX idx_photos_mood_tags
ON place_photos USING GIN(mood_tags);

-- Season filtering
CREATE INDEX idx_photos_season_tags
ON place_photos USING GIN(season_tags);

-- Moderation queue
CREATE INDEX idx_photos_moderation
ON place_photos(moderation_status, created_at DESC)
WHERE is_active = true;

-- Source tracking
CREATE INDEX idx_photos_source
ON place_photos(source_platform, source_account);

-- ============================================
-- USER_ITINERARIES TABLE INDEXES
-- ============================================

-- User lookup
CREATE INDEX idx_itinerary_user
ON user_itineraries(user_id)
WHERE is_active = true;

-- Session lookup (for anonymous users)
CREATE INDEX idx_itinerary_session
ON user_itineraries(session_id)
WHERE is_active = true;

-- Date range queries
CREATE INDEX idx_itinerary_dates
ON user_itineraries(city_code, start_date, end_date)
WHERE is_active = true;

-- ============================================
-- ITINERARY_ITEMS TABLE INDEXES
-- ============================================

-- Itinerary lookup (most common query)
CREATE INDEX idx_itinerary_items_itinerary
ON itinerary_items(itinerary_id, planned_date);

-- Place lookup (for place detail pages)
CREATE INDEX idx_itinerary_items_place
ON itinerary_items(place_id);

-- Photo lookup
CREATE INDEX idx_itinerary_items_photo
ON itinerary_items(photo_id)
WHERE photo_id IS NOT NULL;

-- Status filtering
CREATE INDEX idx_itinerary_items_status
ON itinerary_items(visit_status, planned_date);

-- ============================================
-- PHOTO_INTERACTIONS TABLE INDEXES
-- ============================================

-- Photo analytics (most common query)
CREATE INDEX idx_interactions_photo
ON photo_interactions(photo_id, interaction_type, created_at DESC);

-- Place analytics
CREATE INDEX idx_interactions_place
ON photo_interactions(place_id, interaction_type, created_at DESC);

-- User tracking
CREATE INDEX idx_interactions_user
ON photo_interactions(user_id, created_at DESC)
WHERE user_id IS NOT NULL;

-- Session tracking
CREATE INDEX idx_interactions_session
ON photo_interactions(session_id, created_at DESC);

-- Time-based analytics
CREATE INDEX idx_interactions_time
ON photo_interactions(created_at DESC);

-- Context analysis
CREATE INDEX idx_interactions_context
ON photo_interactions(day_of_week, local_time);

-- ============================================
-- USER_CONTEXTS TABLE INDEXES
-- ============================================

-- Session lookup
CREATE INDEX idx_contexts_session
ON user_contexts(session_id, expires_at DESC);

-- User lookup
CREATE INDEX idx_contexts_user
ON user_contexts(user_id, expires_at DESC)
WHERE user_id IS NOT NULL;

-- Expiry cleanup (simple index for sorting/filtering)
CREATE INDEX idx_contexts_expires
ON user_contexts(expires_at);

-- Location-based
CREATE INDEX idx_contexts_location
ON user_contexts(city_code, current_lat, current_lng);

-- ============================================
-- PHOTOS_STAGING TABLE INDEXES
-- ============================================

-- Review queue (most common admin query)
CREATE INDEX idx_staging_review
ON photos_staging(review_status, created_at DESC);

-- Place matching
CREATE INDEX idx_staging_matched_place
ON photos_staging(matched_place_id)
WHERE matched_place_id IS NOT NULL;

-- Source tracking
CREATE INDEX idx_staging_source
ON photos_staging(source_platform, created_at DESC);

-- Confidence-based review priority
CREATE INDEX idx_staging_confidence
ON photos_staging(match_confidence DESC, review_status)
WHERE review_status = 'pending';

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON INDEX idx_places_city_category IS 'Primary lookup for place queries by city and category';
COMMENT ON INDEX idx_places_location IS 'Geospatial index for proximity-based recommendations';
COMMENT ON INDEX idx_photos_time_tags IS 'Time-based filtering for contextual recommendations';
COMMENT ON INDEX idx_interactions_photo IS 'Analytics queries for photo engagement metrics';
