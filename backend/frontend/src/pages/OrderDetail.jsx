import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { formatINR } from "../utils/format";
import { getOrder } from "../utils/api"; // your api.js file
import { Loader2, ArrowLeft, Check, XCircle } from "lucide-react";
import { imgSrc, imgProps } from '../utils/img';

const OrdersDetail = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const data = await getOrder(id);
        setOrder(data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load order details");
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  if (loading) {
    return (
      <div className="container-page py-16 flex justify-center items-center" aria-busy="true">
        <Loader2 className="w-6 h-6 animate-spin text-ink-soft" />
        <span className="ml-2 text-ink-soft">Loading order details...</span>
      </div>
    );
  }

  if (error) {
    return <p role="alert" className="text-center text-berry py-16">{error}</p>;
  }

  if (!order) {
    return <p className="text-center text-ink-mute py-16">No order found.</p>;
  }

  const STEPS = ['pending', 'confirmed', 'shipped', 'delivered'];
  const LABELS = { pending: 'Placed', confirmed: 'Confirmed', shipped: 'Shipped', delivered: 'Delivered' };
  const cancelled = order.status === 'cancelled';
  const current = Math.max(0, STEPS.indexOf(order.status === 'processing' ? 'confirmed' : order.status));
  const addr = order.shippingAddress;

  return (
    <div className="container-page py-8 md:py-12">
      <div className="max-w-3xl">
        <Link to="/orders" className="btn-ghost -ml-3 mb-2 h-11"><ArrowLeft className="w-4 h-4" aria-hidden="true" /> My orders</Link>
        <h1 className="page-title">Order details</h1>
        <p className="mt-1 text-ink-soft break-all">Order {order.orderNumber}</p>

        {/* Status timeline */}
        <section className="panel mt-6" aria-label="Order status">
          {cancelled ? (
            <p className="flex items-center gap-2 font-semibold text-berry"><XCircle className="w-5 h-5" aria-hidden="true" /> This order was cancelled</p>
          ) : (
            <ol className="grid grid-cols-4 gap-1">
              {STEPS.map((st, i) => {
                const done = i <= current;
                return (
                  <li key={st} className="flex flex-col items-center text-center gap-2 relative">
                    {i > 0 && <span className={`absolute top-4 right-1/2 w-full h-0.5 -z-0 ${i <= current ? 'bg-leaf' : 'bg-sand'}`} aria-hidden="true" />}
                    <span className={`relative z-10 w-8 h-8 rounded-full inline-flex items-center justify-center ${done ? 'bg-leaf text-white' : 'bg-cream text-ink-mute'}`}>
                      {done ? <Check className="w-4 h-4" aria-hidden="true" /> : <span className="text-xs font-semibold">{i + 1}</span>}
                    </span>
                    <span className={`text-sm ${done ? 'font-semibold text-ink' : 'text-ink-mute'}`}>{LABELS[st]}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <div className="grid md:grid-cols-2 gap-5 mt-5">
          <section className="panel" aria-labelledby="od-pay">
            <h2 id="od-pay" className="font-display text-lg font-semibold mb-2">Payment</h2>
            <p className="text-ink-soft">Method: <span className="text-ink font-medium">{order.paymentInfo?.method ? order.paymentInfo.method.toUpperCase() : 'N/A'}</span></p>
            <p className="text-ink-soft">Status: <span className={`font-medium ${order.isPaid ? 'text-leaf' : 'text-ink'}`}>{order.isPaid ? 'Paid' : 'Pending'}</span></p>
          </section>
          <section className="panel" aria-labelledby="od-ship">
            <h2 id="od-ship" className="font-display text-lg font-semibold mb-2">Delivery address</h2>
            {addr ? (
              <div className="text-ink-soft">
                <p>{addr.address || addr.street}</p>
                <p>{addr.city}, {addr.state} - {addr.postalCode || addr.pincode}</p>
                {addr.country && <p>{addr.country}</p>}
              </div>
            ) : (
              <p className="text-ink-mute">No shipping address available</p>
            )}
          </section>
        </div>

        <section className="panel mt-5" aria-labelledby="od-items">
          <h2 id="od-items" className="font-display text-lg font-semibold mb-3">Items</h2>
          {order.items && order.items.length > 0 ? (
            <ul className="divide-y divide-line">
              {order.items.map((item, idx) => {
                const qty = Number(item.quantity || item.qty || 1);
                const price = Number(item.price || 0);
                return (
                  <li key={idx} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    {item.image && (
                      <img src={imgSrc(item.image, 400)} alt="" width="64" height="64" loading="lazy" decoding="async"
                        className="w-16 h-16 rounded-md object-cover bg-cream flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-ink line-clamp-2">{item.name || item.product?.name}</h3>
                      <p className="text-sm text-ink-mute">{qty} x {formatINR(price)}</p>
                    </div>
                    <p className="font-semibold tabular-nums whitespace-nowrap">{formatINR(qty * price)}</p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-ink-mute">No items found in this order.</p>
          )}
        </section>

        <section className="panel mt-5" aria-labelledby="od-sum">
          <h2 id="od-sum" className="font-display text-lg font-semibold mb-3">Price breakdown</h2>
          <dl className="space-y-2 text-[15px]">
            <div className="flex justify-between"><dt className="text-ink-soft">Items</dt><dd className="tabular-nums">{formatINR(order.itemsPrice)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-soft">Tax</dt><dd className="tabular-nums">{formatINR(order.taxPrice)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-soft">Shipping</dt><dd className="tabular-nums">{Number(order.shippingPrice) === 0 ? 'Free' : formatINR(order.shippingPrice)}</dd></div>
          </dl>
          <div className="border-t border-line mt-3 pt-3 flex justify-between items-baseline">
            <span className="font-semibold">Total</span>
            <span className="text-xl font-semibold tabular-nums">{formatINR(order.totalPrice)}</span>
          </div>
        </section>

        <p className="mt-6 text-ink-soft">Need help with this order? <Link to="/support" className="text-action underline underline-offset-2">Contact support</Link></p>
      </div>
    </div>
  );
};

export default OrdersDetail;
