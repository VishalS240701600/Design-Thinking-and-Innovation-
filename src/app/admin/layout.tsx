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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'me' }) })
            .then(res => res.json())
            .then(data => {
                if (!data || !data.user || data.user.role !== 'ADMIN') { router.push('/'); return; }
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
                <p className="text-on-surface-variant font-label-md">Loading...</p>
            </div>
        </div>
    );

    const navLinks = [
        { href: '/admin',           label: 'Dashboard',  icon: 'dashboard' },
        { href: '/admin/products',  label: 'Products',   icon: 'inventory_2' },
        { href: '/admin/employees', label: 'Employees',  icon: 'badge' },
        { href: '/admin/customers', label: 'Customers',  icon: 'groups' },
        { href: '/admin/orders',    label: 'Orders',     icon: 'local_shipping' },
        { href: '/admin/payments',  label: 'Payments',   icon: 'payments' },
        { href: '/admin/settings',  label: 'Settings',   icon: 'settings' },
    ];

    const isActive = (href: string) => pathname === href;
    const initials = user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

    return (
        <div className="flex h-screen w-full bg-surface overflow-hidden">
            {/* Sidebar */}
            <aside className="fixed h-full w-[260px] left-0 top-0 bg-surface-container-lowest border-r border-outline-variant flex flex-col py-lg px-md z-50">
                {/* Brand */}
                <div className="flex items-center gap-md px-sm mb-xxl">
                    <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
                    </div>
                    <div>
                        <h1 className="font-headline text-[20px] font-bold text-primary leading-tight">DistributeIQ</h1>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-primary/10 text-primary">ADMIN</span>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 flex flex-col gap-1">
                    {navLinks.map(link => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={isActive(link.href)
                                ? 'nav-active-item flex items-center gap-md px-md py-sm rounded-lg text-primary font-bold border-l-4 border-primary transition-all'
                                : 'flex items-center gap-md px-md py-sm rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors group'
                            }
                        >
                            <span
                                className="material-symbols-outlined"
                                style={isActive(link.href) ? { fontVariationSettings: "'FILL' 1" } : {}}
                            >{link.icon}</span>
                            <span className="text-label-lg font-label">{link.label}</span>
                        </Link>
                    ))}
                </nav>

                {/* Footer */}
                <div className="mt-auto border-t border-outline-variant pt-lg flex flex-col gap-2">
                    <div className="flex items-center gap-md px-sm py-sm">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                            {initials}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-label-lg font-label font-semibold truncate">{user.name}</p>
                            <p className="text-[11px] text-on-surface-variant">System Administrator</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="text-on-surface-variant hover:text-error transition-colors"
                            title="Logout"
                        >
                            <span className="material-symbols-outlined">logout</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main */}
            <main className="ml-[260px] flex-1 overflow-y-auto bg-surface">
                {/* Top bar */}
                <header className="h-16 flex justify-between items-center px-xl sticky top-0 bg-surface/80 backdrop-blur-md z-40 border-b border-outline-variant/30">
                    <div className="flex items-center gap-md">
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
                            <input
                                className="bg-surface-container-low border-none rounded-full pl-10 pr-md py-2 text-sm w-64 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                placeholder="Search resources..."
                                type="text"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-lg">
                        <button className="relative p-2 rounded-full hover:bg-surface-container transition-colors">
                            <span className="material-symbols-outlined">notifications</span>
                            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
                        </button>
                        <Link
                            href="/admin/orders"
                            className="flex items-center gap-xs bg-primary text-on-primary px-lg py-2 rounded-lg text-label-lg font-label font-semibold hover:opacity-90 transition-opacity"
                        >
                            <span className="material-symbols-outlined text-[18px]">add</span>
                            New Order
                        </Link>
                    </div>
                </header>

                <div className="p-xl max-w-[1440px] mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
