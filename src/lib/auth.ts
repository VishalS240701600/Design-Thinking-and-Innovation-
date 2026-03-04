import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'fmcg-distribution-secret-key-2026';

export interface AuthUser {
    id: number;
    agencyId: number;
    themeColor: string;
    name: string;
    email: string;
    role: string;
}

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export function generateToken(user: AuthUser): string {
    return jwt.sign(
        { id: user.id, agencyId: user.agencyId, themeColor: user.themeColor, name: user.name, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

export function verifyToken(token: string): AuthUser | null {
    try {
        return jwt.verify(token, JWT_SECRET) as AuthUser;
    } catch {
        return null;
    }
}

export async function getAuthUser(): Promise<AuthUser | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return null;
    return verifyToken(token);
}
