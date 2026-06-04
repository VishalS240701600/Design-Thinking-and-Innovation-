'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Stats {
    totalProducts: number;
    totalCustomers: number;
    totalEmployees: number;
    totalOrders: number;
    totalRevenue: number;
}

interface RecentOrder {
    id: number;
    totalAmount: number;
    status: string;
    createdAt: string;
    customer: { name: string };
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    CONFIRMED:  { bg: 'bg-tertiary/10',        text: 'text-tertiary',  label: 'Confirmed' },
    PENDING:    { bg: 'bg-amber-100',           text: 'text-amber-800', label: 'Pending' },
    SHIPPED:    { bg: 'bg-primary/10',          text: 'text-primary',   label: 'Shipped' },
    DELIVERED:  { bg: 'bg-tertiary/10',         text: 'text-tertiary',  label: 'Delivered' },
    CANCELLED:  { bg: 'bg-error-container',     text: 'text-error',     label: 'Cancelled' },
    DELAYED:    { bg: 'bg-error-container',     text: 'text-error',     label: 'Delayed' },
};

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

    useEffect(() => {
        fetch('/api/dashboard')
            .then(res => res.json())
            .then(data => {
                setStats(data.stats);
                setRecentOrders(data.recentOrders || []);
            });
    }, []);

    if (!stats) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-on-surface-variant text-sm">Loading dashboard...</p>
            </div>
        </div>
    );

    const statTiles = [
        { label: 'Products',  value: stats.totalProducts,                                icon: 'inventory_2',   bg: 'bg-sky-100',     icon_color: 'text-sky-600' },
        { label: 'Customers', value: stats.totalCustomers,                               icon: 'groups',        bg: 'bg-emerald-100', icon_color: 'text-emerald-600' },
        { label: 'Employees', value: stats.totalEmployees,                               icon: 'badge',         bg: 'bg-purple-100',  icon_color: 'text-purple-600' },
        { label: 'Orders',    value: stats.totalOrders.toLocaleString(),                 icon: 'local_shipping',bg: 'bg-orange-100',  icon_color: 'text-orange-600' },
        { label: 'Revenue',   value: `₹${stats.totalRevenue.toLocaleString()}`,          icon: 'payments',      bg: 'bg-primary/10',  icon_color: 'text-primary', highlight: true },
    ];

    return (
        <>
            {/* Page Header */}
            <div className="mb-xl">
                <h2 className="font-headline text-headline-lg text-primary">Dashboard</h2>
                <p className="text-on-surface-variant text-body-md mt-1">Good morning, Admin. Here&apos;s what&apos;s happening today.</p>
            </div>

            {/* Stats Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-md mb-xxl">
                {statTiles.map(tile => (
                    <div
                        key={tile.label}
                        className={`glass-card p-md rounded-xl shadow-card hover:shadow-card-hover transition-all group cursor-default ${tile.highlight ? 'border-primary/20 bg-primary/5' : ''}`}
                    >
                        <div className={`w-10 h-10 rounded-lg ${tile.bg} flex items-center justify-center ${tile.icon_color} mb-md group-hover:scale-110 transition-transform`}>
                            <span className="material-symbols-outlined">{tile.icon}</span>
                        </div>
                        <p className="text-on-surface-variant text-label-sm font-label uppercase tracking-wider">{tile.label}</p>
                        <p className="text-headline-md font-headline font-bold mt-1">{tile.value}</p>
                    </div>
                ))}
            </div>

            {/* Two-Column Section */}
            <div className="grid grid-cols-12 gap-xl">
                {/* Recent Orders Table */}
                <div className="col-span-12 lg:col-span-7 bg-surface-container-lowest rounded-xl shadow-card border border-outline-variant p-lg">
                    <div className="flex justify-between items-center mb-lg">
                        <h3 className="font-headline text-headline-sm text-on-surface">Recent Orders</h3>
                        <Link href="/admin/orders" className="text-primary text-label-lg font-label font-semibold hover:underline">View All</Link>
                    </div>
                    {recentOrders.length === 0 ? (
                        <div className="py-12 text-center text-on-surface-variant">
                            <span className="material-symbols-outlined text-[48px] mb-4 block opacity-30">local_shipping</span>
                            <p className="font-headline text-headline-sm">No orders yet</p>
                            <p className="text-body-sm mt-1">Orders will appear here once placed</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-outline-variant">
                                        <th className="py-md text-label-lg font-label text-on-surface-variant">Order ID</th>
                                        <th className="py-md text-label-lg font-label text-on-surface-variant">Customer</th>
                                        <th className="py-md text-label-lg font-label text-on-surface-variant">Amount</th>
                                        <th className="py-md text-label-lg font-label text-on-surface-variant">Status</th>
                                        <th className="py-md text-label-lg font-label text-on-surface-variant">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-outline-variant/30">
                                    {recentOrders.map(order => {
                                        const cfg = statusConfig[order.status] ?? { bg: 'bg-surface-container', text: 'text-on-surface-variant', label: order.status };
                                        return (
                                            <tr key={order.id} className="hover:bg-surface-container-low transition-colors">
                                                <td className="py-md font-mono text-sm">#{order.id}</td>
                                                <td className="py-md text-body-md">{order.customer.name}</td>
                                                <td className="py-md text-body-md font-medium">₹{order.totalAmount.toLocaleString()}</td>
                                                <td className="py-md">
                                                    <span className={`px-3 py-1 ${cfg.bg} ${cfg.text} text-[10px] font-bold uppercase tracking-wider rounded-full`}>
                                                        {cfg.label}
                                                    </span>
                                                </td>
                                                <td className="py-md text-body-sm text-on-surface-variant">
                                                    {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Top Categories */}
                <div className="col-span-12 lg:col-span-5 bg-surface-container-lowest rounded-xl shadow-card border border-outline-variant p-lg flex flex-col">
                    <div className="mb-lg">
                        <h3 className="font-headline text-headline-sm text-on-surface">Top Categories</h3>
                        <p className="text-on-surface-variant text-label-md font-label">Distribution by volume</p>
                    </div>
                    <div className="flex-1 flex flex-col justify-center items-center">
                        {/* CSS Donut */}
                        <div className="relative w-48 h-48 mb-lg">
                            <div className="w-full h-full rounded-full border-[18px] border-primary-container rotate-45" />
                            <div className="absolute inset-0 w-full h-full rounded-full border-[18px] border-transparent border-t-tertiary-container border-l-tertiary-container -rotate-12" />
                            <div className="absolute inset-4 bg-surface-container-lowest rounded-full flex flex-col items-center justify-center shadow-inner">
                                <p className="font-headline text-headline-md font-bold">1.2k</p>
                                <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">Units</p>
                            </div>
                        </div>
                        <div className="w-full grid grid-cols-2 gap-md">
                            {[
                                { label: 'Dairy & Eggs',  pct: 45, color: 'bg-primary-container' },
                                { label: 'Beverages',     pct: 32, color: 'bg-tertiary-container' },
                                { label: 'Snacks',        pct: 15, color: 'bg-orange-400' },
                                { label: 'Others',        pct: 8,  color: 'bg-outline-variant' },
                            ].map(cat => (
                                <div key={cat.label} className="flex items-center gap-sm">
                                    <span className={`w-3 h-3 rounded-full ${cat.color} flex-shrink-0`} />
                                    <div className="flex-1">
                                        <div className="flex justify-between text-xs font-medium">
                                            <span>{cat.label}</span>
                                            <span>{cat.pct}%</span>
                                        </div>
                                        <div className="w-full h-1 bg-surface-container-high rounded-full mt-1">
                                            <div className={`h-full ${cat.color} rounded-full`} style={{ width: `${cat.pct}%` }} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* System Health Banner */}
            <div className="mt-xl">
                <div className="bg-gradient-to-r from-primary/10 to-transparent p-lg rounded-xl border border-primary/10 flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h4 className="font-headline text-headline-sm text-primary">System Health Optimized</h4>
                        <p className="text-on-surface-variant text-body-sm max-w-lg mt-1">
                            Your logistics network is operating at 98.4% efficiency. All {stats.totalEmployees} active employees are within delivery time targets.
                        </p>
                    </div>
                    <div className="flex -space-x-3">
                        {['JD', 'AK', 'SP'].map(init => (
                            <div key={init} className="w-10 h-10 rounded-full border-2 border-surface-container-lowest bg-surface-container-highest flex items-center justify-center text-xs font-bold">{init}</div>
                        ))}
                        {stats.totalEmployees > 3 && (
                            <div className="w-10 h-10 rounded-full border-2 border-surface-container-lowest bg-primary text-on-primary flex items-center justify-center text-xs font-bold">
                                +{stats.totalEmployees - 3}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
