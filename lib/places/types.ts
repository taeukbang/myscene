// ============================================
// PLACES MODULE - TYPE DEFINITIONS
// ============================================

export interface Place {
  place_id: string;
  name: string;
  name_kr: string;
  name_en?: string;
  lat: number;
  lng: number;
  address?: string;
  address_kr?: string;
  city_code: string;
  region?: string;
  category: 'cafe' | 'viewspot';
  description?: string;
  description_kr?: string;
  opening_hours?: Record<string, string>;
  average_wait_time?: number;
  price_range?: number;
  view_count: number;
  save_count: number;
  visit_count: number;
  is_active: boolean;
  verification_status: 'pending' | 'verified' | 'flagged';
  created_at: string;
  updated_at: string;
}

export interface ShootingGuide {
  location?: {
    specific_spot?: string;
    floor?: string;
    direction?: string;
  };
  time?: {
    optimal_hours?: string[];
    day_of_week?: string[];
    season?: string[];
    lighting?: string;
  };
  composition?: {
    angle?: string;
    distance?: string;
    include_person?: boolean;
    props?: string[];
  };
  camera_settings?: {
    recommended?: string;
    tips?: string;
  };
}

export interface FailureConditions {
  wait_time?: string;
  lighting?: string;
  seasonal?: string;
  weather?: string;
}

export interface PlacePhoto {
  photo_id: string;
  place_id: string;
  image_url: string;
  image_thumbnail_url?: string;
  original_width?: number;
  original_height?: number;
  aspect_ratio?: number;
  source_platform?: string;
  source_account?: string;
  source_post_url?: string;
  collection_date: string;
  shooting_guide: ShootingGuide;
  failure_conditions?: FailureConditions;
  time_tags?: string[];
  composition_tags?: string[];
  mood_tags?: string[];
  season_tags?: string[];
  view_count: number;
  save_count: number;
  share_count: number;
  success_report_count: number;
  display_priority: number;
  is_featured: boolean;
  is_active: boolean;
  moderation_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface PhotoCard {
  photoId: string;
  placeId: string;
  place: {
    name: string;
    nameKr: string;
    category: 'cafe' | 'viewspot';
    region: string;
    distance?: number; // km
    lat: number;
    lng: number;
  };
  image: {
    url: string;
    thumbnailUrl: string;
    aspectRatio: number;
  };
  tags: {
    time: string[];
    mood: string[];
    composition: string[];
  };
  engagement: {
    saveCount: number;
    viewCount: number;
    successRate?: number;
  };
  quickGuide: {
    optimalTime: string;
    spotHint: string;
    mainWarning?: string;
  };
  matchScore?: number;
}

export interface UserItinerary {
  itinerary_id: string;
  user_id?: string;
  session_id?: string;
  trip_name?: string;
  city_code: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ItineraryItem {
  item_id: string;
  itinerary_id: string;
  place_id: string;
  photo_id?: string;
  planned_date?: string;
  planned_time?: string;
  visit_duration_minutes?: number;
  visit_status: 'planned' | 'visited' | 'skipped';
  visited_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PhotoInteraction {
  interaction_id: string;
  user_id?: string;
  session_id?: string;
  photo_id: string;
  place_id: string;
  interaction_type: 'view' | 'save' | 'share' | 'visit_report';
  user_lat?: number;
  user_lng?: number;
  distance_to_place_km?: number;
  local_time?: string;
  day_of_week?: number;
  created_at: string;
}

export interface RecommendationContext {
  location?: { lat: number; lng: number };
  time?: Date;
  dayOfWeek?: number;
  cityCode: string;
  sessionId: string;
  userId?: string;
  preferences?: {
    categories?: string[];
    moods?: string[];
  };
}

export interface MapPin {
  placeId: string;
  photoId: string;
  name: string;
  category: string;
  location: {
    lat: number;
    lng: number;
  };
  thumbnailUrl: string;
  saveCount: number;
}

export interface PhotosStaging {
  staging_id: string;
  image_url: string;
  source_platform: string;
  source_account?: string;
  source_post_url?: string;
  location_name?: string;
  location_tags?: string[];
  latitude?: number;
  longitude?: number;
  caption?: string;
  hashtags?: string[];
  engagement_likes?: number;
  engagement_comments?: number;
  matched_place_id?: string;
  match_confidence?: number;
  review_status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  created_at: string;
}
