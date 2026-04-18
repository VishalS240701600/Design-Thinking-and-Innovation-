import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Lightweight ping to keep Supabase warm and prevent cold starts
export async function GET() {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
    } catch (error) {
        return NextResponse.json({ status: 'error', error: String(error) }, { status: 500 });
    }
}
