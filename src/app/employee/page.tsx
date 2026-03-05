'use client';

import { useEffect, useState } from 'react';

export default function EmployeeDashboard() {
    const [stats, setStats] = useState<{ myOrders: number; myPaymentsTotal: number } | null>(null);

    useEffect(() => {
        fetch('/api/dashboard').then(r => r.json()).then(data => setStats(data.stats));
    }, []);

    if (!stats) return <p>Loading...</p>;

    return (
        <>
            <div className="page-header">
                <h1>Employee Dashboard</h1>
                <p>Your activity overview</p>
            </div>

            <div className="stat-grid">
                <div className="stat-card">
                    <div className="stat-label">Orders Entered</div>
                    <div className="stat-value blue">{stats.myOrders}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Payments Collected</div>
                    <div className="stat-value green">₹{stats.myPaymentsTotal.toLocaleString()}</div>
                </div>
            </div>
        </>
    );
}
