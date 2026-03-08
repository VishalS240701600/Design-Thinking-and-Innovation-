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

    if (!user) return <div className="auth-page"><p>Loading...</p></div>;

    const links = [
        { href: '/admin', label: 'Dashboard', icon: '📊' },
        { href: '/admin/products', label: 'Products', icon: '📦' },
        { href: '/admin/employees', label: 'Employees', icon: '👥' },
        { href: '/admin/customers', label: 'Customers', icon: '🏪' },
        { href: '/admin/orders', label: 'Orders', icon: '📋' },
        { href: '/admin/payments', label: 'Payments', icon: '💰' },
        { href: '/admin/settings', label: 'Settings', icon: '⚙️' },
    ];

    return (
        <div className="app-layout">
            <aside className="sidebar">
                <div className="sidebar-brand">
                    <h2>📦 FMCG Dist.</h2>
                    <span>Admin Portal</span>
                </div>
                <nav className="sidebar-nav">
                    {links.map(link => (
                        <Link key={link.href} href={link.href} className={pathname === link.href ? 'active' : ''}>
                            <span>{link.icon}</span> <span>{link.label}</span>
                        </Link>
                    ))}
                </nav>
                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">{user.name[0]}</div>
                        <div>
                            <div className="user-name">{user.name}</div>
                            <div className="user-role">Admin</div>
                        </div>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={handleLogout} style={{ width: '100%' }}>Logout</button>
                </div>
            </aside>
            <main className="main-content">{children}</main>
        </div>
    );
}
