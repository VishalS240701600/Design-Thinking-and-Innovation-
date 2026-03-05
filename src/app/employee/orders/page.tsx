'use client';

import { useEffect, useState } from 'react';

interface Product { id: number; name: string; price: number; stock: number; unit: string; }
interface Customer { id: number; name: string; email: string; }
interface CartItem { productId: number; name: string; price: number; quantity: number; unit: string; }

export default function EmployeeOrders() {
    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [customerId, setCustomerId] = useState('');
    const [notes, setNotes] = useState('');
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/api/products').then(r => r.json()).then(data => setProducts(Array.isArray(data) ? data : []));
        fetch('/api/users?role=CUSTOMER').then(r => r.json()).then(data => setCustomers(Array.isArray(data) ? data : []));
    }, []);

    const addToCart = (p: Product) => {
        const existing = cart.find(c => c.productId === p.id);
        if (existing) {
            setCart(cart.map(c => c.productId === p.id ? { ...c, quantity: c.quantity + 1 } : c));
        } else {
            setCart([...cart, { productId: p.id, name: p.name, price: p.price, quantity: 1, unit: p.unit }]);
        }
    };

    const updateQty = (productId: number, qty: number) => {
        if (qty <= 0) { setCart(cart.filter(c => c.productId !== productId)); return; }
        setCart(cart.map(c => c.productId === productId ? { ...c, quantity: qty } : c));
    };

    const total = cart.reduce((s, c) => s + c.price * c.quantity, 0);

    const submitOrder = async () => {
        if (!customerId) { setError('Please select a customer'); return; }
        if (cart.length === 0) { setError('Please add items to the order'); return; }
        setError('');

        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customerId: parseInt(customerId),
                items: cart.map(c => ({ productId: c.productId, quantity: c.quantity })),
                notes,
            }),
        });

        if (res.ok) {
            setSuccess('Order placed successfully!');
            setCart([]);
            setCustomerId('');
            setNotes('');
            setTimeout(() => setSuccess(''), 3000);
        } else {
            const data = await res.json();
            setError(data.error || 'Failed to place order');
        }
    };

    return (
        <>
            <div className="page-header">
                <h1>Enter Order</h1>
                <p>Create an order on behalf of a customer</p>
            </div>

            {success && <div className="success-msg">{success}</div>}
            {error && <div className="error-msg">{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
                {/* Product Selection */}
                <div className="card">
                    <h2 style={{ fontSize: '1rem', marginBottom: '16px' }}>Select Products</h2>
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr><th>Product</th><th>Price</th><th>Stock</th><th></th></tr>
                            </thead>
                            <tbody>
                                {products.map(p => (
                                    <tr key={p.id}>
                                        <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{p.name}</td>
                                        <td>₹{p.price}/{p.unit}</td>
                                        <td>{p.stock}</td>
                                        <td>
                                            <button className="btn btn-primary btn-sm" onClick={() => addToCart(p)} disabled={p.stock <= 0}>
                                                + Add
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Cart / Order Summary */}
                <div>
                    <div className="card" style={{ marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '1rem', marginBottom: '16px' }}>Order Details</h2>
                        <div className="form-group">
                            <label>Customer</label>
                            <select className="form-control" value={customerId} onChange={e => setCustomerId(e.target.value)}>
                                <option value="">— Select Customer —</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Notes</label>
                            <textarea className="form-control" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." />
                        </div>
                    </div>

                    <div className="card">
                        <h2 style={{ fontSize: '1rem', marginBottom: '16px' }}>
                            Cart ({cart.length} items)
                        </h2>
                        {cart.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No items in cart</p>
                        ) : (
                            <>
                                {cart.map(item => (
                                    <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                                        <div>
                                            <div style={{ fontWeight: 500, fontSize: '0.88rem' }}>{item.name}</div>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>₹{item.price} × {item.quantity}</div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <button className="btn btn-secondary btn-sm" onClick={() => updateQty(item.productId, item.quantity - 1)}>−</button>
                                            <span style={{ minWidth: '20px', textAlign: 'center' }}>{item.quantity}</span>
                                            <button className="btn btn-secondary btn-sm" onClick={() => updateQty(item.productId, item.quantity + 1)}>+</button>
                                        </div>
                                    </div>
                                ))}
                                <div style={{ marginTop: '16px', textAlign: 'right', fontSize: '1.1rem', fontWeight: 700 }}>
                                    Total: ₹{total.toLocaleString()}
                                </div>
                                <button className="btn btn-primary" style={{ width: '100%', marginTop: '12px', justifyContent: 'center' }} onClick={submitOrder}>
                                    Place Order
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
