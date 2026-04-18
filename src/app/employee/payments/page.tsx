'use client';

import { useEffect, useState } from 'react';

interface OrderPayment { id: number; amount: number; }
interface Order { id: number; totalAmount: number; status: string; customer: { id: number; name: string }; payments: OrderPayment[]; }
interface Payment { id: number; amount: number; method: string; paymentDate: string; order: { id: number; customer: { name: string } }; }

export default function EmployeePayments() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [form, setForm] = useState({ orderId: '', amount: '', method: 'CASH', notes: '' });
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const loadData = () => {
        fetch('/api/orders').then(r => r.json()).then(setOrders);
        fetch('/api/payments').then(r => r.json()).then(setPayments);
    };

    useEffect(() => { loadData(); }, []);

    // Calculate remaining balance for the selected order
    const selectedOrder = orders.find(o => o.id === parseInt(form.orderId));
    const selectedPaid = selectedOrder ? selectedOrder.payments.reduce((s, p) => s + p.amount, 0) : 0;
    const selectedBalance = selectedOrder ? selectedOrder.totalAmount - selectedPaid : 0;

    // Calculate total outstanding for the selected customer
    const selectedCustomerOrders = selectedOrder
        ? orders.filter(o => o.customer.id === selectedOrder.customer.id && o.status !== 'COMPLETED')
        : [];
    const totalCustomerOutstanding = selectedCustomerOrders.reduce((sum, o) => {
        const paid = o.payments.reduce((s, p) => s + p.amount, 0);
        return sum + (o.totalAmount - paid);
    }, 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        const res = await fetch('/api/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        });
        if (res.ok) {
            const data = await res.json();
            if (data.spillover && data.spilloverDetails) {
                const details = data.spilloverDetails
                    .map((d: { orderId: number; amount: number }) => `Order #${d.orderId}: ₹${d.amount}`)
                    .join(', ');
                setSuccess(`Payment distributed across ${data.spilloverCount} orders — ${details}`);
            } else {
                setSuccess('Payment recorded!');
            }
            setForm({ orderId: '', amount: '', method: 'CASH', notes: '' });
            loadData();
            setTimeout(() => setSuccess(''), 6000);
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
                                {orders.filter(o => o.status !== 'COMPLETED').map(o => {
                                    const paid = o.payments.reduce((s, p) => s + p.amount, 0);
                                    const bal = o.totalAmount - paid;
                                    return (
                                        <option key={o.id} value={o.id}>
                                            #{o.id} — {o.customer.name} — ₹{o.totalAmount} (Balance: ₹{bal.toFixed(2)})
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        {selectedOrder && (
                            <div style={{
                                padding: '12px',
                                borderRadius: '8px',
                                background: 'var(--bg-secondary, #f4f6f8)',
                                marginBottom: '12px',
                                fontSize: '0.85rem',
                                lineHeight: '1.6',
                            }}>
                                <div><strong>Order #{selectedOrder.id}</strong> — {selectedOrder.customer.name}</div>
                                <div>Order Total: <strong>₹{selectedOrder.totalAmount.toFixed(2)}</strong></div>
                                <div>Already Paid: <strong style={{ color: 'var(--success, #22c55e)' }}>₹{selectedPaid.toFixed(2)}</strong></div>
                                <div>This Order Balance: <strong style={{ color: 'var(--danger, #ef4444)' }}>₹{selectedBalance.toFixed(2)}</strong></div>
                                {selectedCustomerOrders.length > 1 && (
                                    <div style={{ marginTop: '6px', borderTop: '1px solid var(--border, #e2e8f0)', paddingTop: '6px' }}>
                                        <div>Customer has <strong>{selectedCustomerOrders.length}</strong> unpaid orders</div>
                                        <div>Total Outstanding: <strong style={{ color: 'var(--warning, #f59e0b)' }}>₹{totalCustomerOutstanding.toFixed(2)}</strong></div>
                                        <div style={{ fontSize: '0.78rem', opacity: 0.7, marginTop: '4px' }}>
                                            💡 Excess payment will auto-apply to next orders
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

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

