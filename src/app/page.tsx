'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

export default function LoginPage() {
    const router = useRouter();
    const [isLogin, setIsLogin] = useState(true);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [form, setForm] = useState({ agencyId: '', name: '', email: '', password: '', role: 'CUSTOMER' });
    const [agencies, setAgencies] = useState<{ id: number, name: string }[]>([]);

    useEffect(() => {
        fetch('/api/agencies')
            .then(r => { if (!r.ok) throw new Error('Failed'); return r.json(); })
            .then(data => { if (Array.isArray(data)) setAgencies(data); })
            .catch(() => setError('Could not connect to server. Check database connection.'));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        if (!isLogin && !form.agencyId) { setError('Please select an agency'); setLoading(false); return; }
        try {
            if (isLogin) {
                // 1. Authenticate with Firebase Client SDK
                const userCredential = await signInWithEmailAndPassword(auth, form.email, form.password);
                // 2. Get ID Token
                const idToken = await userCredential.user.getIdToken();
                
                // 3. Send ID token to our backend to establish session cookie
                const res = await fetch('/api/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'session', idToken }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to create session');
                
                const role = String(data.user.role).toUpperCase();
                if (role === 'ADMIN') router.push('/admin');
                else if (role === 'EMPLOYEE') router.push('/employee');
                else router.push('/customer');
            } else {
                // Registration stays on backend
                const res = await fetch('/api/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'register', ...form }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Registration failed');
                
                // Auto-login after registration
                const userCredential = await signInWithEmailAndPassword(auth, form.email, form.password);
                const idToken = await userCredential.user.getIdToken();
                const sessionRes = await fetch('/api/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'session', idToken }),
                });
                const sessionData = await sessionRes.json();
                if (!sessionRes.ok) throw new Error(sessionData.error || 'Failed to create session');

                const role = String(sessionData.user.role).toUpperCase();
                if (role === 'ADMIN') router.push('/admin');
                else if (role === 'EMPLOYEE') router.push('/employee');
                else router.push('/customer');
            }
        } catch (err: any) { 
            // Better error messages for Firebase
            if (err.code === 'auth/invalid-credential') setError('Invalid email or password');
            else setError(err.message || 'Something went wrong'); 
        }
        finally { setLoading(false); }
    };

    return (
        <main className="min-h-screen flex flex-col md:flex-row font-body">
            {/* ── Left Panel: Brand ── */}
            <section className="hidden md:flex md:w-1/2 lg:w-3/5 mesh-pattern relative overflow-hidden items-center justify-center">
                {/* Glow */}
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(14,165,233,0.15) 0%, transparent 70%)' }} />
                {/* SVG Lines */}
                <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <defs>
                        <linearGradient id="grid-grad" x1="0%" x2="100%" y1="0%" y2="100%">
                            <stop offset="0%" style={{ stopColor: '#0ea5e9', stopOpacity: 0.2 }} />
                            <stop offset="100%" style={{ stopColor: '#6df5e1', stopOpacity: 0.05 }} />
                        </linearGradient>
                    </defs>
                    <path d="M0 20 L100 80 M0 50 L100 50 M0 80 L100 20 M20 0 L80 100 M50 0 L50 100 M80 0 L20 100" fill="none" stroke="url(#grid-grad)" strokeWidth="0.1" />
                </svg>

                <div className="relative z-10 px-xl text-center">
                    <div className="flex flex-col items-center gap-lg">
                        {/* Logo Box */}
                        <div className="p-md bg-white/5 rounded-xl backdrop-blur-md border border-white/10 shadow-2xl">
                            <div className="w-20 h-20 bg-primary rounded-xl flex items-center justify-center">
                                <span className="material-symbols-outlined text-white text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
                            </div>
                        </div>
                        <div>
                            <h1 className="font-headline text-display-lg text-white mb-md tracking-tight">DistributeIQ</h1>
                            <p className="font-body text-body-lg text-slate-400 max-w-md mx-auto">
                                The intelligent layer for global distribution networks. Precision logistics, real-time analytics.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Floating stat chip */}
                <div className="absolute bottom-12 left-12 p-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg flex items-center gap-md">
                    <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center text-primary-container">
                        <span className="material-symbols-outlined">analytics</span>
                    </div>
                    <div className="text-left">
                        <p className="text-xs font-semibold text-white/50 uppercase tracking-widest">Active Nodes</p>
                        <p className="text-lg font-bold text-white">4,281 Units</p>
                    </div>
                </div>
            </section>

            {/* ── Right Panel: Form ── */}
            <section className="flex-1 flex flex-col bg-surface-container-lowest relative">
                {/* Form Container */}
                <div className="flex-1 flex items-center justify-center px-container-margin py-xxl">
                    <div className="w-full max-w-md">
                        {/* Mobile Logo */}
                        <div className="flex items-center gap-sm mb-xl md:hidden">
                            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
                            </div>
                            <span className="font-headline text-headline-md text-primary">DistributeIQ</span>
                        </div>

                        <header className="mb-xl">
                            <h2 className="font-headline text-headline-lg text-on-surface mb-xs">
                                {isLogin ? 'Welcome back' : 'Create account'}
                            </h2>
                            <p className="font-body text-body-md text-on-surface-variant">
                                {isLogin ? 'Sign in to your distribution portal' : 'Register a new account'}
                            </p>
                        </header>

                        {error && (
                            <div className="mb-lg p-md bg-error-container text-on-error-container rounded-xl text-sm font-medium">
                                {error}
                            </div>
                        )}

                        <form className="space-y-lg" onSubmit={handleSubmit}>
                            {/* Agency */}
                            <div className="space-y-xs">
                                <label className="text-label-lg font-label text-on-surface-variant ml-xs block">
                                    Select Agency {isLogin && <span className="text-[11px] font-normal">(Optional for Global Admin)</span>}
                                </label>
                                <div className="relative">
                                    <select
                                        className="w-full appearance-none bg-surface-container-low border border-outline-variant rounded-xl px-lg py-md text-body-md text-on-surface focus:border-primary-container focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer outline-none"
                                        value={form.agencyId}
                                        onChange={e => setForm({ ...form, agencyId: e.target.value })}
                                        required={!isLogin}
                                    >
                                        <option value="">— Select your Agency —</option>
                                        {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                    <span className="material-symbols-outlined absolute right-md top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">expand_more</span>
                                </div>
                            </div>

                            {/* Full Name (register only) */}
                            {!isLogin && (
                                <div className="space-y-xs">
                                    <label className="text-label-lg font-label text-on-surface-variant ml-xs block" htmlFor="name">Full Name</label>
                                    <input
                                        id="name" type="text"
                                        className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-lg py-md text-body-md text-on-surface form-focus transition-all outline-none"
                                        placeholder="Enter your full name"
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        required={!isLogin}
                                    />
                                </div>
                            )}

                            {/* Email */}
                            <div className="space-y-xs">
                                <label className="text-label-lg font-label text-on-surface-variant ml-xs block" htmlFor="email">Email address</label>
                                <input
                                    id="email" type="email"
                                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-lg py-md text-body-md text-on-surface form-focus transition-all outline-none"
                                    placeholder="name@company.com"
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                    required
                                />
                            </div>

                            {/* Password */}
                            <div className="space-y-xs">
                                <div className="flex justify-between items-center px-xs">
                                    <label className="text-label-lg font-label text-on-surface-variant" htmlFor="password">Password</label>
                                    {isLogin && <a className="text-label-md font-label text-primary hover:underline" href="#">Forgot password?</a>}
                                </div>
                                <div className="relative">
                                    <input
                                        id="password" type={showPassword ? 'text' : 'password'}
                                        className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-lg py-md text-body-md text-on-surface form-focus transition-all outline-none"
                                        placeholder="••••••••"
                                        value={form.password}
                                        onChange={e => setForm({ ...form, password: e.target.value })}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-md top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Role (register only) */}
                            {!isLogin && (
                                <div className="space-y-xs">
                                    <label className="text-label-lg font-label text-on-surface-variant ml-xs block">Role</label>
                                    <div className="relative">
                                        <select
                                            className="w-full appearance-none bg-surface-container-low border border-outline-variant rounded-xl px-lg py-md text-body-md text-on-surface focus:border-primary-container focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer outline-none"
                                            value={form.role}
                                            onChange={e => setForm({ ...form, role: e.target.value })}
                                        >
                                            <option value="CUSTOMER">Customer</option>
                                            <option value="EMPLOYEE">Employee</option>
                                        </select>
                                        <span className="material-symbols-outlined absolute right-md top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">expand_more</span>
                                    </div>
                                </div>
                            )}

                            {/* CTA */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary hover:bg-primary/90 text-on-primary text-label-lg font-label font-semibold py-md rounded-xl shadow-lg transition-all hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-sm disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Please wait...
                                    </>
                                ) : (
                                    <>
                                        {isLogin ? 'Sign In' : 'Create Account'}
                                        <span className="material-symbols-outlined text-[20px]">{isLogin ? 'login' : 'person_add'}</span>
                                    </>
                                )}
                            </button>
                        </form>

                        <footer className="mt-xl text-center">
                            <p className="text-body-sm font-body text-on-surface-variant">
                                {isLogin ? "Don't have an account? " : "Already have an account? "}
                                <a
                                    className="text-primary font-semibold hover:underline cursor-pointer"
                                    onClick={e => { e.preventDefault(); setIsLogin(!isLogin); setError(''); }}
                                    href="#"
                                >
                                    {isLogin ? 'Register your agency' : 'Sign In'}
                                </a>
                            </p>
                        </footer>
                    </div>
                </div>

                {/* Legal Footer */}
                <div className="p-lg flex justify-center gap-lg border-t border-outline-variant/30">
                    {['Privacy Policy', 'Terms of Service', 'System Status'].map(label => (
                        <a key={label} className="text-label-sm font-label text-on-surface-variant hover:text-primary transition-colors" href="#">{label}</a>
                    ))}
                </div>
            </section>
        </main>
    );
}
