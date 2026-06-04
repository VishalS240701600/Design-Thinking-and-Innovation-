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

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);
    const [cartCount, setCartCount] = useState(0);

    useEffect(() => {
        fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'me' }) })
            .then(res => res.json())
            .then(data => {
                if (!data || !data.user || data.user.role !== 'CUSTOMER') { router.push('/'); return; }
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
        { href: '/customer',        label: 'Dashboard',  icon: 'dashboard' },
        { href: '/customer',        label: 'Products',   icon: 'inventory_2' },
        { href: '/customer/orders', label: 'Orders',     icon: 'local_shipping' },
    ];

    const isActive = (href: string) => pathname === href;
    const initials = user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

    return (
        <div className="flex bg-background min-h-screen">
            {/* Sidebar */}
            <aside className="fixed h-full w-[260px] left-0 top-0 bg-surface-container-lowest border-r border-outline-variant flex flex-col py-lg px-md z-50">
                <div className="mb-xxl px-sm flex flex-col gap-xs">
                    <div className="flex items-center gap-md">
                        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                            <span className="material-symbols-outlined text-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
                        </div>
                        <div>
                            <span className="font-headline text-primary text-[20px] font-bold">DistributeIQ</span>
                            <div className="mt-0.5">
                                <span className="bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">Customer</span>
                            </div>
                        </div>
                    </div>
                </div>

                <nav className="flex flex-col gap-1 flex-grow">
                    {navLinks.map((link, i) => (
                        <Link
                            key={i}
                            href={link.href}
                            className={isActive(link.href)
                                ? 'nav-active-item flex items-center gap-md px-md py-sm text-primary font-bold border-l-4 border-primary rounded-lg transition-all'
                                : 'flex items-center gap-md px-md py-sm text-on-surface-variant hover:bg-surface-container-high transition-colors rounded-lg'
                            }
                        >
                            <span className="material-symbols-outlined" style={isActive(link.href) ? { fontVariationSettings: "'FILL' 1" } : {}}>{link.icon}</span>
                            <span className="text-label-lg font-label">{link.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="mt-auto flex flex-col gap-xs border-t border-outline-variant pt-lg">
                    <div className="flex items-center gap-md px-md py-sm mt-md">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {initials}
                        </div>
                        <div className="flex flex-col flex-1 overflow-hidden">
                            <span className="text-label-lg font-label font-semibold text-on-surface truncate">{user.name}</span>
                            <span className="text-[10px] text-on-surface-variant">Retail Partner</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="text-on-surface-variant hover:text-error transition-colors"
                            title="Logout"
                        >
                            <span className="material-symbols-outlined text-[20px]">logout</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Top Bar */}
            <header className="fixed top-0 right-0 w-[calc(100%-260px)] h-16 bg-surface/80 backdrop-blur-md flex justify-between items-center px-xl z-40 border-b border-outline-variant/30">
                <div className="flex items-center gap-lg w-1/2">
                    <div className="relative w-full max-w-md">
                        <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
                        <input
                            className="w-full bg-surface-container border-none rounded-xl py-2 pl-10 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            placeholder="Search products, categories..."
                            type="text"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-lg">
                    <button className="relative p-2 text-on-surface-variant hover:text-primary transition-colors">
                        <span className="material-symbols-outlined">notifications</span>
                        <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full"></span>
                    </button>
                    <button className="flex items-center gap-sm px-lg py-sm border border-secondary text-secondary rounded-xl hover:bg-secondary/5 transition-all relative">
                        <span className="material-symbols-outlined">shopping_cart</span>
                        <span className="text-label-lg font-label">Cart</span>
                        {cartCount > 0 && (
                            <span className="absolute -top-2 -right-2 bg-primary-container text-on-primary-container text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-surface">
                                {cartCount}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            {/* Main */}
            <main className="ml-[260px] pt-16 flex-1 min-h-screen px-xl pb-xl">
                {children}
            </main>
        </div>
    );
}
