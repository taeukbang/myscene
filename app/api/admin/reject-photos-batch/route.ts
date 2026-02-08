import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stagingIds } = body;

    if (!stagingIds || !Array.isArray(stagingIds) || stagingIds.length === 0) {
      return NextResponse.json({ error: 'stagingIds required' }, { status: 400 });
    }

    // Update staging status to rejected
    const { error } = await supabase
      .from('photos_staging')
      .update({ review_status: 'rejected' })
      .in('staging_id', stagingIds);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      rejected: stagingIds.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
