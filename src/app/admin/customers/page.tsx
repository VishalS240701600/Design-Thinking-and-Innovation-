'use client';

import { useEffect, useState } from 'react';

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    phone: string | null;
    address: string | null;
    createdAt: string;
}

export default function AdminCustomers() {
    const [users, setUsers] = useState<User[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<User | null>(null);
    const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', address: '' });

    const load = () => fetch('/api/users?role=CUSTOMER').then(r => r.json()).then(setUsers);
    useEffect(() => { load(); }, []);

    const openAdd = () => { setEditing(null); setForm({ name: '', email: '', password: '', phone: '', address: '' }); setShowForm(true); };
    const openEdit = (u: User) => { setEditing(u); setForm({ name: u.name, email: u.email, password: '', phone: u.phone || '', address: u.address || '' }); setShowForm(true); };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, role: 'CUSTOMER', id: editing?.id }),
        });
        setShowForm(false);
        load();
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this customer?')) return;
        await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
        load();
    };

    return (
        <>
            <div className="page-header flex-between">
                <div><h1>Customers</h1><p>Manage your customer base</p></div>
                <button className="btn btn-primary" onClick={openAdd}>+ Add Customer</button>
            </div>

            {showForm && (
                <div className="modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2>{editing ? 'Edit Customer' : 'Add Customer'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Business / Full Name</label>
                                <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input type="email" className="form-control" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Password {editing ? '(leave blank to keep)' : ''}</label>
                                <input type="password" className="form-control" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required={!editing} />
                            </div>
                            <div className="form-group">
                                <label>Phone</label>
                                <input className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Address</label>
                                <textarea className="form-control" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
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
                        <tr><th>Name</th><th>Email</th><th>Phone</th><th>Address</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id}>
                                <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{u.name}</td>
                                <td>{u.email}</td>
                                <td>{u.phone || '—'}</td>
                                <td>{u.address || '—'}</td>
                                <td>
                                    <div className="btn-group">
                                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(u)}>Edit</button>
                                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id)}>Delete</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && <tr><td colSpan={5}><div className="empty-state">No customers found</div></td></tr>}
                    </tbody>
                </table>
            </div>
        </>
    );
}
