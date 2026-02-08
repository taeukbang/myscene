-- ============================================
-- PLACES MODULE - DATABASE FUNCTIONS
-- ============================================

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Calculate distance between two points using Haversine formula
CREATE OR REPLACE FUNCTION calculate_distance_km(
    lat1 DECIMAL,
    lng1 DECIMAL,
    lat2 DECIMAL,
    lng2 DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
    R CONSTANT DECIMAL := 6371; -- Earth radius in km
    dLat DECIMAL;
    dLng DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    dLat := radians(lat2 - lat1);
    dLng := radians(lng2 - lng1);

    a := sin(dLat/2) * sin(dLat/2) +
         cos(radians(lat1)) * cos(radians(lat2)) *
         sin(dLng/2) * sin(dLng/2);

    c := 2 * atan2(sqrt(a), sqrt(1-a));

    RETURN ROUND((R * c)::NUMERIC, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- RECOMMENDATION ENGINE
-- ============================================

-- Get context-based photo recommendations
CREATE OR REPLACE FUNCTION get_context_photos(
    p_city_code VARCHAR(3),
    p_user_lat DECIMAL DEFAULT NULL,
    p_user_lng DECIMAL DEFAULT NULL,
    p_current_time TIME DEFAULT NULL,
    p_max_distance_km DECIMAL DEFAULT 5,
    p_limit INTEGER DEFAULT 2
)
RETURNS TABLE (
    photo_id UUID,
    place_id UUID,
    place_name VARCHAR(200),
    place_category VARCHAR(50),
    place_region VARCHAR(100),
    place_lat DECIMAL,
    place_lng DECIMAL,
    distance_km DECIMAL,
    image_url TEXT,
    image_thumbnail_url TEXT,
    time_tags TEXT[],
    composition_tags TEXT[],
    mood_tags TEXT[],
    save_count INTEGER,
    view_count INTEGER,
    shooting_guide JSONB,
    failure_conditions JSONB,
    match_score INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pp.photo_id,
        p.place_id,
        p.name_kr,
        p.category,
        p.region,
        p.lat,
        p.lng,
        CASE
            WHEN p_user_lat IS NOT NULL AND p_user_lng IS NOT NULL
            THEN calculate_distance_km(p_user_lat, p_user_lng, p.lat, p.lng)
            ELSE NULL
        END as distance_km,
        pp.image_url,
        pp.image_thumbnail_url,
        pp.time_tags,
        pp.composition_tags,
        pp.mood_tags,
        pp.save_count,
        pp.view_count,
        pp.shooting_guide,
        pp.failure_conditions,
        (
            -- Base score
            100 +
            -- Priority boost
            pp.display_priority * 10 +
            -- Featured boost
            CASE WHEN pp.is_featured THEN 50 ELSE 0 END +
            -- Engagement boost (capped at 100)
            LEAST(pp.save_count, 100) +
            -- Distance penalty (if location provided)
            CASE
                WHEN p_user_lat IS NOT NULL AND p_user_lng IS NOT NULL
                THEN -CAST(calculate_distance_km(p_user_lat, p_user_lng, p.lat, p.lng) * 5 AS INTEGER)
                ELSE 0
            END +
            -- Time matching boost (if current time provided)
            CASE
                -- Golden hour (17:00-19:00)
                WHEN p_current_time IS NOT NULL AND
                     EXTRACT(HOUR FROM p_current_time) BETWEEN 17 AND 19 AND
                     'golden_hour' = ANY(pp.time_tags)
                THEN 40
                -- Afternoon (14:00-16:00)
                WHEN p_current_time IS NOT NULL AND
                     EXTRACT(HOUR FROM p_current_time) BETWEEN 14 AND 16 AND
                     'afternoon' = ANY(pp.time_tags)
                THEN 30
                -- Morning (9:00-11:00)
                WHEN p_current_time IS NOT NULL AND
                     EXTRACT(HOUR FROM p_current_time) BETWEEN 9 AND 11 AND
                     'morning' = ANY(pp.time_tags)
                THEN 25
                -- Night (19:00+)
                WHEN p_current_time IS NOT NULL AND
                     EXTRACT(HOUR FROM p_current_time) >= 19 AND
                     'night' = ANY(pp.time_tags)
                THEN 20
                ELSE 0
            END
        )::INTEGER as match_score
    FROM place_photos pp
    JOIN places p ON pp.place_id = p.place_id
    WHERE
        p.city_code = p_city_code
        AND p.is_active = true
        AND pp.is_active = true
        AND pp.moderation_status = 'approved'
        -- Distance filter (if location provided)
        AND (
            p_user_lat IS NULL OR
            p_user_lng IS NULL OR
            calculate_distance_km(p_user_lat, p_user_lng, p.lat, p.lng) <= p_max_distance_km
        )
    ORDER BY match_score DESC, pp.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- METRICS UPDATE FUNCTIONS
-- ============================================

-- Update photo and place metrics based on interactions
CREATE OR REPLACE FUNCTION update_photo_metrics()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.interaction_type = 'view' THEN
        UPDATE place_photos
        SET view_count = view_count + 1
        WHERE photo_id = NEW.photo_id;

        UPDATE places
        SET view_count = view_count + 1
        WHERE place_id = NEW.place_id;

    ELSIF NEW.interaction_type = 'save' THEN
        UPDATE place_photos
        SET save_count = save_count + 1
        WHERE photo_id = NEW.photo_id;

        UPDATE places
        SET save_count = save_count + 1
        WHERE place_id = NEW.place_id;

    ELSIF NEW.interaction_type = 'share' THEN
        UPDATE place_photos
        SET share_count = share_count + 1
        WHERE photo_id = NEW.photo_id;

    ELSIF NEW.interaction_type = 'visit_report' THEN
        UPDATE place_photos
        SET success_report_count = success_report_count + 1
        WHERE photo_id = NEW.photo_id;

        UPDATE places
        SET visit_count = visit_count + 1
        WHERE place_id = NEW.place_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update metrics
CREATE TRIGGER trigger_update_photo_metrics
    AFTER INSERT ON photo_interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_photo_metrics();

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update_updated_at trigger to relevant tables
CREATE TRIGGER trigger_places_updated_at
    BEFORE UPDATE ON places
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_photos_updated_at
    BEFORE UPDATE ON place_photos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_itineraries_updated_at
    BEFORE UPDATE ON user_itineraries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_itinerary_items_updated_at
    BEFORE UPDATE ON itinerary_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- CLEANUP FUNCTIONS
-- ============================================

-- Clean expired user contexts
CREATE OR REPLACE FUNCTION clean_expired_contexts()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_contexts WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ANALYTICS FUNCTIONS
-- ============================================

-- Get top photos by engagement
CREATE OR REPLACE FUNCTION get_top_photos(
    p_city_code VARCHAR(3),
    p_metric VARCHAR(20) DEFAULT 'save_count',
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    photo_id UUID,
    place_name VARCHAR(200),
    metric_value INTEGER,
    view_count INTEGER,
    save_count INTEGER,
    success_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pp.photo_id,
        p.name_kr,
        CASE
            WHEN p_metric = 'save_count' THEN pp.save_count
            WHEN p_metric = 'view_count' THEN pp.view_count
            WHEN p_metric = 'success_report_count' THEN pp.success_report_count
            ELSE pp.save_count
        END as metric_value,
        pp.view_count,
        pp.save_count,
        CASE
            WHEN pp.view_count > 0
            THEN ROUND((pp.success_report_count::DECIMAL / pp.view_count * 100)::NUMERIC, 2)
            ELSE 0
        END as success_rate
    FROM place_photos pp
    JOIN places p ON pp.place_id = p.place_id
    WHERE
        p.city_code = p_city_code
        AND pp.is_active = true
        AND pp.moderation_status = 'approved'
    ORDER BY metric_value DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Get nearby places
CREATE OR REPLACE FUNCTION get_nearby_places(
    p_place_id UUID,
    p_max_distance_km DECIMAL DEFAULT 1,
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    place_id UUID,
    place_name VARCHAR(200),
    category VARCHAR(50),
    distance_km DECIMAL,
    featured_photo_url TEXT
) AS $$
DECLARE
    v_lat DECIMAL;
    v_lng DECIMAL;
BEGIN
    -- Get the location of the reference place
    SELECT lat, lng INTO v_lat, v_lng
    FROM places
    WHERE place_id = p_place_id;

    IF v_lat IS NULL THEN
        RAISE EXCEPTION 'Place not found: %', p_place_id;
    END IF;

    RETURN QUERY
    SELECT
        p.place_id,
        p.name_kr,
        p.category,
        calculate_distance_km(v_lat, v_lng, p.lat, p.lng) as distance_km,
        (
            SELECT pp.image_thumbnail_url
            FROM place_photos pp
            WHERE pp.place_id = p.place_id
                AND pp.is_active = true
                AND pp.moderation_status = 'approved'
            ORDER BY pp.display_priority DESC, pp.save_count DESC
            LIMIT 1
        ) as featured_photo_url
    FROM places p
    WHERE
        p.place_id != p_place_id
        AND p.is_active = true
        AND calculate_distance_km(v_lat, v_lng, p.lat, p.lng) <= p_max_distance_km
    ORDER BY distance_km ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION calculate_distance_km IS 'Calculate distance between two coordinates using Haversine formula';
COMMENT ON FUNCTION get_context_photos IS 'Core recommendation engine - returns photos based on user context (location, time)';
COMMENT ON FUNCTION update_photo_metrics IS 'Automatically update engagement metrics when interactions are recorded';
COMMENT ON FUNCTION clean_expired_contexts IS 'Remove expired user context records (run periodically)';
COMMENT ON FUNCTION get_top_photos IS 'Analytics function to get top performing photos by metric';
COMMENT ON FUNCTION get_nearby_places IS 'Find places within a specified distance from a given place';
