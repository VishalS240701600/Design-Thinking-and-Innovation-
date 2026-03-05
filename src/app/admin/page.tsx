'use client';

import { useEffect, useState } from 'react';

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

    if (!stats) return <div className="main-content"><p>Loading dashboard...</p></div>;

    return (
        <>
            <div className="page-header">
                <h1>Admin Dashboard</h1>
                <p>Overview of your distribution operations</p>
            </div>

            <div className="stat-grid">
                <div className="stat-card">
                    <div className="stat-label">Total Products</div>
                    <div className="stat-value blue">{stats.totalProducts}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Customers</div>
                    <div className="stat-value green">{stats.totalCustomers}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Employees</div>
                    <div className="stat-value yellow">{stats.totalEmployees}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Total Orders</div>
                    <div className="stat-value blue">{stats.totalOrders}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Total Revenue</div>
                    <div className="stat-value green">₹{stats.totalRevenue.toLocaleString()}</div>
                </div>
            </div>

            <div className="card">
                <div className="flex-between mb-4">
                    <h2 style={{ fontSize: '1.1rem' }}>Recent Orders</h2>
                </div>
                {recentOrders.length === 0 ? (
                    <div className="empty-state"><h3>No orders yet</h3><p>Orders will appear here once placed</p></div>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Order #</th>
                                    <th>Customer</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentOrders.map(order => (
                                    <tr key={order.id}>
                                        <td>#{order.id}</td>
                                        <td>{order.customer.name}</td>
                                        <td>₹{order.totalAmount.toLocaleString()}</td>
                                        <td><span className={`badge badge-${order.status.toLowerCase()}`}>{order.status}</span></td>
                                        <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}
