import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, verifyPassword, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
    const body = await request.json();
    const { action, name, email, password, role, agencyId } = body;

    if (action === 'register') {
        if (!name || !email || !password || !agencyId) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
        }

        const parsedAgencyId = parseInt(agencyId);
        const existing = await prisma.user.findUnique({
            where: { email_agencyId: { email, agencyId: parsedAgencyId } }
        });

        if (existing) {
            return NextResponse.json({ error: 'Email already registered in this agency' }, { status: 400 });
        }

        const hashed = await hashPassword(password);
        const user = await prisma.user.create({
            data: {
                agencyId: parsedAgencyId,
                name,
                email,
                password: hashed,
                role: role || 'CUSTOMER',
            },
            include: { agency: true }
        });

        const token = generateToken({
            id: user.id,
            agencyId: user.agencyId,
            themeColor: user.agency.themeColor,
            name: user.name,
            email: user.email,
            role: user.role
        });

        const response = NextResponse.json({
            user: { id: user.id, agencyId: user.agencyId, name: user.name, email: user.email, role: user.role },
        });
        response.cookies.set('auth-token', token, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        });

        return response;
    }

    if (action === 'login') {
        if (!email || !password || !agencyId) {
            return NextResponse.json({ error: 'Agency, email and password are required' }, { status: 400 });
        }

        const parsedAgencyId = parseInt(agencyId);
        const user = await prisma.user.findUnique({
            where: { email_agencyId: { email, agencyId: parsedAgencyId } },
            include: { agency: true }
        });

        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const valid = await verifyPassword(password, user.password);
        if (!valid) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const token = generateToken({
            id: user.id,
            agencyId: user.agencyId,
            themeColor: user.agency.themeColor,
            name: user.name,
            email: user.email,
            role: user.role
        });

        const response = NextResponse.json({
            user: { id: user.id, agencyId: user.agencyId, name: user.name, email: user.email, role: user.role },
        });
        response.cookies.set('auth-token', token, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        });

        return response;
    }

    if (action === 'logout') {
        const response = NextResponse.json({ success: true });
        response.cookies.delete('auth-token');
        return response;
    }

    if (action === 'me') {
        const token = request.cookies.get('auth-token')?.value;
        if (!token) {
            return NextResponse.json({ user: null });
        }
        const { verifyToken } = await import('@/lib/auth');
        const authUser = verifyToken(token);
        return NextResponse.json({ user: authUser });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
