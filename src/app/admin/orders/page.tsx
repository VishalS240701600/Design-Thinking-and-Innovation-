'use client';

import { useEffect, useState } from 'react';

interface OrderItem {
    id: number;
    quantity: number;
    price: number;
    product: { name: string; unit: string };
}

interface Order {
    id: number;
    totalAmount: number;
    status: string;
    notes: string | null;
    createdAt: string;
    customer: { id: number; name: string; email: string };
    employee: { id: number; name: string } | null;
    items: OrderItem[];
    agency?: { name: string };
}

export default function AdminOrders() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [selected, setSelected] = useState<Order | null>(null);

    const load = () => fetch('/api/orders').then(r => r.json()).then(setOrders);
    useEffect(() => { load(); }, []);

    const updateStatus = async (id: number, status: string) => {
        await fetch('/api/orders', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status }),
        });
        load();
    };

    return (
        <>
            <div className="page-header">
                <h1>Orders</h1>
                <p>View and manage all orders</p>
            </div>

            {selected && (
                <div className="modal-overlay" onClick={() => setSelected(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <h2>Order #{selected.id}</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
                            Customer: <strong>{selected.customer.name}</strong> | {new Date(selected.createdAt).toLocaleString()}
                        </p>
                        <div className="table-wrapper" style={{ marginBottom: '16px' }}>
                            <table>
                                <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
                                <tbody>
                                    {selected.items.map(item => (
                                        <tr key={item.id}>
                                            <td>{item.product.name}</td>
                                            <td>{item.quantity} {item.product.unit}</td>
                                            <td>₹{item.price}</td>
                                            <td>₹{(item.price * item.quantity).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p style={{ textAlign: 'right', fontWeight: 600 }}>Total: ₹{selected.totalAmount.toLocaleString()}</p>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr><th>Agency</th><th>#</th><th>Customer</th><th>Employee</th><th>Amount</th><th>Status</th><th>Date</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                        {orders.map(o => (
                            <tr key={o.id}>
                                <td>{o.agency?.name || '—'}</td>
                                <td><a href="#" onClick={e => { e.preventDefault(); setSelected(o); }}>#{o.id}</a></td>
                                <td style={{ color: 'var(--text-primary)' }}>{o.customer.name}</td>
                                <td>{o.employee?.name || '—'}</td>
                                <td>₹{o.totalAmount.toLocaleString()}</td>
                                <td><span className={`badge badge-${o.status.toLowerCase()}`}>{o.status}</span></td>
                                <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                                <td>
                                    <select
                                        className="form-control"
                                        style={{ width: 'auto', padding: '4px 8px', fontSize: '0.78rem' }}
                                        value={o.status}
                                        onChange={e => updateStatus(o.id, e.target.value)}
                                    >
                                        <option value="PENDING">Pending</option>
                                        <option value="CONFIRMED">Confirmed</option>
                                        <option value="DELIVERED">Delivered</option>
                                        <option value="CANCELLED">Cancelled</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                        {orders.length === 0 && <tr><td colSpan={8}><div className="empty-state">No orders found</div></td></tr>}
                    </tbody>
                </table>
            </div>
        </>
    );
}
