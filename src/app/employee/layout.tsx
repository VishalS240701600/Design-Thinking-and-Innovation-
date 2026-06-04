'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
}

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'me' }) })
            .then(res => res.json())
            .then(data => {
                if (!data || !data.user || data.user.role !== 'EMPLOYEE') { router.push('/'); return; }
                setUser(data.user);
            })
            .catch(() => router.push('/'));
    }, [router]);

    const handleLogout = async () => {
        await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) });
        router.push('/');
    };

    if (!user) return (
        <div className="min-h-screen bg-surface flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-on-surface-variant text-sm">Loading...</p>
            </div>
        </div>
    );

    const navLinks = [
        { href: '/employee',          label: 'Dashboard',       icon: 'dashboard' },
        { href: '/employee/orders',   label: 'Enter Order',     icon: 'shopping_cart_checkout' },
        { href: '/employee/payments', label: 'Record Payment',  icon: 'payments' },
    ];

    const isActive = (href: string) => pathname === href;
    const initials = user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

    return (
        <div className="flex bg-surface-container-low min-h-screen overflow-hidden">
            {/* Sidebar */}
            <aside className="fixed h-full w-[260px] left-0 top-0 bg-surface-container-lowest border-r border-outline-variant shadow-sm flex flex-col py-lg px-md z-50">
                {/* Brand */}
                <div className="mb-xxl flex flex-col gap-xs">
                    <div className="flex items-center gap-sm">
                        <div className="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center text-on-primary-container">
                            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
                        </div>
                        <h1 className="font-headline text-[22px] font-bold text-primary">DistributeIQ</h1>
                    </div>
                    <div className="mt-1">
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-1 rounded-full border border-amber-200">
                            EMPLOYEE PORTAL
                        </span>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 flex flex-col gap-1">
                    {navLinks.map(link => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={isActive(link.href)
                                ? 'flex items-center gap-md p-md rounded-xl text-primary font-bold border-r-2 border-primary bg-surface-container transition-colors'
                                : 'flex items-center gap-md p-md rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-colors'
                            }
                        >
                            <span className="material-symbols-outlined" style={isActive(link.href) ? { fontVariationSettings: "'FILL' 1" } : {}}>{link.icon}</span>
                            <span className="text-label-lg font-label">{link.label}</span>
                        </Link>
                    ))}
                </nav>

                {/* Footer */}
                <div className="mt-auto border-t border-outline-variant pt-lg flex flex-col gap-xs">
                    <Link href="/employee/settings" className="flex items-center gap-md p-md rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-colors">
                        <span className="material-symbols-outlined">settings</span>
                        <span className="text-label-lg font-label">Settings</span>
                    </Link>
                    <div className="flex items-center gap-md p-md">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {initials}
                        </div>
                        <div className="flex flex-col flex-1 overflow-hidden">
                            <span className="text-label-lg font-label font-semibold text-on-surface truncate">{user.name}</span>
                            <span className="text-[11px] text-on-surface-variant">Logistics Executive</span>
                        </div>
                        <button onClick={handleLogout} className="text-on-surface-variant hover:text-error transition-colors" title="Logout">
                            <span className="material-symbols-outlined text-[20px]">logout</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main */}
            <main className="ml-[260px] flex-1 overflow-y-auto min-h-screen">
                {children}
            </main>
        </div>
    );
}
