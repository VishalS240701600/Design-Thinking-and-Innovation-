'use client';

import { useEffect, useState } from 'react';

interface Payment {
    id: number;
    amount: number;
    method: string;
    notes: string | null;
    paymentDate: string;
    order: { id: number; totalAmount: number; customer: { name: string } };
    employee: { id: number; name: string };
    agency?: { name: string };
}

export default function AdminPayments() {
    const [payments, setPayments] = useState<Payment[]>([]);

    useEffect(() => {
        fetch('/api/payments').then(r => r.json()).then(setPayments);
    }, []);

    const total = payments.reduce((sum, p) => sum + p.amount, 0);

    return (
        <>
            <div className="page-header">
                <h1>Payments</h1>
                <p>View all payment records</p>
            </div>

            <div className="stat-grid">
                <div className="stat-card">
                    <div className="stat-label">Total Collected</div>
                    <div className="stat-value green">₹{total.toLocaleString()}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Payment Records</div>
                    <div className="stat-value blue">{payments.length}</div>
                </div>
            </div>

            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr><th>Agency</th><th>#</th><th>Order</th><th>Customer</th><th>Employee</th><th>Amount</th><th>Method</th><th>Date</th></tr>
                    </thead>
                    <tbody>
                        {payments.map(p => (
                            <tr key={p.id}>
                                <td>{p.agency?.name || '—'}</td>
                                <td>{p.id}</td>
                                <td>Order #{p.order.id}</td>
                                <td style={{ color: 'var(--text-primary)' }}>{p.order.customer.name}</td>
                                <td>{p.employee.name}</td>
                                <td style={{ fontWeight: 600, color: 'var(--success)' }}>₹{p.amount.toLocaleString()}</td>
                                <td><span className="badge badge-confirmed">{p.method}</span></td>
                                <td>{new Date(p.paymentDate).toLocaleDateString()}</td>
                            </tr>
                        ))}
                        {payments.length === 0 && <tr><td colSpan={8}><div className="empty-state">No payments recorded yet</div></td></tr>}
                    </tbody>
                </table>
            </div>
        </>
    );
}
