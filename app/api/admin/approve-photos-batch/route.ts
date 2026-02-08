import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stagingIds, placeId } = body;

    if (!stagingIds || !Array.isArray(stagingIds) || stagingIds.length === 0) {
      return NextResponse.json({ error: 'stagingIds required' }, { status: 400 });
    }

    // Get staging photos
    const { data: stagingPhotos, error: fetchError } = await supabase
      .from('photos_staging')
      .select('*')
      .in('staging_id', stagingIds);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!stagingPhotos || stagingPhotos.length === 0) {
      return NextResponse.json({ error: 'No photos found' }, { status: 404 });
    }

    // Prepare photos for place_photos table
    const approvedPhotos = stagingPhotos.map((photo: any) => ({
      place_id: placeId || photo.place_id,
      image_url: photo.image_url,
      image_thumbnail_url: photo.image_url, // TODO: Generate thumbnail
      original_width: photo.original_width,
      original_height: photo.original_height,
      aspect_ratio: photo.aspect_ratio,
      source_platform: photo.source_platform,
      source_account: photo.source_account,
      source_post_url: photo.source_post_url,
      collection_date: photo.collection_date,
      shooting_guide: {
        location: {},
        time: {},
        composition: {},
        camera_settings: {},
      }, // Default empty guide
      display_order: 0,
      is_primary: false,
    }));

    // Insert into place_photos
    const { error: insertError } = await supabase
      .from('place_photos')
      .insert(approvedPhotos);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Update staging status to approved
    const { error: updateError } = await supabase
      .from('photos_staging')
      .update({ review_status: 'approved' })
      .in('staging_id', stagingIds);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      approved: stagingPhotos.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
