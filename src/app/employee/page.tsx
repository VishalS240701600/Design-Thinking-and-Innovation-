'use client';

import { useEffect, useState } from 'react';

interface Product {
    id: number;
    name: string;
    category: string;
    price: number;
    stock: number;
    sku?: string;
}

interface Customer {
    id: number;
    name: string;
}

interface OrderItem {
    product: Product;
    quantity: number;
}

interface RecentOrder {
    id: number;
    totalAmount: number;
    status: string;
    createdAt: string;
    customer: { name: string };
}

export default function EmployeePage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<'Credit' | 'Cash' | 'UPI'>('Credit');
    const [deliveryNotes, setDeliveryNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showProductSearch, setShowProductSearch] = useState(false);

    useEffect(() => {
        fetch('/api/products').then(r => r.json()).then(setProducts).catch(() => {});
        fetch('/api/customers').then(r => r.json()).then(setCustomers).catch(() => {});
        fetch('/api/orders').then(r => r.json()).then((data) => setRecentOrders((data.orders || data).slice(0, 3))).catch(() => {});
    }, []);

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sku ?? '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const addProduct = (product: Product) => {
        setOrderItems(prev => {
            if (prev.find(i => i.product.id === product.id)) return prev;
            return [...prev, { product, quantity: 1 }];
        });
        setShowProductSearch(false);
        setSearchQuery('');
    };

    const updateQty = (productId: number, delta: number) => {
        setOrderItems(prev => prev
            .map(i => i.product.id === productId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i)
        );
    };

    const removeItem = (productId: number) => setOrderItems(prev => prev.filter(i => i.product.id !== productId));

    const subtotal = orderItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
    const gst = subtotal * 0.18;
    const total = subtotal + gst;

    const submitOrder = async () => {
        if (!selectedCustomerId || orderItems.length === 0) {
            alert('Please select a customer and add at least one product.');
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerId: parseInt(selectedCustomerId),
                    items: orderItems.map(i => ({ productId: i.product.id, quantity: i.quantity, unitPrice: i.product.price })),
                    notes: deliveryNotes,
                }),
            });
            if (res.ok) {
                setOrderItems([]);
                setSelectedCustomerId('');
                setDeliveryNotes('');
                alert('Order submitted successfully!');
                // Refresh recent orders
                fetch('/api/orders').then(r => r.json()).then((data) => setRecentOrders((data.orders || data).slice(0, 3))).catch(() => {});
            } else {
                const d = await res.json();
                alert(d.error || 'Failed to submit order');
            }
        } catch { alert('Network error. Please try again.'); }
        finally { setSubmitting(false); }
    };

    const statusConfig: Record<string, { bg: string; text: string }> = {
        CONFIRMED:  { bg: 'bg-tertiary-container/20', text: 'text-tertiary' },
        DELIVERED:  { bg: 'bg-tertiary-container/20', text: 'text-tertiary' },
        SHIPPED:    { bg: 'bg-primary-container/20',  text: 'text-primary' },
        PENDING:    { bg: 'bg-amber-100',              text: 'text-amber-800' },
        CANCELLED:  { bg: 'bg-error-container',        text: 'text-error' },
    };

    return (
        <>
            {/* Top Nav */}
            <header className="h-16 px-xl flex justify-between items-center bg-surface sticky top-0 z-40 border-b border-outline-variant/30">
                <h2 className="font-headline text-headline-md text-primary">Enter New Order</h2>
                <div className="flex items-center gap-lg">
                    <div className="relative w-80">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
                        <input
                            className="w-full pl-10 pr-4 py-2 bg-surface-container-highest border-none rounded-xl text-body-sm focus:ring-2 focus:ring-primary/20 outline-none"
                            placeholder="Search products or SKU..."
                            type="text"
                            value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); setShowProductSearch(true); }}
                            onFocus={() => setShowProductSearch(true)}
                        />
                        {/* Product Search Dropdown */}
                        {showProductSearch && searchQuery && (
                            <div className="absolute top-full mt-1 left-0 right-0 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                                {filteredProducts.length === 0 ? (
                                    <div className="p-md text-on-surface-variant text-body-sm text-center">No products found</div>
                                ) : filteredProducts.slice(0, 8).map(p => (
                                    <button
                                        key={p.id}
                                        className="w-full flex items-center gap-md p-md hover:bg-surface-container-low transition-colors text-left"
                                        onClick={() => addProduct(p)}
                                    >
                                        <span className="material-symbols-outlined text-primary">inventory_2</span>
                                        <div>
                                            <p className="text-label-lg font-label font-semibold">{p.name}</p>
                                            <p className="text-[11px] text-on-surface-variant">₹{p.price} · Stock: {p.stock}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button className="relative p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors">
                        <span className="material-symbols-outlined">notifications</span>
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full border-2 border-surface"></span>
                    </button>
                </div>
            </header>

            <div
                className="p-xl max-w-[1200px] mx-auto space-y-lg"
                onClick={() => { if (showProductSearch) setShowProductSearch(false); }}
            >
                <div className="grid grid-cols-12 gap-lg">
                    {/* Left: Form */}
                    <div className="col-span-12 lg:col-span-8 space-y-lg">
                        {/* Customer Selection */}
                        <section className="bg-surface-container-lowest p-lg rounded-xl shadow-card border border-outline-variant">
                            <div className="flex items-center gap-sm mb-lg">
                                <span className="material-symbols-outlined text-primary">person_add</span>
                                <h3 className="font-headline text-headline-sm text-on-surface">Customer Selection</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-lg">
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-label-lg font-label text-on-surface-variant mb-xs">Select Customer</label>
                                    <select
                                        className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-md text-body-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                        value={selectedCustomerId}
                                        onChange={e => setSelectedCustomerId(e.target.value)}
                                    >
                                        <option value="">Search customer store name...</option>
                                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-label-lg font-label text-on-surface-variant mb-xs">Order Date</label>
                                    <input
                                        type="date"
                                        className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-md text-body-md focus:ring-2 focus:ring-primary outline-none"
                                        value={orderDate}
                                        onChange={e => setOrderDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Product Selection */}
                        <section className="bg-surface-container-lowest p-lg rounded-xl shadow-card border border-outline-variant">
                            <div className="flex justify-between items-center mb-lg">
                                <div className="flex items-center gap-sm">
                                    <span className="material-symbols-outlined text-primary">list_alt</span>
                                    <h3 className="font-headline text-headline-sm text-on-surface">Product Selection</h3>
                                </div>
                                <button
                                    className="flex items-center gap-xs text-primary text-label-lg font-label font-semibold hover:underline transition-all"
                                    onClick={() => { setShowProductSearch(true); (document.querySelector('header input') as HTMLInputElement)?.focus(); }}
                                >
                                    <span className="material-symbols-outlined text-[18px]">add</span>
                                    Add Product
                                </button>
                            </div>

                            {orderItems.length === 0 ? (
                                <div className="py-8 text-center text-on-surface-variant border-2 border-dashed border-outline-variant rounded-xl">
                                    <span className="material-symbols-outlined text-[48px] opacity-30 block mb-2">add_shopping_cart</span>
                                    <p className="text-body-sm">Search for products above to add them to this order</p>
                                </div>
                            ) : (
                                <div className="overflow-hidden border border-outline-variant rounded-lg">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-surface-container-high text-label-lg font-label text-on-surface-variant border-b border-outline-variant">
                                            <tr>
                                                <th className="p-md">Product Details</th>
                                                <th className="p-md text-center">Quantity</th>
                                                <th className="p-md text-right">Unit Price</th>
                                                <th className="p-md text-right">Total</th>
                                                <th className="p-md text-center">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-outline-variant">
                                            {orderItems.map(item => (
                                                <tr key={item.product.id} className="hover:bg-surface-container transition-colors">
                                                    <td className="p-md">
                                                        <div className="flex items-center gap-md">
                                                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex-shrink-0 flex items-center justify-center text-primary">
                                                                <span className="material-symbols-outlined text-[20px]">inventory_2</span>
                                                            </div>
                                                            <div>
                                                                <div className="text-label-lg font-label font-semibold text-on-surface">{item.product.name}</div>
                                                                <div className="text-[11px] text-on-surface-variant">{item.product.category}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-md">
                                                        <div className="flex items-center justify-center gap-md">
                                                            <button
                                                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-outline text-primary hover:bg-primary-container transition-colors"
                                                                onClick={() => updateQty(item.product.id, -1)}
                                                            >
                                                                <span className="material-symbols-outlined text-[18px]">remove</span>
                                                            </button>
                                                            <span className="w-10 text-center text-label-lg font-label font-semibold">{item.quantity}</span>
                                                            <button
                                                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-outline text-primary hover:bg-primary-container transition-colors"
                                                                onClick={() => updateQty(item.product.id, 1)}
                                                            >
                                                                <span className="material-symbols-outlined text-[18px]">add</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="p-md text-right text-label-lg font-label">₹{item.product.price.toFixed(2)}</td>
                                                    <td className="p-md text-right font-bold text-on-surface">₹{(item.product.price * item.quantity).toFixed(2)}</td>
                                                    <td className="p-md text-center">
                                                        <button className="text-error opacity-50 hover:opacity-100 transition-opacity" onClick={() => removeItem(item.product.id)}>
                                                            <span className="material-symbols-outlined">delete_outline</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Right: Summary */}
                    <div className="col-span-12 lg:col-span-4 space-y-lg">
                        <section className="bg-surface-container-lowest p-lg rounded-xl shadow-lg border border-outline-variant sticky top-20">
                            <h3 className="font-headline text-headline-sm text-on-surface mb-lg">Order Summary</h3>
                            <div className="space-y-md mb-xl">
                                <div className="flex justify-between text-label-lg font-label text-on-surface-variant">
                                    <span>Subtotal</span>
                                    <span className="text-body-md text-on-surface">₹{subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-label-lg font-label text-on-surface-variant">
                                    <span>GST (18%)</span>
                                    <span className="text-body-md text-on-surface">₹{gst.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-label-lg font-label text-on-surface-variant">
                                    <span>Shipping Fee</span>
                                    <span className="text-body-md text-secondary font-semibold">FREE</span>
                                </div>
                                <div className="pt-md border-t border-outline-variant flex justify-between items-end">
                                    <span className="font-headline text-headline-sm text-on-surface">Total Amount</span>
                                    <span className="font-headline text-[24px] font-bold text-primary">₹{total.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="space-y-md">
                                {/* Payment Method */}
                                <div className="flex flex-col gap-xs">
                                    <label className="text-label-sm font-label text-on-surface-variant uppercase tracking-wider">Payment Method</label>
                                    <div className="flex gap-sm">
                                        {(['Credit', 'Cash', 'UPI'] as const).map(method => (
                                            <button
                                                key={method}
                                                onClick={() => setPaymentMethod(method)}
                                                className={`flex-1 py-2 px-md rounded-lg text-label-lg font-label text-sm transition-all ${
                                                    paymentMethod === method
                                                        ? 'border-2 border-primary bg-primary-container/10 text-primary font-semibold'
                                                        : 'border border-outline-variant text-on-surface-variant hover:bg-surface-container'
                                                }`}
                                            >
                                                {method}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Bulk discount hint */}
                                {subtotal > 5000 && (
                                    <div className="p-md bg-secondary-container/10 rounded-xl border border-secondary/20 flex gap-sm items-start">
                                        <span className="material-symbols-outlined text-secondary text-[20px] flex-shrink-0">verified</span>
                                        <p className="text-[11px] text-secondary font-medium leading-relaxed">
                                            This customer is eligible for a 2% bulk-order discount. Applied automatically at final processing.
                                        </p>
                                    </div>
                                )}

                                {/* Submit */}
                                <button
                                    disabled={submitting || !selectedCustomerId || orderItems.length === 0}
                                    onClick={submitOrder}
                                    className="w-full bg-primary text-on-primary font-bold py-md rounded-xl shadow-md hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                >
                                    {submitting ? (
                                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</>
                                    ) : (
                                        <><span className="material-symbols-outlined">send</span> Submit Order</>
                                    )}
                                </button>
                                <button
                                    className="w-full text-on-surface-variant text-label-lg font-label py-sm hover:text-on-surface transition-colors"
                                    onClick={() => { setOrderItems([]); setSelectedCustomerId(''); }}
                                >
                                    Clear Order
                                </button>
                            </div>
                        </section>

                        {/* Delivery Notes */}
                        <section className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-card">
                            <label className="block text-label-lg font-label text-on-surface-variant mb-xs">Delivery Notes</label>
                            <textarea
                                className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-md text-body-sm focus:ring-2 focus:ring-primary outline-none resize-none"
                                placeholder="Special handling or delivery window instructions..."
                                rows={3}
                                value={deliveryNotes}
                                onChange={e => setDeliveryNotes(e.target.value)}
                            />
                        </section>
                    </div>
                </div>

                {/* Recent Orders */}
                {recentOrders.length > 0 && (
                    <section className="mt-xl">
                        <h3 className="font-headline text-headline-sm text-on-surface mb-lg">Recent Customer Orders</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
                            {recentOrders.map(order => {
                                const cfg = statusConfig[order.status] ?? { bg: 'bg-surface-container', text: 'text-on-surface-variant' };
                                return (
                                    <div key={order.id} className="glass-panel p-md rounded-xl border border-outline-variant/30 flex items-center justify-between">
                                        <div>
                                            <div className="text-[11px] text-on-surface-variant font-bold uppercase tracking-wider">ORD-{order.id}</div>
                                            <div className="text-label-lg font-label font-semibold text-on-surface">₹{order.totalAmount.toLocaleString()}</div>
                                            <div className="text-[11px] text-on-surface-variant">{order.customer?.name}</div>
                                        </div>
                                        <span className={`${cfg.bg} ${cfg.text} text-[10px] px-2 py-1 rounded-full font-bold uppercase`}>
                                            {order.status}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}
            </div>
        </>
    );
}
