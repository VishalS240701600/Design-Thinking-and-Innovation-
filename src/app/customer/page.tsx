'use client';

import { useEffect, useState, useMemo } from 'react';
import { Package, ShoppingCart, Cookie, Beaker, Brush, Milk, Utensils, Croissant, SprayCan, Droplets, Coffee, EggFried, LayoutGrid } from 'lucide-react';

interface Product { id: number; name: string; description: string | null; price: number; stock: number; unit: string; category: string | null; }
interface CartItem { productId: number; name: string; price: number; quantity: number; unit: string; }

export default function CustomerProducts() {
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCart, setShowCart] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    useEffect(() => {
        fetch('/api/products').then(r => r.json()).then(setProducts);
    }, []);

    // Extract unique categories with counts
    const categories = useMemo(() => {
        const catMap = new Map<string, number>();
        products.forEach(p => {
            const cat = p.category || 'General';
            catMap.set(cat, (catMap.get(cat) || 0) + 1);
        });
        // Sort alphabetically, but keep 'General' at the end
        const sorted = Array.from(catMap.entries()).sort((a, b) => {
            if (a[0] === 'General') return 1;
            if (b[0] === 'General') return -1;
            return a[0].localeCompare(b[0]);
        });
        return sorted;
    }, [products]);

    // Filter products by selected category
    const filteredProducts = useMemo(() => {
        if (selectedCategory === 'All') return products;
        return products.filter(p => (p.category || 'General') === selectedCategory);
    }, [products, selectedCategory]);

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
    const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

    const placeOrder = async () => {
        setError('');
        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: cart.map(c => ({ productId: c.productId, quantity: c.quantity })) }),
        });
        if (res.ok) {
            setSuccess('Order placed successfully!');
            setCart([]);
            setShowCart(false);
            setTimeout(() => setSuccess(''), 4000);
        } else {
            const data = await res.json();
            setError(data.error || 'Failed to place order');
        }
    };

    const getCategoryIcon = (cat: string | null, size = 40) => {
        switch(cat) {
            case 'Biscuits': return <Cookie size={size} className="text-muted" color="var(--text-secondary)" />;
            case 'Staples': return <Beaker size={size} className="text-muted" color="var(--text-secondary)" />;
            case 'Detergent': return <Brush size={size} className="text-muted" color="var(--text-secondary)" />;
            case 'Dairy': return <Milk size={size} className="text-muted" color="var(--text-secondary)" />;
            case 'Noodles': return <Utensils size={size} className="text-muted" color="var(--text-secondary)" />;
            case 'Bakery': return <Croissant size={size} className="text-muted" color="var(--text-secondary)" />;
            case 'Personal Care': return <SprayCan size={size} className="text-muted" color="var(--text-secondary)" />;
            case 'Cleaning': return <Droplets size={size} className="text-muted" color="var(--text-secondary)" />;
            case 'Beverages': return <Coffee size={size} className="text-muted" color="var(--text-secondary)" />;
            case 'Cooking Oil': return <EggFried size={size} className="text-muted" color="var(--text-secondary)" />;
            default: return <Package size={size} className="text-muted" color="var(--text-secondary)" />;
        }
    };

    return (
        <>
            <div className="page-header flex-between">
                <div>
                    <h1>Product Catalog</h1>
                    <p>Browse and order products</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCart(true)}>
                    <ShoppingCart size={18} /> Cart ({cartCount})
                </button>
            </div>

            {success && <div className="success-msg">{success}</div>}

            {/* Category Filter Bar */}
            {categories.length > 0 && (
                <div className="category-bar">
                    <button
                        className={`category-chip ${selectedCategory === 'All' ? 'active' : ''}`}
                        onClick={() => setSelectedCategory('All')}
                    >
                        <LayoutGrid size={16} /> All
                        <span className="chip-count">{products.length}</span>
                    </button>
                    {categories.map(([cat, count]) => (
                        <button
                            key={cat}
                            className={`category-chip ${selectedCategory === cat ? 'active' : ''}`}
                            onClick={() => setSelectedCategory(cat)}
                        >
                            {getCategoryIcon(cat, 16)} {cat}
                            <span className="chip-count">{count}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Cart Modal */}
            {showCart && (
                <div className="modal-overlay" onClick={() => setShowCart(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ShoppingCart size={24} /> Your Cart</h2>
                        {error && <div className="error-msg">{error}</div>}
                        {cart.length === 0 ? (
                            <div className="empty-state"><p>Your cart is empty</p></div>
                        ) : (
                            <>
                                {cart.map(item => (
                                    <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                                        <div>
                                            <div style={{ fontWeight: 500 }}>{item.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>₹{item.price} × {item.quantity} = ₹{(item.price * item.quantity).toLocaleString()}</div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <button className="btn btn-secondary btn-sm" onClick={() => updateQty(item.productId, item.quantity - 1)}>−</button>
                                            <span>{item.quantity}</span>
                                            <button className="btn btn-secondary btn-sm" onClick={() => updateQty(item.productId, item.quantity + 1)}>+</button>
                                        </div>
                                    </div>
                                ))}
                                <div style={{ marginTop: '16px', textAlign: 'right', fontSize: '1.15rem', fontWeight: 700 }}>
                                    Total: ₹{total.toLocaleString()}
                                </div>
                                <button className="btn btn-success" style={{ width: '100%', marginTop: '12px', justifyContent: 'center' }} onClick={placeOrder}>
                                    Place Order
                                </button>
                            </>
                        )}
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setShowCart(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="product-grid">
                {filteredProducts.map(p => (
                    <div className="product-card" key={p.id}>
                        <div className="product-card-img">
                            {getCategoryIcon(p.category)}
                        </div>
                        <div className="product-card-body">
                            <div className="category">{p.category || 'General'}</div>
                            <h3>{p.name}</h3>
                            {p.description && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>{p.description}</p>}
                            <div className="price">₹{p.price} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>/ {p.unit}</span></div>
                            <div className="stock">{p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}</div>
                            <button className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => addToCart(p)} disabled={p.stock <= 0}>
                                Add to Cart
                            </button>
                        </div>
                    </div>
                ))}
                {filteredProducts.length === 0 && (
                    <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                        <h3>No products found</h3>
                        <p>No products available in this category</p>
                    </div>
                )}
            </div>
        </>
    );
}
