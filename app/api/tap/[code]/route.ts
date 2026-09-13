import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  if (!code) return NextResponse.redirect(new URL('/card-disabled', request.url));
  return NextResponse.redirect(new URL(`/t/${code.trim().toUpperCase()}`, request.url));
}
