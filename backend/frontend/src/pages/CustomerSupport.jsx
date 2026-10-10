import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Phone, Mail, MessageSquare, Image as ImageIcon, Send, Clock, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
const API_URL = import.meta.env.VITE_API_URL || '/api';

const CustomerSupport = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchTickets();
  }, [filter]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedTicket?.messages]);

  const fetchTickets = async () => {
    try {
      const endpoint = user?.role === 'admin' 
        ? `${API_URL}/support/admin/all?status=${filter !== 'all' ? filter : ''}`
        : `${API_URL}/support/my-tickets`;
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setTickets(data.tickets);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!replyMessage.trim()) return;

    try {
      const response = await fetch(`${API_URL}/support/admin/${selectedTicket._id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          message: replyMessage,
          status: 'in-progress'
        })
      });

      const data = await response.json();
      if (data.success) {
        setSelectedTicket(data.ticket);
        setReplyMessage('');
        toast.success('Reply sent');
        fetchTickets();
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply');
    }
  };

  const handleCloseTicket = async () => {
    if (!window.confirm('Are you sure you want to close this ticket?')) return;

    try {
      const resolution = prompt('Enter resolution notes:');
      if (!resolution) return;

      const response = await fetch(`${API_URL}/support/admin/${selectedTicket._id}/close`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ resolution })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Ticket closed');
        setSelectedTicket(null);
        fetchTickets();
      }
    } catch (error) {
      console.error('Error closing ticket:', error);
      toast.error('Failed to close ticket');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 h-[calc(100vh-12rem)]">
            {/* Tickets List */}
            <div className="border-r border-gray-200 overflow-y-auto">
              <div className="p-4 border-b border-gray-200 bg-[#D4AF37]">
                <h2 className="text-xl font-bold text-white">
                  {user?.role === 'admin' ? 'All Support Tickets' : 'My Tickets'}
                </h2>
                {user?.role === 'admin' && (
                  <div className="mt-3 flex gap-2">
                    {['all', 'open', 'in-progress', 'resolved'].map(f => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1 rounded text-sm ${
                          filter === f
                            ? 'bg-white text-[#D4AF37]'
                            : 'bg-[#C5A028] text-white hover:bg-[#B59020]'
                        }`}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {tickets.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <MessageSquare className="mx-auto h-12 w-12 mb-2" />
                  <p>No tickets found</p>
                </div>
              ) : (
                <div>
                  {tickets.map(ticket => (
                    <div
                      key={ticket._id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
                        selectedTicket?._id === ticket._id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {ticket.userName}
                          </h3>
                          <p className="text-sm text-gray-500">{ticket.userEmail}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(ticket.status)}`}>
                          {ticket.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {ticket.messages[0]?.message}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                        <Clock className="h-3 w-3" />
                        {new Date(ticket.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chat Area */}
            <div className="col-span-2 flex flex-col">
              {selectedTicket ? (
                <>
                  {/* Header */}
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setSelectedTicket(null)}
                          className="md:hidden"
                        >
                          <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div>
                          <h3 className="font-bold text-gray-900">
                            {selectedTicket.userName}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-1 rounded text-xs ${getStatusColor(selectedTicket.status)}`}>
                              {selectedTicket.status}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(selectedTicket.priority)}`}>
                              {selectedTicket.priority}
                            </span>
                          </div>
                        </div>
                      </div>
                      {user?.role === 'admin' && (
                        <div className="flex gap-2">
                          <a
                            href={`tel:${selectedTicket.userPhone}`}
                            className="p-2 bg-green-500 text-white rounded hover:bg-green-600"
                            title="Call Customer"
                          >
                            <Phone className="h-4 w-4" />
                          </a>
                          <a
                            href={`mailto:${selectedTicket.userEmail}`}
                            className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            title="Email Customer"
                          >
                            <Mail className="h-4 w-4" />
                          </a>
                          {selectedTicket.status !== 'closed' && (
                            <button
                              onClick={handleCloseTicket}
                              className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                            >
                              Close Ticket
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {selectedTicket.messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.sender === 'customer' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            msg.sender === 'customer'
                              ? 'bg-[#D4AF37] text-white'
                              : msg.sender === 'agent'
                              ? 'bg-green-500 text-white'
                              : 'bg-blue-500 text-white'
                          }`}
                        >
                          {msg.senderName && (
                            <p className="text-xs opacity-80 mb-1">{msg.senderName}</p>
                          )}
                          <p className="whitespace-pre-wrap">{msg.message}</p>
                          {msg.image && (
                            <img
                              src={msg.image.startsWith('http') ? msg.image : `${window.location.origin}${msg.image}`}
                              alt="Attachment"
                              className="mt-2 rounded max-w-full"
                            />
                          )}
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Reply Box (Admin only) */}
                  {user?.role === 'admin' && selectedTicket.status !== 'closed' && (
                    <div className="p-4 border-t border-gray-200 bg-gray-50">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleReply()}
                          placeholder="Type your reply..."
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#D4AF37]"
                        />
                        <button
                          onClick={handleReply}
                          className="px-4 py-2 bg-[#D4AF37] text-white rounded-lg hover:bg-[#C5A028] flex items-center gap-2"
                        >
                          <Send className="h-4 w-4" />
                          Send
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <MessageSquare className="mx-auto h-16 w-16 mb-4" />
                    <p className="text-lg">Select a ticket to view details</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerSupport;
