import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    return NextResponse.json({
      cookieCount: allCookies.length,
      cookies: allCookies.map(c => ({ name: c.name, hasValue: !!c.value })),
      supabaseCookies: allCookies.filter(c => c.name.includes('supabase')),
      requestHeaders: {
        cookie: request.headers.get('cookie'),
        authorization: request.headers.get('authorization'),
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: String(error),
      message: 'Failed to read cookies'
    }, { status: 500 });
  }
}
