'use client';

import { useEffect, useState } from 'react';

export default function AdminSettings() {
    const [form, setForm] = useState({ name: '', themeColor: '#0066cc' });
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetch('/api/settings').then(r => r.json()).then(data => {
            if (data.name) {
                setForm({ name: data.name, themeColor: data.themeColor });
            }
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        });

        if (res.ok) {
            setSuccess('Settings saved! You must log out and log back in to see the color change across all pages since the theme color is embedded in your session.');
        } else {
            const data = await res.json();
            setError(data.error || 'Failed to update settings');
        }
        setLoading(false);
    };

    return (
        <>
            <div className="page-header">
                <h1>Agency Settings</h1>
                <p>Customize your agency&apos;s branding and identity</p>
            </div>

            {success && <div className="success-msg">{success}</div>}
            {error && <div className="error-msg">{error}</div>}

            <div className="card" style={{ maxWidth: '600px' }}>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Agency Name</label>
                        <input
                            type="text"
                            className="form-control"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Brand Theme Color</label>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <input
                                type="color"
                                value={form.themeColor}
                                onChange={(e) => setForm({ ...form, themeColor: e.target.value })}
                                style={{ width: '50px', height: '40px', padding: '0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            />
                            <input
                                type="text"
                                className="form-control"
                                value={form.themeColor}
                                onChange={(e) => setForm({ ...form, themeColor: e.target.value })}
                                style={{ flex: 1 }}
                                required
                            />
                        </div>
                    </div>

                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                        Changing the theme color will update the interface colors for all employees and customers within your agency.
                    </p>

                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Saving...' : 'Save Settings'}
                    </button>
                </form>
            </div>
        </>
    );
}
