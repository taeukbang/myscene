import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const placeId = searchParams.get('placeId');

    if (!placeId) {
      return NextResponse.json({ error: 'placeId required' }, { status: 400 });
    }

    // Get staging photos for this place
    const { data, error } = await supabase
      .from('photos_staging')
      .select('*')
      .eq('place_name', placeId)
      .eq('review_status', 'pending')
      .order('collection_date', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`Found ${data?.length || 0} photos for ${placeId}`);
    return NextResponse.json({ photos: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
