
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { comparePassword } from '@/lib/auth';
import { login } from '@/lib/session';

export const dynamic = 'force-dynamic';

// 🔒 Rate Limiting: max 5 percobaan per 15 menit per IP
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: NextRequest): string {
    return (
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') ||
        '127.0.0.1'
    );
}

export async function POST(req: NextRequest) {
    try {
        // Rate limit check
        const ip = getClientIp(req);
        const now = Date.now();
        let record = loginAttempts.get(ip);

        if (record && now > record.resetAt) {
            loginAttempts.delete(ip);
            record = undefined;
        }

        if (record && record.count >= 5) {
            const waitSecs = Math.ceil((record.resetAt - now) / 1000);
            return NextResponse.json(
                { error: `Terlalu banyak percobaan login. Coba lagi setelah ${waitSecs} detik.` },
                { status: 429 }
            );
        }

        const body = await req.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            // Increment attempt even on "user not found" to prevent user enumeration
            const r = loginAttempts.get(ip) || { count: 0, resetAt: now + 15 * 60 * 1000 };
            r.count++;
            loginAttempts.set(ip, r);
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        if (!user.passwordHash) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const isValid = await comparePassword(password, user.passwordHash);
        if (!isValid) {
            const r = loginAttempts.get(ip) || { count: 0, resetAt: now + 15 * 60 * 1000 };
            r.count++;
            loginAttempts.set(ip, r);
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Login sukses → reset counter
        loginAttempts.delete(ip);

        await login({
            id: user.id,
            email: user.email,
            role: user.role,
            isVerified: !!user.emailVerifiedAt,
        });

        return NextResponse.json({
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                emailVerifiedAt: user.emailVerifiedAt,
            },
        });
    } catch (error) {
        console.error('Login Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
