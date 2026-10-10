# 📞 Customer Support System - Complete Guide

## Overview
Real-time customer support system with AI chatbot ("Villy") and human agent escalation. Similar to food delivery apps (Zomato/Swiggy) where customers can report issues, upload images, and receive support via chat.

---

## 🎯 Features Implemented

### 1. **AI Chatbot - "Villy"**
- Natural language processing for common queries
- Product information and recommendations
- Order tracking and status
- Payment and delivery information
- Automatic issue detection and agent routing

### 2. **Customer Care Agent Connection**
- Seamless transition from AI to human support
- Support ticket creation in database
- Image upload capability (5MB limit)
- Different message bubble colors for clarity
- Real-time chat interface

### 3. **Image Upload**
- Customers can upload product images
- Supported formats: JPEG, JPG, PNG, GIF, WEBP
- 5MB file size limit
- Preview before sending
- Stored in `backend/uploads/support-images/`

### 4. **Admin Support Panel**
- View all support tickets
- Filter by status (open, in-progress, resolved, closed)
- Reply to customer messages
- Call or email customers directly
- Close tickets with resolution notes
- Priority and status management

---

## 📁 File Structure

```
backend/
├── models/
│   └── CustomerSupport.js          # Database schema for support tickets
├── routes/
│   └── support.js                  # API endpoints for support system
├── uploads/
│   └── support-images/             # Storage for uploaded images
└── server.js                       # Added support routes

frontend/src/
├── components/
│   └── AIChatbot.jsx               # Chatbot with agent connection
├── pages/
│   └── CustomerSupport.jsx         # Admin panel for tickets
└── App.jsx                         # Added /support route
```

---

## 🗄️ Database Schema

### CustomerSupport Model

```javascript
{
  userId: ObjectId,               // Customer ID
  userName: String,               // Customer name
  userEmail: String,              // Customer email
  userPhone: String,              // Customer phone
  orderId: ObjectId,              // Related order (optional)
  status: String,                 // open, in-progress, resolved, closed
  priority: String,               // low, medium, high, urgent
  messages: [
    {
      sender: String,             // customer, agent, system
      senderName: String,
      message: String,
      image: String,              // URL or path
      timestamp: Date,
      read: Boolean
    }
  ],
  assignedAgent: ObjectId,        // Admin who handled
  agentName: String,
  category: String,               // product-issue, delivery, refund, etc.
  resolution: String,             // Final resolution notes
  callbackRequested: Boolean,
  callbackCompleted: Boolean,
  createdAt: Date,
  updatedAt: Date,
  closedAt: Date
}
```

---

## 🔌 API Endpoints

### Customer Endpoints

#### 1. Create Support Ticket
```http
POST /api/support/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "Product arrived damaged",
  "orderId": "12345",
  "category": "product-issue"
}
```

#### 2. Send Message in Ticket
```http
POST /api/support/:ticketId/message
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "message": "Here's the product image",
  "image": <file>
}
```

#### 3. Get My Tickets
```http
GET /api/support/my-tickets
Authorization: Bearer <token>
```

#### 4. Get Single Ticket
```http
GET /api/support/:ticketId
Authorization: Bearer <token>
```

### Admin Endpoints

#### 1. Get All Tickets
```http
GET /api/support/admin/all?status=open&priority=high
Authorization: Bearer <admin-token>
```

#### 2. Reply to Ticket
```http
POST /api/support/admin/:ticketId/reply
Authorization: Bearer <admin-token>
Content-Type: multipart/form-data

{
  "message": "We'll send replacement",
  "status": "in-progress",
  "priority": "high",
  "requestCallback": true
}
```

#### 3. Close Ticket
```http
PUT /api/support/admin/:ticketId/close
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "resolution": "Replacement sent successfully"
}
```

---

## 🎨 UI Components

### AIChatbot Component
- **Location**: `frontend/src/components/AIChatbot.jsx`
- **Features**:
  - Floating chat button (bottom-right)
  - Expandable chat window
  - AI responses for common queries
  - "Connect to Agent" button
  - Image upload when connected to agent
  - Different message bubble colors:
    - 🟡 Gold: Customer messages
    - ⚪ White: AI (Villy) responses
    - 🟢 Green: Agent messages
    - 🔵 Blue: System messages

### CustomerSupport Page
- **Location**: `frontend/src/pages/CustomerSupport.jsx`
- **Route**: `/support`
- **Access**: Protected (login required)
- **Features**:
  - Ticket list with status badges
  - Full conversation view
  - Reply functionality (admin only)
  - Call/Email customer buttons (admin only)
  - Close ticket option (admin only)
  - Real-time message updates

---

## 🔄 User Flow

### Customer Journey

1. **Customer clicks chat icon** → Villy AI chatbot opens
2. **Customer asks question** → AI provides relevant answer
3. **Customer reports issue** → AI detects problem keywords
4. **AI offers agent connection** → "Connect to Customer Care" button appears
5. **Customer clicks connect** → Support ticket created in database
6. **System message shown** → "Connected to Customer Care"
7. **Customer can upload images** → Upload button becomes available
8. **Customer sends message/image** → Saved to database with ticket ID
9. **Agent replies** → Customer sees green message bubble
10. **Issue resolved** → Agent closes ticket

### Admin Journey

1. **Admin visits** `/support` page
2. **Sees all tickets** → Filtered by status
3. **Clicks on ticket** → Opens conversation
4. **Reads customer messages** → Sees all messages and images
5. **Calls customer if needed** → Click phone icon
6. **Replies via chat** → Customer receives response
7. **Closes ticket** → Adds resolution notes

---

## 💡 AI Response Logic

Villy detects these keywords and provides appropriate responses:

| Keyword Category | Triggers | Response |
|-----------------|----------|----------|
| Products | "product", "item", "makhana", "thekua" | Product list with prices |
| Pricing | "price", "cost", "rate" | Price range and shipping info |
| Delivery | "deliver", "shipping", "ship" | Delivery timeline |
| Quality | "quality", "fresh", "natural" | Quality assurance message |
| Payment | "payment", "cod", "order" | Payment methods |
| **Issues** | "issue", "problem", "damaged", "broken" | **Offers agent connection** |
| Returns | "return", "refund", "replace" | Returns policy + agent option |
| Recommendations | "recommend", "suggest", "best" | Popular products |
| Help | "help", "support", "contact" | Support options + agent button |

**🔴 Critical**: When issue keywords are detected, AI stops responding and shows "Connect to Customer Care" button.

---

## 🚀 Setup Instructions

### 1. Install Dependencies
```bash
cd backend
npm install multer
```

### 2. Create Upload Directory
```bash
mkdir -p backend/uploads/support-images
```

### 3. Start Backend Server
```bash
cd backend
npm run dev
```

### 4. Start Frontend
```bash
cd backend/frontend
npm run dev
```

### 5. Access Support Panel
- **Customer View**: Chat icon (bottom-right on all pages)
- **Admin Panel**: Navigate to `/support` after admin login

---

## 🛠️ Configuration

### Image Upload Settings
Located in `backend/routes/support.js`:

```javascript
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    // Allow only image files
  }
});
```

### API Base URL
Located in `frontend/src/components/AIChatbot.jsx`:

```javascript
const API_URL = 'http://localhost:8080/api/support';
```

**🚨 Remember to change this for production!**

---

## 📊 Status & Priority Levels

### Status Options
- **open**: New ticket, not yet handled
- **in-progress**: Agent is working on it
- **resolved**: Issue fixed, awaiting confirmation
- **closed**: Ticket completed

### Priority Levels
- **low**: General inquiries
- **medium**: Standard issues
- **high**: Urgent customer problems
- **urgent**: Critical issues requiring immediate attention

---

## 🎯 Future Enhancements

### Recommended Improvements

1. **Real-time Updates**
   - Implement WebSocket for live chat
   - Push notifications for new messages
   - Online/offline status indicators

2. **Advanced Features**
   - Multiple image upload
   - Voice message support
   - Typing indicators
   - Read receipts
   - Message search functionality

3. **Analytics Dashboard**
   - Average response time
   - Customer satisfaction ratings
   - Common issue tracking
   - Agent performance metrics

4. **Automation**
   - Auto-assign tickets to available agents
   - Canned responses for common issues
   - Auto-close resolved tickets after 24 hours
   - Email notifications for ticket updates

5. **Integration**
   - WhatsApp Business API
   - Email support integration
   - CRM system connection
   - Order management system link

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Images not uploading
```javascript
// Check upload directory exists
mkdir -p backend/uploads/support-images

// Check file permissions
chmod 755 backend/uploads/support-images
```

#### 2. API 401 Unauthorized
```javascript
// Ensure token is present
localStorage.getItem('token')

// Check auth middleware
// backend/middleware/auth.js
```

#### 3. Messages not sending
```javascript
// Check backend server is running
// Check CORS configuration in server.js
// Verify API endpoint URL matches
```

#### 4. Ticket not creating
```javascript
// Check MongoDB connection
// Verify CustomerSupport model is imported
// Check user authentication
```

---

## 📱 Mobile Responsiveness

The system is fully responsive:
- Chat widget auto-adjusts on mobile
- Touch-friendly buttons
- Mobile-optimized image upload
- Responsive admin panel with mobile layout
- Full-screen chat on small devices

---

## 🔐 Security Features

1. **Authentication**: All endpoints protected with JWT
2. **Authorization**: Customers can only access their own tickets
3. **File Validation**: Only image files allowed, size limited
4. **Input Sanitization**: Messages sanitized before storage
5. **Rate Limiting**: Prevent spam (recommended to add)

---

## 📞 Contact Integration

### Call Customer (Admin)
```html
<a href="tel:+919876543210">
  <Phone className="h-4 w-4" />
</a>
```

### Email Customer (Admin)
```html
<a href="mailto:customer@example.com">
  <Mail className="h-4 w-4" />
</a>
```

### WhatsApp Integration (Optional)
```javascript
const whatsappLink = `https://wa.me/91${phone}?text=Hi, this is from Village Crunch support...`;
```

---

## 🎓 Usage Tips

### For Customers
1. ✅ Be specific about your issue
2. ✅ Upload clear product images
3. ✅ Include order number if relevant
4. ✅ Check chat for agent responses

### For Admins
1. ✅ Respond within 5 minutes when possible
2. ✅ Ask for images if needed
3. ✅ Use proper status updates
4. ✅ Call customer for complex issues
5. ✅ Add resolution notes before closing
6. ✅ Set appropriate priority levels

---

## 📝 Message Examples

### Customer Message
```
"I received my makhana order but the package is damaged. 
The product seems to be affected. Can you help?"
```

### AI Detection
```
Detected keywords: "damaged", "affected"
Action: Show "Connect to Customer Care" button
```

### Agent Response
```
"I'm sorry to hear about the damaged package. I can see the 
image you sent. We'll send a replacement immediately. 
No need to return the damaged one. Expected delivery: 2-3 days.
I'll call you shortly to confirm your address."
```

---

## 🎉 Success Metrics

Track these KPIs:
- ⏱️ Average response time
- 😊 Customer satisfaction rate
- 🎯 First contact resolution rate
- 📊 Ticket volume by category
- ⏰ Average resolution time

---

## 📚 Additional Resources

### Dependencies Used
- **multer**: File upload handling
- **lucide-react**: Icons
- **react-toastify**: Notifications
- **mongoose**: Database operations

### Related Files
- `backend/models/CustomerSupport.js`
- `backend/routes/support.js`
- `frontend/src/components/AIChatbot.jsx`
- `frontend/src/pages/CustomerSupport.jsx`

---

## ✅ Implementation Checklist

- [x] Database model created
- [x] API routes implemented
- [x] Image upload configured
- [x] AI chatbot with agent routing
- [x] Admin support panel
- [x] Authentication & authorization
- [x] Mobile responsive design
- [x] Message types (customer/agent/system)
- [x] Status and priority management
- [ ] Real-time updates (WebSocket) - Future
- [ ] Email notifications - Future
- [ ] WhatsApp integration - Future

---

**🎊 Your customer support system is now ready!**

Customers can chat with Villy AI, escalate to agents, and upload images.
Admins can manage all tickets from the `/support` page.

Need help? Contact the development team! 🚀
