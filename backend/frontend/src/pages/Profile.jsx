import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { MapPin, Plus, Package, ChevronRight, LogOut, Pencil } from 'lucide-react';
import { addAddress, updateAddress, deleteAddress, getUserAddresses, getMyOrders, lookupPincode } from '../utils/api';
import { Link, useNavigate } from 'react-router-dom';
import { formatINR } from '../utils/format';
import toast from 'react-hot-toast';
import axios from 'axios';

const Profile = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [userStats, setUserStats] = useState({
    totalOrders: 0,
    totalAddresses: 0,
    wishlistCount: 0,
    memberSince: null
  });
  
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const [addressData, setAddressData] = useState({
    street: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    isDefault: false,
  });

  const [addresses, setAddresses] = useState([]);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
      fetchUserAddresses();
      getMyOrders().then((o) => setOrders(Array.isArray(o) ? o : [])).catch(() => setOrders([]));
    }
  }, [user]);

  const fetchUserAddresses = async () => {
    try {
      const addressesData = await getUserAddresses();
      setAddresses(addressesData || []);
    } catch (error) {
      setAddresses([]);
    }
  };


  const handleProfileChange = (e) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value,
    });
  };

  const handleAddressChange = (e) => {
    const { name, type, checked } = e.target;
    const value = name === 'pincode' ? e.target.value.replace(/\D/g, '').slice(0, 6) : e.target.value;
    setAddressData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (name === 'pincode' && value.length === 6) {
      lookupPincode(value).then((r) => {
        if (r) setAddressData((prev) => (prev.pincode === value ? { ...prev, city: prev.city || r.city, state: prev.state || r.state } : prev));
      });
    }
  };

  const updateProfile = async () => {
    setLoading(true);
    try {
      const { data } = await axios.put('/api/auth/profile', profileData);
      updateUser(data);
      setEditMode(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async () => {
    if (!addressData.street || !addressData.city || !addressData.state || !addressData.pincode || !addressData.phone) {
      toast.error('Please fill all address fields');
      return;
    }

    setLoading(true);
    try {
      const { data } = await addAddress(addressData);
      
      // Refresh addresses from API
      await fetchUserAddresses();
      
      setAddressData({ street: '', city: '', state: '', pincode: '', phone: '', isDefault: false });
      setShowAddressForm(false);
      toast.success('Address added successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add address');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAddress = async () => {
    if (!addressData.street || !addressData.city || !addressData.state || !addressData.pincode || !addressData.phone) {
      toast.error('Please fill all address fields');
      return;
    }

    setLoading(true);
    try {
      const addressId = addresses[editingAddress]._id;
      const { data } = await updateAddress(addressId, addressData);
      
      // Refresh addresses from API
      await fetchUserAddresses();
      
      setAddressData({ street: '', city: '', state: '', pincode: '', phone: '', isDefault: false });
      setEditingAddress(null);
      toast.success('Address updated successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update address');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAddress = async (addressIndex) => {

    setLoading(true);
    try {
      const addressId = addresses[addressIndex]._id;
      await deleteAddress(addressId);
      
      // Refresh addresses from API
      await fetchUserAddresses();
      
      toast.success('Address deleted successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete address');
    } finally {
      setLoading(false);
    }
  };

  const setDefaultAddress = async (addressIndex) => {
    setLoading(true);
    try {
      const updatedAddresses = addresses.map((addr, index) => ({
        ...addr,
        isDefault: index === addressIndex,
      }));

      const { data } = await axios.put('/api/auth/profile', {
        ...profileData,
        addresses: updatedAddresses,
      });

      updateUser(data);
      setAddresses(data.addresses);
      toast.success('Default address updated!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update default address');
    } finally {
      setLoading(false);
    }
  };

  const startEditAddress = (address, index) => {
    setAddressData({
      street: address.street,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      phone: address.phone || user.phone || '', // Use address phone or fallback to user phone
      isDefault: address.isDefault,
    });
    setEditingAddress(index);
    setShowAddressForm(true);
  };

  const cancelAddressForm = () => {
    setAddressData({ street: '', city: '', state: '', pincode: '', phone: '', isDefault: false });
    setShowAddressForm(false);
    setEditingAddress(null);
  };

  if (!user) {
    return (
      <div className="px-4 py-16 text-center">
        <h1 className="page-title">Your account</h1>
        <p className="mt-2 text-ink-soft">Log in with your mobile number to see your orders and addresses.</p>
        <Link to="/login?redirect=/profile" className="btn-primary mt-6 inline-flex">Log in</Link>
      </div>
    );
  }

  const isOtpEmail = /@phone\.villagecrunch\.in$/i.test(user.email || '');
  const STATUS = { pending: 'Placed', confirmed: 'Confirmed', processing: 'Being made', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' };
  const field = (name, label, props = {}) => (
    <div className={props.wide ? 'sm:col-span-2' : ''}>
      <label htmlFor={`addr-${name}`} className="field-label">{label}</label>
      <input id={`addr-${name}`} name={name} value={addressData[name]} onChange={handleAddressChange} className="input-field" {...props.input} />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Hi, {user.name?.split(' ')[0] || 'there'}</h1>
          <p className="mt-1 text-ink-soft">+91 {user.phone}{!isOtpEmail && user.email ? ` · ${user.email}` : ''}</p>
        </div>
        <button onClick={() => { logout(); navigate('/'); }} className="btn-ghost h-11 gap-1.5 text-sm">
          <LogOut className="w-4 h-4" aria-hidden="true" /> Log out
        </button>
      </div>

      {/* Orders */}
      <section className="panel">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl font-semibold">Your orders</h2>
          {orders?.length > 0 && <Link to="/orders" className="text-sm font-medium text-action">See all</Link>}
        </div>
        {orders === null ? (
          <p className="text-ink-mute text-sm">Loading...</p>
        ) : orders.length === 0 ? (
          <div className="flex items-center justify-between gap-4 rounded-md bg-paper px-4 py-4">
            <p className="text-ink-soft">No orders yet.</p>
            <Link to="/products?category=thekua" className="btn-primary h-10 px-4 text-sm">Shop thekua</Link>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {orders.slice(0, 3).map((o) => (
              <li key={o._id}>
                <Link to={`/order/${o._id}`} className="flex items-center gap-3 py-3">
                  <Package className="w-5 h-5 text-ink-mute flex-shrink-0" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink truncate">{o.items?.map((i) => i.name || i.product?.name).filter(Boolean).join(', ') || o.orderNumber}</p>
                    <p className="text-sm text-ink-mute">{new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {STATUS[o.status] || o.status}</p>
                  </div>
                  <span className="tabular-nums font-medium">{formatINR(o.totalPrice)}</span>
                  <ChevronRight className="w-4 h-4 text-ink-mute" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Addresses */}
      <section className="panel">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl font-semibold">Delivery addresses</h2>
          {!showAddressForm && (
            <button
              onClick={() => { setAddressData({ street: '', city: '', state: '', pincode: '', phone: user.phone || '', isDefault: addresses.length === 0 }); setEditingAddress(null); setShowAddressForm(true); }}
              className="btn-ghost h-10 gap-1 text-sm"
            >
              <Plus className="w-4 h-4" aria-hidden="true" /> Add
            </button>
          )}
        </div>

        {showAddressForm && (
          <div className="rounded-md border border-line p-4 mb-4">
            <div className="grid sm:grid-cols-2 gap-4">
              {field('street', 'House no., street, area', { wide: true, input: { autoComplete: 'street-address' } })}
              {field('pincode', 'PIN code', { input: { inputMode: 'numeric', maxLength: 6, autoComplete: 'postal-code' } })}
              {field('city', 'City', { input: { autoComplete: 'address-level2' } })}
              {field('state', 'State', { input: { autoComplete: 'address-level1' } })}
              {field('phone', 'Phone for delivery', { input: { type: 'tel', inputMode: 'numeric', maxLength: 10 } })}
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" name="isDefault" checked={addressData.isDefault} onChange={handleAddressChange} className="w-5 h-5" />
              Use as my default address
            </label>
            <div className="mt-4 flex gap-3">
              <button onClick={editingAddress !== null ? handleUpdateAddress : handleAddAddress} disabled={loading} className="btn-primary h-11 px-5">
                {loading ? 'Saving...' : 'Save address'}
              </button>
              <button onClick={cancelAddressForm} className="btn-ghost h-11">Cancel</button>
            </div>
          </div>
        )}

        {addresses.length === 0 && !showAddressForm ? (
          <p className="text-ink-soft text-sm">No saved addresses. Add one for faster checkout.</p>
        ) : (
          <ul className="space-y-3">
            {addresses.map((a, i) => (
              <li key={a._id || i} className="flex items-start gap-3 rounded-md border border-line p-4">
                <MapPin className="w-5 h-5 text-ink-mute mt-0.5 flex-shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0 text-[15px]">
                  <p className="text-ink">{a.street}</p>
                  <p className="text-ink-soft">{a.city}, {a.state} {a.pincode}{a.phone ? ` · ${a.phone}` : ''}</p>
                  {a.isDefault ? (
                    <span className="mt-1 inline-block text-xs font-semibold text-leaf">Default</span>
                  ) : (
                    <button onClick={() => setDefaultAddress(i)} className="mt-1 text-xs font-medium text-action">Make default</button>
                  )}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEditAddress(a, i)} className="btn-ghost h-9 px-2 text-sm" aria-label="Edit address"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDeleteAddress(i)} className="btn-ghost h-9 px-2 text-sm text-berry">Remove</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Details */}
      <section className="panel">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl font-semibold">Your details</h2>
          {!editMode && <button onClick={() => setEditMode(true)} className="btn-ghost h-10 text-sm">Edit</button>}
        </div>
        {editMode ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="p-name" className="field-label">Name</label>
              <input id="p-name" name="name" value={profileData.name} onChange={handleProfileChange} className="input-field" autoComplete="name" />
            </div>
            <div>
              <label htmlFor="p-email" className="field-label">Email (for order updates)</label>
              <input id="p-email" name="email" type="email" value={isOtpEmail ? '' : profileData.email}
                onChange={handleProfileChange} className="input-field" placeholder="you@example.com" autoComplete="email" />
            </div>
            <div className="flex gap-3">
              <button onClick={updateProfile} disabled={loading} className="btn-primary h-11 px-5">{loading ? 'Saving...' : 'Save'}</button>
              <button onClick={() => { setEditMode(false); setProfileData({ name: user.name || '', email: user.email || '', phone: user.phone || '' }); }} className="btn-ghost h-11">Cancel</button>
            </div>
          </div>
        ) : (
          <dl className="grid sm:grid-cols-3 gap-4 text-[15px]">
            <div><dt className="text-sm text-ink-mute">Name</dt><dd className="text-ink">{user.name}</dd></div>
            <div><dt className="text-sm text-ink-mute">Mobile</dt><dd className="text-ink">+91 {user.phone}</dd></div>
            <div className="min-w-0"><dt className="text-sm text-ink-mute">Email</dt><dd className="text-ink truncate">{isOtpEmail || !user.email ? <span className="text-ink-mute">Not added</span> : user.email}</dd></div>
          </dl>
        )}
      </section>
    </div>
  );
};

export default Profile;
