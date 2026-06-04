'use client';

import { useEffect, useState } from 'react';

interface Product {
    id: number;
    name: string;
    category: string;
    price: number;
    stock: number;
}

interface CartItem {
    product: Product;
    quantity: number;
}

const CATEGORY_ICONS: Record<string, { icon: string; gradient: string }> = {
    'Biscuits':     { icon: 'cookie',       gradient: 'from-amber-400 to-orange-500' },
    'Dairy':        { icon: 'water_drop',   gradient: 'from-sky-400 to-blue-500' },
    'Beverages':    { icon: 'local_cafe',   gradient: 'from-teal-500 to-cyan-600' },
    'Staples':      { icon: 'grain',        gradient: 'from-yellow-500 to-amber-600' },
    'Noodles':      { icon: 'ramen_dining', gradient: 'from-red-400 to-rose-500' },
    'Confectionery':{ icon: 'cake',         gradient: 'from-pink-400 to-rose-400' },
    'DEFAULT':      { icon: 'inventory_2',  gradient: 'from-slate-400 to-slate-500' },
};

export default function CustomerCatalogPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>('All');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [cartOpen, setCartOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/products')
            .then(res => res.json())
            .then((data: Product[]) => {
                setProducts(data);
                const cats = ['All', ...Array.from(new Set(data.map((p: Product) => p.category)))];
                setCategories(cats);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const filtered = activeCategory === 'All' ? products : products.filter(p => p.category === activeCategory);

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(i => i.product.id === product.id);
            if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
            return [...prev, { product, quantity: 1 }];
        });
    };

    const updateQty = (productId: number, delta: number) => {
        setCart(prev => prev
            .map(i => i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i)
            .filter(i => i.quantity > 0)
        );
    };

    const removeFromCart = (productId: number) => setCart(prev => prev.filter(i => i.product.id !== productId));

    const cartTotal = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
    const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);
    const logisticsFee = cartTotal > 0 ? 45 : 0;

    const placeOrder = async () => {
        if (cart.length === 0) return;
        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: cart.map(i => ({ productId: i.product.id, quantity: i.quantity, unitPrice: i.product.price })) }),
            });
            if (res.ok) {
                setCart([]);
                setCartOpen(false);
                alert('Order placed successfully!');
            } else {
                alert('Failed to place order. Please try again.');
            }
        } catch { alert('Network error. Please try again.'); }
    };

    return (
        <>
            {/* Page Header */}
            <div className="mt-lg mb-xl flex flex-col gap-xs">
                <h1 className="font-headline text-headline-md text-on-surface">Product Catalog</h1>
                <p className="text-on-surface-variant text-body-md">Browse and order from your distributor&apos;s premium inventory.</p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-sm mb-xl overflow-x-auto pb-2 scrollbar-hide">
                {(loading ? ['All', 'Biscuits', 'Dairy', 'Beverages', 'Staples'] : categories).map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-xl py-base rounded-full text-label-lg font-label whitespace-nowrap transition-all ${
                            activeCategory === cat
                                ? 'bg-primary-container text-on-primary-container shadow-md'
                                : 'bg-surface-container-high text-on-surface-variant hover:bg-primary/10 hover:text-primary'
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Product Grid */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-xl">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden animate-pulse">
                            <div className="h-40 bg-surface-container-high" />
                            <div className="p-lg space-y-3">
                                <div className="h-4 bg-surface-container-high rounded w-3/4" />
                                <div className="h-3 bg-surface-container-high rounded w-1/2" />
                                <div className="h-10 bg-surface-container-high rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="py-24 text-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-[64px] opacity-30 block mb-4">inventory_2</span>
                    <p className="font-headline text-headline-sm">No products found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-xl">
                    {filtered.map(product => {
                        const catStyle = CATEGORY_ICONS[product.category] ?? CATEGORY_ICONS.DEFAULT;
                        const inCart = cart.find(i => i.product.id === product.id);
                        const isLowStock = product.stock > 0 && product.stock < 20;
                        const outOfStock = product.stock === 0;
                        return (
                            <div key={product.id} className="bg-surface-container-lowest rounded-xl shadow-card border border-outline-variant hover:shadow-card-hover transition-all group overflow-hidden">
                                {/* Image Area */}
                                <div className={`h-40 w-full bg-gradient-to-br ${catStyle.gradient} flex items-center justify-center relative`}>
                                    <span className={`material-symbols-outlined text-[64px] text-white opacity-40 group-hover:scale-110 transition-transform`} style={{ fontVariationSettings: "'FILL' 1" }}>
                                        {catStyle.icon}
                                    </span>
                                    <div className="absolute top-md right-md bg-white/20 backdrop-blur-md px-sm py-xs rounded-lg text-white text-label-sm font-label font-semibold">
                                        {product.category}
                                    </div>
                                </div>
                                {/* Body */}
                                <div className="p-lg flex flex-col gap-base">
                                    <div className="flex justify-between items-start gap-2">
                                        <h3 className="text-label-lg font-label font-semibold text-on-surface group-hover:text-primary transition-colors line-clamp-2">{product.name}</h3>
                                        <span className={`flex-shrink-0 px-2 py-1 rounded-full text-[10px] font-bold ${outOfStock ? 'bg-error/10 text-error' : isLowStock ? 'bg-amber-100 text-amber-800' : 'bg-tertiary/10 text-tertiary'}`}>
                                            {outOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'}
                                        </span>
                                    </div>
                                    <div className="flex items-baseline gap-xs">
                                        <span className="font-headline text-headline-sm font-semibold text-on-surface">₹{product.price.toLocaleString()}</span>
                                        <span className="text-on-surface-variant text-[12px]">/ unit</span>
                                    </div>
                                    {inCart ? (
                                        <div className="mt-md flex items-center justify-between border border-outline-variant rounded-lg px-md py-sm">
                                            <button onClick={() => updateQty(product.id, -1)} className="text-primary hover:text-primary-container transition-colors">
                                                <span className="material-symbols-outlined text-[20px]">remove</span>
                                            </button>
                                            <span className="text-label-lg font-label font-semibold w-8 text-center">{inCart.quantity}</span>
                                            <button onClick={() => updateQty(product.id, 1)} className="text-primary hover:text-primary-container transition-colors">
                                                <span className="material-symbols-outlined text-[20px]">add</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            disabled={outOfStock}
                                            onClick={() => addToCart(product)}
                                            className="mt-md w-full bg-primary-container text-on-primary-container py-base rounded-lg text-label-lg font-label font-semibold hover:bg-primary-container/90 active:scale-95 transition-all flex items-center justify-center gap-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">add_shopping_cart</span>
                                            Add to Cart
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Cart Drawer Overlay */}
            <div
                className={`fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm transition-opacity z-[60] ${cartOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setCartOpen(false)}
            />

            {/* Floating Cart Button */}
            {totalItems > 0 && !cartOpen && (
                <button
                    onClick={() => setCartOpen(true)}
                    className="fixed bottom-8 right-8 bg-primary text-on-primary px-xl py-md rounded-full shadow-xl flex items-center gap-md hover:bg-primary/90 transition-all hover:scale-105 z-50"
                >
                    <span className="material-symbols-outlined">shopping_cart</span>
                    <span className="text-label-lg font-label font-semibold">{totalItems} items — ₹{cartTotal.toLocaleString()}</span>
                </button>
            )}

            {/* Cart Drawer */}
            <div className={`fixed top-0 right-0 h-full w-[400px] bg-surface-container-lowest shadow-2xl z-[70] transform transition-transform duration-300 flex flex-col ${cartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-xl border-b border-outline-variant flex justify-between items-center bg-surface">
                    <div className="flex items-center gap-md">
                        <span className="material-symbols-outlined text-primary">shopping_basket</span>
                        <h2 className="font-headline text-headline-sm">My Cart</h2>
                    </div>
                    <button className="p-sm hover:bg-surface-container-high rounded-full transition-colors" onClick={() => setCartOpen(false)}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto p-xl flex flex-col gap-lg">
                    {cart.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant py-12">
                            <span className="material-symbols-outlined text-[64px] opacity-30 mb-4">shopping_cart</span>
                            <p className="font-headline text-headline-sm">Cart is empty</p>
                            <p className="text-body-sm mt-1">Add products to get started</p>
                        </div>
                    ) : cart.map(item => (
                        <div key={item.product.id} className="flex gap-md border-b border-outline-variant pb-lg">
                            <div className="w-16 h-16 bg-surface-container rounded-lg flex items-center justify-center flex-shrink-0">
                                <span className="material-symbols-outlined text-on-surface-variant">{CATEGORY_ICONS[item.product.category]?.icon ?? 'inventory_2'}</span>
                            </div>
                            <div className="flex-grow flex flex-col gap-xs">
                                <div className="flex justify-between">
                                    <span className="text-label-lg font-label font-semibold text-on-surface">{item.product.name}</span>
                                    <button className="text-error opacity-60 hover:opacity-100 transition-opacity" onClick={() => removeFromCart(item.product.id)}>
                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                    </button>
                                </div>
                                <div className="flex justify-between items-center mt-sm">
                                    <div className="flex items-center gap-base border border-outline-variant rounded-lg px-sm py-1">
                                        <button className="text-primary" onClick={() => updateQty(item.product.id, -1)}>
                                            <span className="material-symbols-outlined text-[16px]">remove</span>
                                        </button>
                                        <span className="text-label-md font-label w-6 text-center">{item.quantity}</span>
                                        <button className="text-primary" onClick={() => updateQty(item.product.id, 1)}>
                                            <span className="material-symbols-outlined text-[16px]">add</span>
                                        </button>
                                    </div>
                                    <span className="text-label-lg font-label font-semibold text-on-surface">₹{(item.product.price * item.quantity).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {cart.length > 0 && (
                    <div className="p-xl bg-surface-container-low border-t border-outline-variant flex flex-col gap-lg">
                        <div className="flex flex-col gap-base">
                            <div className="flex justify-between text-on-surface-variant">
                                <span className="text-body-md">Subtotal</span>
                                <span className="text-body-md">₹{cartTotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-on-surface-variant">
                                <span className="text-body-md">Logistics Fee</span>
                                <span className="text-body-md">₹{logisticsFee}</span>
                            </div>
                            <div className="flex justify-between font-semibold text-on-surface pt-base border-t border-outline-variant">
                                <span className="font-headline text-headline-sm">Total Amount</span>
                                <span className="font-headline text-headline-sm">₹{(cartTotal + logisticsFee).toLocaleString()}</span>
                            </div>
                        </div>
                        <button
                            onClick={placeOrder}
                            className="w-full bg-tertiary-container text-on-tertiary-container py-md rounded-xl text-label-lg font-label font-semibold flex items-center justify-center gap-md hover:bg-tertiary/20 hover:text-tertiary transition-all active:scale-[0.98]"
                        >
                            <span className="material-symbols-outlined">verified</span>
                            Place Order
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
