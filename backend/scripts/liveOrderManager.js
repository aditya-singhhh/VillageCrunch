// Live Order Management Utility
// Use this file for testing and managing live orders

const LiveOrder = require('../models/LiveOrder');

class LiveOrderManager {
  
  // Get all live orders with optional status filter
  static async getAllOrders(status = null) {
    try {
      const filter = status ? { status } : {};
      const orders = await LiveOrder.find(filter)
        .populate('user', 'name email phone')
        .populate('cartItems.productId', 'name price category')
        .sort({ createdAt: -1 });
      
      return orders;
    } catch (error) {
      console.error('Error fetching live orders:', error);
      throw error;
    }
  }
  
  // Get orders by user ID
  static async getOrdersByUser(userId) {
    try {
      const orders = await LiveOrder.find({ user: userId })
        .populate('user', 'name email phone')
        .populate('cartItems.productId', 'name price category')
        .sort({ createdAt: -1 });
      
      return orders;
    } catch (error) {
      console.error('Error fetching user orders:', error);
      throw error;
    }
  }
  
  // Get order by Razorpay order ID
  static async getOrderByRazorpayId(razorpayOrderId) {
    try {
      const order = await LiveOrder.findOne({ razorpayOrderId })
        .populate('user', 'name email phone')
        .populate('cartItems.productId', 'name price category');
      
      return order;
    } catch (error) {
      console.error('Error fetching order by Razorpay ID:', error);
      throw error;
    }
  }
  
  // Get expired orders (for cleanup)
  static async getExpiredOrders() {
    try {
      const now = new Date();
      const orders = await LiveOrder.find({
        expiryTime: { $lt: now },
        status: { $in: ['created', 'payment_pending'] }
      }).populate('user', 'name email');
      
      return orders;
    } catch (error) {
      console.error('Error fetching expired orders:', error);
      throw error;
    }
  }
  
  // Update order status
  static async updateOrderStatus(liveOrderId, newStatus) {
    try {
      const order = await LiveOrder.findByIdAndUpdate(
        liveOrderId,
        { status: newStatus },
        { new: true }
      ).populate('user', 'name email');
      
      console.log(`✅ Updated order ${liveOrderId} status to: ${newStatus}`);
      return order;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }
  
  // Cleanup expired orders
  static async cleanupExpiredOrders() {
    try {
      const expiredOrders = await this.getExpiredOrders();
      
      for (let order of expiredOrders) {
        await this.updateOrderStatus(order._id, 'cancelled');
        console.log(`🗑️  Marked expired order as cancelled: ${order.razorpayOrderId}`);
      }
      
      return expiredOrders.length;
    } catch (error) {
      console.error('Error cleaning up expired orders:', error);
      throw error;
    }
  }
  
  // Get order statistics
  static async getOrderStats() {
    try {
      // Group by status in JavaScript (Firestore has no aggregation pipeline)
      const all = await LiveOrder.find({}).select('status amount');
      const grouped = new Map();
      for (const o of all) {
        const g = grouped.get(o.status) || { _id: o.status, count: 0, totalAmount: 0 };
        g.count += 1;
        g.totalAmount += o.amount || 0;
        grouped.set(o.status, g);
      }
      const stats = [...grouped.values()];
      
      const totalOrders = await LiveOrder.countDocuments();
      
      return {
        totalOrders,
        byStatus: stats.reduce((acc, stat) => {
          acc[stat._id] = {
            count: stat.count,
            totalAmount: stat.totalAmount
          };
          return acc;
        }, {})
      };
    } catch (error) {
      console.error('Error fetching order stats:', error);
      throw error;
    }
  }
  
  // Convert live order to full order (when payment is complete)
  static async convertToFullOrder(liveOrderId, shippingAddress) {
    try {
      const liveOrder = await LiveOrder.findById(liveOrderId)
        .populate('cartItems.productId');
      
      if (!liveOrder) {
        throw new Error('Live order not found');
      }
      
      if (liveOrder.status !== 'paid') {
        throw new Error('Live order is not in paid status');
      }
      
      // Create full order using the method in LiveOrder model
      const fullOrder = liveOrder.convertToFullOrder(shippingAddress);
      await fullOrder.save();
      
      // Update live order to mark as converted
      liveOrder.status = 'converted_to_order';
      liveOrder.finalOrderId = fullOrder._id;
      await liveOrder.save();
      
      console.log(`✅ Converted live order ${liveOrderId} to full order ${fullOrder._id}`);
      
      return {
        liveOrder,
        fullOrder
      };
    } catch (error) {
      console.error('Error converting to full order:', error);
      throw error;
    }
  }
}

module.exports = LiveOrderManager;

// Example usage (uncomment to test):
/*
(async () => {
  await require('../db').connect();
  
  // Get all orders
  const allOrders = await LiveOrderManager.getAllOrders();
  console.log('All orders:', allOrders.length);
  
  // Get orders by status
  const createdOrders = await LiveOrderManager.getAllOrders('created');
  console.log('Created orders:', createdOrders.length);
  
  // Get order statistics
  const stats = await LiveOrderManager.getOrderStats();
  console.log('Order stats:', stats);
  
  // Cleanup expired orders
  const cleanedUp = await LiveOrderManager.cleanupExpiredOrders();
  console.log('Cleaned up orders:', cleanedUp);
})();
*/