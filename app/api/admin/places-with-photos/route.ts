import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Get places with photo counts from staging
    const { data, error } = await supabase.rpc('get_places_with_photo_counts');

    if (error) {
      // Fallback: manual query if RPC doesn't exist yet
      const { data: stagingData, error: stagingError } = await supabase
        .from('photos_staging')
        .select('place_id, place_name')
        .eq('review_status', 'pending');

      if (stagingError) {
        return NextResponse.json({ error: stagingError.message }, { status: 500 });
      }

      // Group by place
      const placesMap = new Map();
      stagingData?.forEach((photo: any) => {
        const key = photo.place_id || photo.place_name;
        if (!placesMap.has(key)) {
          placesMap.set(key, {
            place_id: photo.place_id || photo.place_name,
            name: photo.place_name,
            category: 'cafe',
            photo_count: 0,
          });
        }
        placesMap.get(key).photo_count++;
      });

      const places = Array.from(placesMap.values());
      return NextResponse.json({ places });
    }

    return NextResponse.json({ places: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
