import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser, hashPassword } from '@/lib/auth';

// GET all users (admin only) or filtered by role
export async function GET(request: NextRequest) {
    const user = await getAuthUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    if (user.role !== 'ADMIN') {
        if (user.role === 'EMPLOYEE' && role === 'CUSTOMER') {
            // allowed: Employees can fetch customers
        } else {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
    }

    const where: Record<string, unknown> = { agencyId: user.agencyId };
    if (role) where.role = role;
    const users = await prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true, role: true, phone: true, address: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(users);
}

// POST: create or update user (admin only)
export async function POST(request: NextRequest) {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, email, password, role, phone, address } = body;

    if (!name || !email) {
        return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    if (id) {
        // SECURITY PATCH: Verify the user belongs to the admin's agency before updating
        const existing = await prisma.user.findFirst({ where: { id, agencyId: authUser.agencyId } });
        if (!existing) return NextResponse.json({ error: 'User not found or unauthorized' }, { status: 404 });

        const data: Record<string, unknown> = { name, email, role, phone, address };
        if (password) data.password = await hashPassword(password);
        const user = await prisma.user.update({ where: { id }, data });
        return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role });
    } else {
        if (!password) return NextResponse.json({ error: 'Password is required' }, { status: 400 });
        const hashed = await hashPassword(password);
        const user = await prisma.user.create({
            data: { agencyId: authUser.agencyId, name, email, password: hashed, role: role || 'CUSTOMER', phone, address },
        });
        return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role });
    }
}

// DELETE a user (admin only)
export async function DELETE(request: NextRequest) {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const parsedId = parseInt(id);

    // SECURITY PATCH: Ensure the deleted user belongs to the caller's agency
    await prisma.user.deleteMany({
        where: { id: parsedId, agencyId: authUser.agencyId }
    });
    return NextResponse.json({ success: true });
}
