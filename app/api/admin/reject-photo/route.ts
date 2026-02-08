import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stagingId } = body;

    if (!stagingId) {
      return NextResponse.json({ error: 'Missing stagingId' }, { status: 400 });
    }

    // Update staging status to rejected
    const { error } = await supabaseAdmin
      .from('photos_staging')
      .update({
        review_status: 'rejected',
        reviewed_at: new Date().toISOString(),
        rejection_reason: 'Manual review rejection',
      })
      .eq('staging_id', stagingId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
