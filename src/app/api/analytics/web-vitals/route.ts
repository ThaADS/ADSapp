import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, value, rating, delta, id, url, userAgent } = body

    // Log to Supabase for analysis (web_vitals table will be created via migration)
    const supabase = await createClient()

    // Type assertion for now - web_vitals table will be added via migration
    const { error } = await (supabase as any).from('web_vitals').insert({
      metric_name: name,
      metric_value: value,
      rating,
      delta,
      metric_id: id,
      page_url: url,
      user_agent: userAgent,
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.error('Failed to log web vitals:', error)
      // Don't fail the request if logging fails
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Web vitals API error:', error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
