'use client';

import { useEffect, useState } from 'react';

interface Product {
    id: number;
    name: string;
    description: string | null;
    price: number;
    stock: number;
    unit: string;
    category: string | null;
    agency?: { name: string };
}

interface Agency {
    id: number;
    name: string;
}

export default function AdminProducts() {
    const [products, setProducts] = useState<Product[]>([]);
    const [agencies, setAgencies] = useState<Agency[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Product | null>(null);
    const [form, setForm] = useState({ name: '', description: '', price: '', stock: '', unit: 'pcs', category: '', agencyId: '' });

    const load = () => fetch('/api/products').then(r => r.json()).then(setProducts);

    useEffect(() => {
        load();
        fetch('/api/agencies').then(r => r.json()).then(data => setAgencies(Array.isArray(data) ? data : []));
    }, []);

    const openAdd = () => { setEditing(null); setForm({ name: '', description: '', price: '', stock: '', unit: 'pcs', category: '', agencyId: '' }); setShowForm(true); };
    const openEdit = (p: Product) => { setEditing(p); setForm({ name: p.name, description: p.description || '', price: String(p.price), stock: String(p.stock), unit: p.unit, category: p.category || '', agencyId: '' }); setShowForm(true); };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, id: editing?.id }),
        });
        setShowForm(false);
        load();
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this product?')) return;
        await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
        load();
    };

    return (
        <>
            <div className="page-header flex-between">
                <div>
                    <h1>Products</h1>
                    <p>Manage your product catalog</p>
                </div>
                <button className="btn btn-primary" onClick={openAdd}>+ Add Product</button>
            </div>

            {showForm && (
                <div className="modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2>{editing ? 'Edit Product' : 'Add Product'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Agency</label>
                                <select className="form-control" value={form.agencyId} onChange={e => setForm({ ...form, agencyId: e.target.value })} required={!editing}>
                                    <option value="">— Select Agency —</option>
                                    {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Product Name</label>
                                <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Price (₹)</label>
                                    <input type="number" step="0.01" className="form-control" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>Stock</label>
                                    <input type="number" className="form-control" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Unit</label>
                                    <input className="form-control" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Category</label>
                                    <input className="form-control" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea className="form-control" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Agency</th>
                            <th>Name</th>
                            <th>Category</th>
                            <th>Price</th>
                            <th>Stock</th>
                            <th>Unit</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(p => (
                            <tr key={p.id}>
                                <td>{p.agency?.name || '—'}</td>
                                <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{p.name}</td>
                                <td>{p.category || '—'}</td>
                                <td>₹{p.price}</td>
                                <td>{p.stock}</td>
                                <td>{p.unit}</td>
                                <td>
                                    <div className="btn-group">
                                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>Edit</button>
                                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>Delete</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {products.length === 0 && <tr><td colSpan={7}><div className="empty-state">No products found</div></td></tr>}
                    </tbody>
                </table>
            </div>
        </>
    );
}
