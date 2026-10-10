import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Loader2, Sparkles, Headphones, User, Upload, Image as ImageIcon } from 'lucide-react';
import { getProducts } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
const API_URL = import.meta.env.VITE_API_URL || '/api';

const AIChatbot = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [products, setProducts] = useState([]);
  const [showAgentOptions, setShowAgentOptions] = useState(false);
  const [isConnectedToAgent, setIsConnectedToAgent] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const [currentTicketId, setCurrentTicketId] = useState(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const messagesEndRef = useRef(null);
  const [quickActions, setQuickActions] = useState([]);

  // Initialize greeting message with user's name and quick actions
  useEffect(() => {
    const greeting = user?.name 
      ? `👋 Hi ${user.name}! I'm Villy, your VillageCrunch shopping assistant!\n\n🎯 **Quick Start:** Pick what you're interested in below, or ask me anything!`
      : '👋 Hi! I\'m Villy, your VillageCrunch shopping assistant!\n\n🎯 **Quick Start:** Pick what you\'re interested in below, or ask me anything!';
    
    setMessages([{
      type: 'bot',
      text: greeting,
      timestamp: new Date()
    }]);
    
    // Set initial quick actions
    setQuickActions([
      { label: '🌰 Makhana', value: 'show me makhana' },
      { label: '🥜 Dry Fruits', value: 'show dry fruits' },
      { label: '🍪 Thekua', value: 'show thekua' },
      { label: '💰 Best Deals', value: 'best offers' }
    ]);
  }, [user]);

  // Load products for AI recommendations
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await getProducts({});
        setProducts(data);
      } catch (error) {
        console.error('Failed to load products:', error);
      }
    };
    loadProducts();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle image selection
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image size should be less than 5MB');
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Connect to customer care agent
  const connectToAgent = async () => {
    try {
      // Check if user is logged in
      if (!user) {
        toast.error('Please login to connect with customer care');
        setMessages(prev => [...prev, {
          type: 'system',
          text: '⚠️ **Login Required**\n\nTo connect with our customer care team, please login to your account first.\n\nYou can:\n• Click the login button at the top\n• Register if you don\'t have an account\n• Continue chatting with me (Villy) for general queries',
          timestamp: new Date()
        }]);
        return;
      }

      setIsConnectedToAgent(true);
      setShowAgentOptions(false);
      
      // Create a new support ticket
      const response = await fetch(`${API_URL}/support/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          message: messages[messages.length - 1]?.text || 'Customer requesting support',
          category: 'other'
        })
      });

      const data = await response.json();

      if (data.success) {
        setCurrentTicketId(data.ticket._id);
        
        const agentMsg = {
          type: 'system',
          text: '🎧 **Connected to Customer Care**\n\nYou are now chatting with our customer care team. They will help you with your issue.\n\n• You can upload images of the product\n• Our agent will call you if needed\n• Average response time: 2-5 minutes\n\nPlease describe your issue...',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, agentMsg]);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error connecting to agent:', error);
      toast.error('Failed to connect to customer care. Please try again.');
      setIsConnectedToAgent(false);
    }
  };

  // AI Response Logic - Enhanced for interactivity
  const getAIResponse = (userMessage) => {
    const msg = userMessage.toLowerCase();

    // If connected to agent, don't provide AI responses
    if (isConnectedToAgent) {
      return null;
    }

    // Issue/Problem/Complaint detection - Priority 1
    if (msg.includes('issue') || msg.includes('problem') || msg.includes('complaint') || 
        msg.includes('defect') || msg.includes('broken') || msg.includes('damaged') ||
        msg.includes('wrong') || msg.includes('missing') || msg.includes('not received') ||
        msg.includes('bad quality') || msg.includes('expired') || msg.includes('stale') ||
        msg.includes('rotten') || msg.includes('smell') || msg.includes('refund') ||
        msg.includes('cancel') || msg.includes('unhappy') || msg.includes('disappointed')) {
      setShowAgentOptions(true);
      setQuickActions([
        { label: '📞 Connect Now', value: 'agent', primary: true },
        { label: '📋 Return Policy', value: 'return policy' }
      ]);
      return '😟 **I\'m really sorry!** Let me connect you with our team immediately.\n\n' +
        '**They can help with:**\n' +
        '✅ Instant refund\n' +
        '✅ Free replacement\n' +
        '✅ Direct callback\n\n' +
        'Click "Connect Now" below! ⚡';
    }

    // Agent/Human request
    if (msg.includes('agent') || msg.includes('human') || msg.includes('talk') || 
        msg.includes('customer care') || msg.includes('support')) {
      setShowAgentOptions(true);
      setQuickActions([
        { label: '👤 Connect to Agent', value: 'agent', primary: true }
      ]);
      return '👤 **Ready to connect you with our team!**\n\n' +
        '⚡ Response time: Under 5 minutes\n' +
        '📸 You can upload photos\n' +
        '☎️ Get callback if needed';
    }

    // Greeting - Interactive
    if (msg.match(/^(hi|hello|hey|namaste|good morning|good afternoon|good evening)/)) {
      const userName = user?.name ? ` ${user.name}` : '';
      setQuickActions([
        { label: '🌰 Makhana', value: 'show makhana' },
        { label: '🥜 Dry Fruits', value: 'dry fruits' },
        { label: '🍪 Thekua', value: 'thekua' },
        { label: '🎁 Gift Ideas', value: 'gifting' }
      ]);
      return `Hi${userName}! 😊 Ready to shop?\n\nPick from below or tell me what you need! 👇`;
    }

    // Makhana - Concise with actions
    if (msg.includes('makhana') || msg.includes('fox nut')) {
      const makhanaProducts = products.filter(p => 
        p.category === 'makhana' || p.name?.toLowerCase().includes('makhana')
      );
      
      setQuickActions([
        { label: '🌶️ Peri Peri', value: 'peri peri makhana' },
        { label: '🧂 Classic', value: 'classic makhana' },
        { label: '🌿 Natural', value: 'natural makhana' },
        { label: '💪 Health Benefits', value: 'makhana benefits' }
      ]);
      
      if (makhanaProducts.length > 0) {
        let response = `🌟 **${makhanaProducts.length} Makhana Varieties Available**\n\n`;
        makhanaProducts.slice(0, 3).forEach(p => {
          response += `**${p.name}**\n💰 ₹${p.price} | 📦 ${p.weight}\n\n`;
        });
        response += '✅ Crunchy & Fresh\n✅ High Protein\n✅ Low Calorie';
        return response;
      }
      return '🌟 **Makhana Collection**\n\n' +
        '🌶️ Peri Peri (Spicy)\n' +
        '🧂 Classic Salted\n' +
        '🌿 Natural Plain\n\n' +
        '💰 ₹199-299 | 100gm\n' +
        '🚚 Free delivery over ₹500';
    }

    // Thekua - Quick info
    if (msg.includes('thekua') || msg.includes('sweet') || msg.includes('traditional') || msg.includes('bihar')) {
      const thekuaProducts = products.filter(p => p.category === 'thekua');
      
      setQuickActions([
        { label: '🍪 See All', value: 'all thekua' },
        { label: '🎁 For Gifting', value: 'thekua gift' },
        { label: '📦 Bulk Order', value: 'bulk thekua' }
      ]);
      
      if (thekuaProducts.length > 0) {
        let response = `🍪 **Authentic Bihar Thekua**\n\n`;
        thekuaProducts.slice(0, 2).forEach(p => {
          response += `**${p.name}** - ₹${p.price}\n`;
        });
        response += '\n✅ Traditional recipe\n✅ Made with jaggery\n✅ Perfect for festivals';
        return response;
      }
      return '🍪 **Traditional Thekua**\n\n' +
        '✨ Authentic Bihar recipe\n' +
        '🍯 Pure jaggery sweetness\n' +
        '🎊 Perfect for Chhath Puja\n\n' +
        '💰 From ₹199 | 250gm';
    }

    // Dry fruits - Focused
    if (msg.includes('dry fruit') || msg.includes('almond') || msg.includes('cashew') || 
        msg.includes('walnut') || msg.includes('pistachio') || msg.includes('badam') || msg.includes('kaju')) {
      
      setQuickActions([
        { label: '🥜 Almonds', value: 'almonds' },
        { label: '🌰 Cashews', value: 'cashews' },
        { label: '🥜 Walnuts', value: 'walnuts' },
        { label: '🎁 Gift Box', value: 'dry fruits gift' }
      ]);
      
      const dryFruits = products.filter(p => p.category === 'dry-fruits');
      
      if (dryFruits.length > 0) {
        let response = `🥜 **Premium Dry Fruits**\n\n`;
        dryFruits.slice(0, 3).forEach(p => {
          response += `**${p.name}** - ₹${p.price}\n`;
        });
        response += '\n✅ 100% Natural\n✅ Premium Quality\n✅ Health Benefits';
        return response;
      }
      
      return '🥜 **Premium Dry Fruits**\n\n' +
        '🌰 Almonds - Brain food\n' +
        '🥜 Cashews - Heart healthy\n' +
        '🌰 Walnuts - Omega-3 rich\n' +
        '🥜 Pistachios - Energy boost\n\n' +
        '💰 From ₹249 | Best quality';
    }

    // Price and offers - Direct
    if (msg.includes('price') || msg.includes('cost') || msg.includes('offer') || msg.includes('discount') || msg.includes('deal')) {
      setQuickActions([
        { label: '🌰 Makhana ₹199', value: 'makhana price' },
        { label: '🍪 Thekua ₹199', value: 'thekua price' },
        { label: '🥜 Dry Fruits ₹249', value: 'dry fruits price' }
      ]);
      return '💰 **Best Prices!**\n\n' +
        '🌰 Makhana: ₹199-299\n' +
        '🍪 Thekua: ₹199-249\n' +
        '🥜 Dry Fruits: ₹249+\n\n' +
        '🎉 **Offers:**\n' +
        '✅ Free shipping over ₹500\n' +
        '✅ 10% off first order (FIRST10)\n' +
        '✅ Bulk discounts available';
    }

    // Delivery - Quick answer
    if (msg.includes('deliver') || msg.includes('shipping') || msg.includes('ship') || msg.includes('how long')) {
      setQuickActions([
        { label: '📦 Track Order', value: 'track order' },
        { label: '🚚 Shipping Charges', value: 'shipping charges' }
      ]);
      return '🚚 **Fast Delivery!**\n\n' +
        '📍 Metro Cities: 2-3 days\n' +
        '📍 Other Cities: 3-5 days\n\n' +
        '✅ FREE over ₹500\n' +
        '✅ Real-time tracking\n' +
        '✅ Same-day dispatch';
    }

    // Quality - Brief
    if (msg.includes('quality') || msg.includes('fresh') || msg.includes('natural')) {
      setQuickActions([
        { label: '📦 How We Pack', value: 'packaging' },
        { label: '🌿 100% Natural?', value: 'ingredients' }
      ]);
      return '✨ **Quality Guaranteed**\n\n' +
        '✅ 100% Natural\n' +
        '✅ No Preservatives\n' +
        '✅ Fresh & Hygienic\n' +
        '✅ Quality Checked\n\n' +
        '🛡️ Not satisfied? Full refund!';
    }

    // Order process - Simplified
    if (msg.includes('order') || msg.includes('buy') || msg.includes('how to') || 
        msg.includes('payment') || msg.includes('cod') || msg.includes('upi')) {
      setQuickActions([
        { label: '🛍️ Start Shopping', value: 'show products' },
        { label: '💳 Payment Options', value: 'payment methods' }
      ]);
      return '🛒 **Easy Ordering!**\n\n' +
        '1️⃣ Browse & Add to cart\n' +
        '2️⃣ Enter delivery address\n' +
        '3️⃣ Choose payment method\n' +
        '4️⃣ Confirm order\n\n' +
        '💳 **Payments:**\n' +
        'UPI | Cards | COD | Net Banking';
    }

    // Returns - Clear
    if (msg.includes('return') || msg.includes('refund') || msg.includes('replace') || msg.includes('exchange')) {
      setQuickActions([
        { label: '🔄 Start Return', value: 'agent' },
        { label: '📋 Policy Details', value: 'return policy details' }
      ]);
      return '🔄 **Easy Returns**\n\n' +
        '✅ 7-day return\n' +
        '✅ Free pickup\n' +
        '✅ Instant refund\n' +
        '✅ No questions asked\n\n' +
        '**Process:**\n' +
        'Contact us → We pickup → Refund in 3-5 days';
    }

    // Health benefits - Focused
    if (msg.includes('benefit') || msg.includes('health') || msg.includes('nutrition') || 
        msg.includes('protein') || msg.includes('weight loss')) {
      setQuickActions([
        { label: '🌰 Makhana Benefits', value: 'makhana health' },
        { label: '🥜 Almonds Benefits', value: 'almond health' },
        { label: '🌰 Cashew Benefits', value: 'cashew health' }
      ]);
      return '💪 **Health Benefits**\n\n' +
        '**Makhana:**\n' +
        '✅ High protein\n' +
        '✅ Low calorie\n' +
        '✅ Weight loss friendly\n\n' +
        '**Almonds:**\n' +
        '✅ Brain booster\n' +
        '✅ Heart healthy\n\n' +
        '**Cashews:**\n' +
        '✅ Energy rich\n' +
        '✅ Immunity booster';
    }

    // Gifting - Interactive
    if (msg.includes('gift') || msg.includes('festival') || msg.includes('occasion') || 
        msg.includes('diwali') || msg.includes('wedding')) {
      setQuickActions([
        { label: '🎁 Gift Boxes', value: 'gift boxes' },
        { label: '🪔 Festival Special', value: 'festival gifts' },
        { label: '💼 Corporate Gifting', value: 'corporate gifts' }
      ]);
      return '🎁 **Perfect Gifting!**\n\n' +
        '🪔 Festival hampers\n' +
        '💍 Wedding favors\n' +
        '🏢 Corporate gifts\n' +
        '🎂 Birthday specials\n\n' +
        '✅ Premium packaging\n' +
        '✅ Personalized cards\n' +
        '✅ Bulk discounts';
    }

    // Bulk orders - Direct
    if (msg.includes('bulk') || msg.includes('wholesale') || msg.includes('large order')) {
      setQuickActions([
        { label: '📞 Talk to Team', value: 'agent' },
        { label: '💰 Get Quote', value: 'bulk quote' }
      ]);
      return '📦 **Bulk Orders**\n\n' +
        '💰 Special pricing for ₹5000+\n' +
        '🚚 Free delivery\n' +
        '📦 Custom packaging\n\n' +
        '**Perfect for:**\n' +
        '🏢 Corporate events\n' +
        '💍 Weddings\n' +
        '🎊 Festivals\n\n' +
        'Connect with our team for quotes!';
    }

    // Thank you
    if (msg.includes('thank') || msg.includes('thanks')) {
      setQuickActions([
        { label: '🛍️ Browse Products', value: 'show products' },
        { label: '💰 Check Offers', value: 'offers' }
      ]);
      return '😊 You\'re welcome!\n\nAnything else I can help with?';
    }

    // Help - Quick options
    if (msg.includes('help') || msg.includes('contact')) {
      setShowAgentOptions(true);
      setQuickActions([
        { label: '👤 Talk to Agent', value: 'agent', primary: true },
        { label: '📞 Call Us', value: 'phone number' },
        { label: '📧 Email', value: 'email address' }
      ]);
      return '📞 **We\'re Here to Help!**\n\n' +
        '🤖 **Ask me about:**\n' +
        'Products, Prices, Delivery\n\n' +
        '👤 **Talk to team for:**\n' +
        'Orders, Returns, Issues\n\n' +
        '📞 +91-XXXXXXXXXX\n' +
        '📧 support@villagecrunch.com';
    }

    // Default - Smart suggestions
    setQuickActions([
      { label: '🌰 Makhana', value: 'makhana' },
      { label: '🥜 Dry Fruits', value: 'dry fruits' },
      { label: '🍪 Thekua', value: 'thekua' },
      { label: '💰 Offers', value: 'offers' },
      { label: '👤 Talk to Agent', value: 'agent' }
    ]);
    
    return '🤔 **Not sure? Try these!**\n\n' +
      '💬 "Show me makhana"\n' +
      '💬 "Dry fruits prices"\n' +
      '💬 "Delivery time"\n' +
      '💬 "Best offers"\n\n' +
      'Or pick from quick options below! 👇';
  };

  // Handle quick action button click
  const handleQuickAction = (actionValue) => {
    setInputMessage(actionValue);
    // Trigger send after a short delay to allow input to update
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && !selectedImage) return;
    if (isSendingMessage) return; // Prevent duplicate sends

    setIsSendingMessage(true);

    // Add user message
    const userMsg = {
      type: 'user',
      text: inputMessage,
      image: imagePreview,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    
    const messageText = inputMessage;
    const imageFile = selectedImage;
    
    setInputMessage('');
    setSelectedImage(null);
    setImagePreview(null);

    // If connected to agent, send to backend
    if (isConnectedToAgent && currentTicketId) {
      setIsTyping(true);
      
      try {
        const formData = new FormData();
        formData.append('message', messageText);
        if (imageFile) {
          formData.append('image', imageFile);
        }

        const response = await fetch(`${API_URL}/support/${currentTicketId}/message`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        });

        const data = await response.json();

        if (data.success) {
          // Message sent successfully
          toast.success('Message sent to customer care');
          
          // Simulate agent response (in real app, this would come via WebSocket/polling)
          setTimeout(() => {
            const agentResponse = {
              type: 'agent',
              text: 'Thank you for sharing the details. Our team is reviewing your case. ' +
                    (imageFile ? 'We\'ve received your image. ' : '') +
                    'If we need more information, we\'ll call you shortly. Average wait time: 3-5 minutes.',
              timestamp: new Date()
            };
            setMessages(prev => [...prev, agentResponse]);
            setIsTyping(false);
          }, 2000);
        } else {
          throw new Error(data.message);
        }
      } catch (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message. Please try again.');
        setIsTyping(false);
      } finally {
        setIsSendingMessage(false);
      }
      return;
    }

    setIsSendingMessage(false);

    // AI response
    setIsTyping(true);
    setTimeout(() => {
      const aiResponse = getAIResponse(messageText);
      if (aiResponse) {
        const botMsg = {
          type: 'bot',
          text: aiResponse,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMsg]);
      }
      setIsTyping(false);
    }, 800);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-desi-gold to-yellow-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 z-50 group"
          aria-label="Open AI Chat"
        >
          <MessageCircle className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-semibold rounded-full px-1.5 py-0.5 flex items-center justify-center animate-pulse">
            Villy
          </span>
          <span className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Ask me anything! 💬
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 animate-scale-in border-2 border-desi-gold/20">
          {/* Header */}
          <div className="bg-gradient-to-r from-desi-gold to-yellow-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-desi-gold" />
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <h3 className="font-bold">Villy {isConnectedToAgent && '→ Customer Care'}</h3>
                <p className="text-xs opacity-90">
                  {isConnectedToAgent ? '🟢 Connected to Agent' : 'Your AI Shopping Assistant'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 p-2 rounded-full transition"
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-2xl ${
                    msg.type === 'user'
                      ? 'bg-desi-gold text-white rounded-br-none'
                      : msg.type === 'system'
                      ? 'bg-blue-50 text-blue-900 rounded-lg border-2 border-blue-200'
                      : msg.type === 'agent'
                      ? 'bg-green-50 text-green-900 rounded-bl-none border-2 border-green-200'
                      : 'bg-white text-gray-800 rounded-bl-none shadow-md border border-gray-100'
                  }`}
                >
                  {msg.image && (
                    <img 
                      src={msg.image} 
                      alt="Uploaded" 
                      className="w-full rounded-lg mb-2 max-h-48 object-cover"
                    />
                  )}
                  <p className="text-sm whitespace-pre-line">{msg.text}</p>
                  <p className="text-xs opacity-60 mt-1">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {/* Agent Contact Options */}
            {showAgentOptions && !isConnectedToAgent && (
              <div className="flex justify-center">
                <button
                  onClick={connectToAgent}
                  className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl hover:from-green-600 hover:to-green-700 transition flex items-center space-x-2 shadow-lg"
                >
                  <Headphones className="w-5 h-5" />
                  <span className="font-semibold">Connect to Customer Care</span>
                </button>
              </div>
            )}

            {isTyping && (
              <div className="flex justify-start">
                <div className={`p-3 rounded-2xl rounded-bl-none shadow-md ${
                  isConnectedToAgent ? 'bg-green-50 border-2 border-green-200' : 'bg-white border border-gray-100'
                }`}>
                  <Loader2 className={`w-5 h-5 animate-spin ${
                    isConnectedToAgent ? 'text-green-600' : 'text-desi-gold'
                  }`} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-gray-200 rounded-b-2xl">
            {/* Image Preview */}
            {imagePreview && (
              <div className="mb-3 relative inline-block">
                <img src={imagePreview} alt="Preview" className="w-24 h-24 object-cover rounded-lg" />
                <button
                  onClick={() => {
                    setImagePreview(null);
                    setSelectedImage(null);
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Quick Action Buttons */}
            {quickActions.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3 overflow-x-auto">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickAction(action.value)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all transform hover:scale-105 ${
                      action.primary
                        ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white shadow-lg hover:shadow-xl'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center space-x-2">
              {/* Image Upload Button - Only show when connected to agent */}
              {isConnectedToAgent && (
                <>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-full hover:bg-gray-100 transition text-gray-600"
                    title="Upload product image"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>
                </>
              )}
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isConnectedToAgent ? "Describe your issue..." : "Ask me anything..."}
                className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-full focus:outline-none focus:border-desi-gold transition"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() && !selectedImage}
                className={`p-2 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  isConnectedToAgent 
                    ? 'bg-green-500 hover:bg-green-600 text-white' 
                    : 'bg-desi-gold hover:bg-yellow-600 text-white'
                }`}
                aria-label="Send message"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              {isConnectedToAgent 
                ? '🟢 Connected • Agent will respond shortly' 
                : 'Villy AI • Instant responses'}
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatbot;
