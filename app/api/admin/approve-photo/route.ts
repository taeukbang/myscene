import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stagingId } = body;

    if (!stagingId) {
      return NextResponse.json({ error: 'Missing stagingId' }, { status: 400 });
    }

    // Get the staging photo
    const { data: stagingPhoto, error: fetchError } = await supabaseAdmin
      .from('photos_staging')
      .select('*, places(*)')
      .eq('staging_id', stagingId)
      .single();

    if (fetchError || !stagingPhoto) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // If matched to a place, create a place_photo entry
    if (stagingPhoto.matched_place_id) {
      const { error: insertError } = await supabaseAdmin
        .from('place_photos')
        .insert({
          place_id: stagingPhoto.matched_place_id,
          image_url: stagingPhoto.image_url,
          image_thumbnail_url: stagingPhoto.image_url,
          source_platform: stagingPhoto.source_platform,
          source_account: stagingPhoto.source_account,
          source_post_url: stagingPhoto.source_post_url,
          shooting_guide: {
            location: { specific_spot: 'TBD' },
            time: { optimal_hours: ['14:00-16:00'], lighting: '자연광' },
            composition: { angle: '정면', include_person: true },
          },
          time_tags: ['afternoon'],
          composition_tags: ['portrait'],
          mood_tags: ['aesthetic'],
          is_active: true,
          moderation_status: 'approved',
          display_priority: 50,
        });

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    // Update staging status to approved
    const { error: updateError } = await supabaseAdmin
      .from('photos_staging')
      .update({
        review_status: 'approved',
        reviewed_at: new Date().toISOString(),
      })
      .eq('staging_id', stagingId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
