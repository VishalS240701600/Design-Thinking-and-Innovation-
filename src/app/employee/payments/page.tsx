'use client';

import { useEffect, useState } from 'react';

interface Order { id: number; totalAmount: number; status: string; customer: { name: string }; }
interface Payment { id: number; amount: number; method: string; paymentDate: string; order: { id: number; customer: { name: string } }; }

export default function EmployeePayments() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [form, setForm] = useState({ orderId: '', amount: '', method: 'CASH', notes: '' });
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/api/orders').then(r => r.json()).then(setOrders);
        fetch('/api/payments').then(r => r.json()).then(setPayments);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const res = await fetch('/api/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        });
        if (res.ok) {
            setSuccess('Payment recorded!');
            setForm({ orderId: '', amount: '', method: 'CASH', notes: '' });
            fetch('/api/payments').then(r => r.json()).then(setPayments);
            setTimeout(() => setSuccess(''), 3000);
        } else {
            const data = await res.json();
            setError(data.error || 'Failed to record payment');
        }
    };

    return (
        <>
            <div className="page-header">
                <h1>Record Payment</h1>
                <p>Record a payment collected from a customer</p>
            </div>

            {success && <div className="success-msg">{success}</div>}
            {error && <div className="error-msg">{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div className="card">
                    <h2 style={{ fontSize: '1rem', marginBottom: '16px' }}>New Payment</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Order</label>
                            <select className="form-control" value={form.orderId} onChange={e => setForm({ ...form, orderId: e.target.value })} required>
                                <option value="">— Select Order —</option>
                                {orders.filter(o => o.status !== 'COMPLETED').map(o => (
                                    <option key={o.id} value={o.id}>
                                        #{o.id} — {o.customer.name} — ₹{o.totalAmount}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Amount (₹)</label>
                            <input type="number" step="0.01" className="form-control" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label>Method</label>
                            <select className="form-control" value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>
                                <option value="CASH">Cash</option>
                                <option value="UPI">UPI</option>
                                <option value="BANK_TRANSFER">Bank Transfer</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Notes</label>
                            <textarea className="form-control" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional..." />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Record Payment</button>
                    </form>
                </div>

                <div className="card">
                    <h2 style={{ fontSize: '1rem', marginBottom: '16px' }}>My Recent Payments</h2>
                    {payments.length === 0 ? (
                        <div className="empty-state"><p>No payments recorded yet</p></div>
                    ) : (
                        <div className="table-wrapper">
                            <table>
                                <thead><tr><th>Order</th><th>Customer</th><th>Amount</th><th>Method</th><th>Date</th></tr></thead>
                                <tbody>
                                    {payments.map(p => (
                                        <tr key={p.id}>
                                            <td>#{p.order.id}</td>
                                            <td>{p.order.customer.name}</td>
                                            <td style={{ color: 'var(--success)', fontWeight: 600 }}>₹{p.amount}</td>
                                            <td>{p.method}</td>
                                            <td>{new Date(p.paymentDate).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
