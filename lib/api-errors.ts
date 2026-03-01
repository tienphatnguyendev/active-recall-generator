import { NextResponse } from 'next/server';

export function apiError(error: string, status: number = 500, details?: any) {
  return NextResponse.json(
    { error, ...(details ? { details } : {}) },
    { status }
  );
}
