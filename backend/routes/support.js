const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const CustomerSupport = require('../models/CustomerSupport');
const { protect, admin } = require('../middleware/auth');

// Configure multer for image uploads
const { dirs, imageFileFilter, safeExtension } = require('../config/uploads');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, dirs.support);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + require('crypto').randomBytes(6).toString('hex');
    cb(null, 'support-' + uniqueSuffix + safeExtension(file));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: imageFileFilter,
});

// Create new support ticket
router.post('/create', protect, async (req, res) => {
  try {
    const { message, orderId, category } = req.body;

    const supportTicket = await CustomerSupport.create({
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      userPhone: req.user.phone,
      orderId,
      category: category || 'other',
      messages: [{
        sender: 'customer',
        senderName: req.user.name,
        message,
        timestamp: new Date()
      }]
    });

    res.status(201).json({
      success: true,
      ticket: supportTicket
    });
  } catch (error) {
    console.error('Create support ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create support ticket',
      error: error.message
    });
  }
});

// Send message in existing ticket
router.post('/:ticketId/message', protect, upload.single('image'), async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { message } = req.body;

    const ticket = await CustomerSupport.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    // Check if user owns this ticket
    if (ticket.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this ticket'
      });
    }

    const newMessage = {
      sender: 'customer',
      senderName: req.user.name,
      message,
      timestamp: new Date()
    };

    if (req.file) {
      newMessage.image = `/uploads/support-images/${req.file.filename}`;
    }

    ticket.messages.push(newMessage);
    ticket.status = 'in-progress';
    await ticket.save();

    res.json({
      success: true,
      message: 'Message sent successfully',
      ticket
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
});

// Get user's support tickets
router.get('/my-tickets', protect, async (req, res) => {
  try {
    const tickets = await CustomerSupport.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .populate('orderId', 'orderNumber status');

    res.json({
      success: true,
      tickets
    });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tickets',
      error: error.message
    });
  }
});

// Get single ticket with messages
router.get('/:ticketId', protect, async (req, res) => {
  try {
    const ticket = await CustomerSupport.findById(req.params.ticketId)
      .populate('orderId', 'orderNumber status totalAmount items');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    // Check if user owns this ticket or is admin
    if (ticket.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this ticket'
      });
    }

    // Mark messages as read
    ticket.messages.forEach(msg => {
      if (msg.sender === 'agent') {
        msg.read = true;
      }
    });
    await ticket.save();

    res.json({
      success: true,
      ticket
    });
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ticket',
      error: error.message
    });
  }
});

// Admin: Get all tickets
router.get('/admin/all', protect, admin, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const { status, priority } = req.query;
    const filter = {};
    
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const tickets = await CustomerSupport.find(filter)
      .sort({ updatedAt: -1 })
      .populate('userId', 'name email phone')
      .populate('orderId', 'orderNumber status');

    res.json({
      success: true,
      tickets
    });
  } catch (error) {
    console.error('Get all tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tickets',
      error: error.message
    });
  }
});

// Admin: Reply to ticket
router.post('/admin/:ticketId/reply', protect, admin, upload.single('image'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const { ticketId } = req.params;
    const { message, status, priority, requestCallback } = req.body;

    const ticket = await CustomerSupport.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    const agentMessage = {
      sender: 'agent',
      senderName: req.user.name || 'Customer Care',
      message,
      timestamp: new Date()
    };

    if (req.file) {
      agentMessage.image = `/uploads/support-images/${req.file.filename}`;
    }

    ticket.messages.push(agentMessage);
    
    if (status) ticket.status = status;
    if (priority) ticket.priority = priority;
    if (requestCallback) ticket.callbackRequested = true;
    if (!ticket.assignedAgent) {
      ticket.assignedAgent = req.user._id;
      ticket.agentName = req.user.name;
    }

    await ticket.save();

    res.json({
      success: true,
      message: 'Reply sent successfully',
      ticket
    });
  } catch (error) {
    console.error('Admin reply error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send reply',
      error: error.message
    });
  }
});

// Admin: Close ticket
router.put('/admin/:ticketId/close', protect, admin, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const { resolution } = req.body;

    const ticket = await CustomerSupport.findByIdAndUpdate(
      req.params.ticketId,
      {
        status: 'closed',
        resolution,
        closedAt: new Date()
      },
      { new: true }
    );

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Support ticket not found'
      });
    }

    res.json({
      success: true,
      message: 'Ticket closed successfully',
      ticket
    });
  } catch (error) {
    console.error('Close ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to close ticket',
      error: error.message
    });
  }
});

module.exports = router;
