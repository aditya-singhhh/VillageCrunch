import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getOrder } from "../utils/api"; // your api.js file
import { Loader2 } from "lucide-react";

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
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
        <span className="ml-2 text-gray-600">Loading order details...</span>
      </div>
    );
  }

  if (error) {
    return <p className="text-center text-red-600 mt-10">{error}</p>;
  }

  if (!order) {
    return <p className="text-center text-gray-500 mt-10">No order found.</p>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-sm mt-10">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Order Details</h1>

      {/* ✅ Order Info */}
      <div className="border-b pb-4 mb-4">
        <p className="text-gray-700">
          <strong>Order Number:</strong> {order.orderNumber}
        </p>
        <p className="text-gray-700">
          <strong>Status:</strong> {order.status}
        </p>
        <p className="text-gray-700">
          <strong>Payment Method:</strong> {order.paymentInfo?.method?.toUpperCase()}
        </p>
        <p className="text-gray-700">
          <strong>Payment Status:</strong>{" "}
          {order.isPaid ? "Paid ✅" : "Pending ❌"}
        </p>
      </div>

      {/* ✅ Shipping Address */}
      <div className="border-b pb-4 mb-4">
        <h3 className="text-lg font-semibold mb-2 text-gray-800">
          Shipping Address
        </h3>
        {order.shippingAddress ? (
          <div className="text-gray-700">
            <p>{order.shippingAddress.address}</p>
            <p>
              {order.shippingAddress.city}, {order.shippingAddress.state} -{" "}
              {order.shippingAddress.postalCode}
            </p>
            <p>{order.shippingAddress.country}</p>
          </div>
        ) : (
          <p className="text-gray-500">No shipping address available</p>
        )}
      </div>

      {/* ✅ Ordered Items */}
      <div className="border-b pb-4 mb-4">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">Items</h3>
        {order.items && order.items.length > 0 ? (
          order.items.map((item, idx) => {
            const qty = Number(item.quantity || item.qty || 1);
            const price = Number(item.price || 0);
            const total = qty * price;

            return (
              <div
                key={idx}
                className="flex items-center py-3 border-t last:border-b-0"
              >
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 rounded-md object-cover border"
                  />
                )}
                <div className="ml-4 flex-1">
                  <h4 className="font-medium text-gray-900">
                    {item.name || item.product?.name}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {qty} × ₹{price} = ₹{total.toFixed(2)}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-gray-500">No items found in this order.</p>
        )}
      </div>

      {/* ✅ Price Summary */}
      <div className="mt-6 bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2 text-gray-800">
          Order Summary
        </h3>
        <p className="text-gray-700 flex justify-between">
          <span>Items Price:</span>
          <span>₹{Number(order.itemsPrice).toFixed(2)}</span>
        </p>
        <p className="text-gray-700 flex justify-between">
          <span>Tax:</span>
          <span>₹{Number(order.taxPrice).toFixed(2)}</span>
        </p>
        <p className="text-gray-700 flex justify-between">
          <span>Shipping:</span>
          <span>₹{Number(order.shippingPrice).toFixed(2)}</span>
        </p>
        <p className="text-gray-900 font-bold flex justify-between mt-2">
          <span>Total:</span>
          <span>₹{Number(order.totalPrice).toFixed(2)}</span>
        </p>
      </div>
    </div>
  );
};

export default OrdersDetail;
