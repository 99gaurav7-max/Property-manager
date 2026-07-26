import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { 
  User, Property, Tenant, Allocation, Invoice, Transaction, ActivityLog, UserRole 
} from './types';
import { apiFetch } from './lib/api.ts';
import AuthPage from './components/AuthPage';

const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const OwnerDashboard = lazy(() => import('./components/OwnerDashboard'));

// Helper utilities for instant local caching and sub-1s initial page load
const getInitialUser = (): User | null => {
  try {
    const saved = localStorage.getItem('noble_user_cache');
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
};

const getInitialData = <T,>(key: string): T[] => {
  try {
    const saved = localStorage.getItem(`noble_data_${key}`);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
};

const clearLocalSession = () => {
  localStorage.removeItem('noble_session_token');
  localStorage.removeItem('noble_user_cache');
  localStorage.removeItem('noble_data_users');
  localStorage.removeItem('noble_data_properties');
  localStorage.removeItem('noble_data_tenants');
  localStorage.removeItem('noble_data_allocations');
  localStorage.removeItem('noble_data_invoices');
  localStorage.removeItem('noble_data_transactions');
  localStorage.removeItem('noble_data_logs');
};

export default function App() {
  const [userProfile, setUserProfile] = useState<User | null>(getInitialUser);
  // Only show loading screen if token exists AND no cache exists yet.
  // Unauthenticated landing page loads in 0ms!
  const [loading, setLoading] = useState<boolean>(() => {
    const hasToken = !!localStorage.getItem('noble_session_token');
    const hasCache = !!localStorage.getItem('noble_user_cache');
    return hasToken && !hasCache;
  });

  // Core application data initialized instantly from local cache
  const [users, setUsers] = useState<User[]>(() => getInitialData('users'));
  const [properties, setProperties] = useState<Property[]>(() => getInitialData('properties'));
  const [tenants, setTenants] = useState<Tenant[]>(() => getInitialData('tenants'));
  const [allocations, setAllocations] = useState<Allocation[]>(() => getInitialData('allocations'));
  const [invoices, setInvoices] = useState<Invoice[]>(() => getInitialData('invoices'));
  const [transactions, setTransactions] = useState<Transaction[]>(() => getInitialData('transactions'));
  const [logs, setLogs] = useState<ActivityLog[]>(() => getInitialData('logs'));

  // Sync data from database
  const syncKingdomData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const data = await apiFetch('/api/sync');
      
      if (!data.user) {
        clearLocalSession();
        setUserProfile(null);
        return;
      }

      setUserProfile(data.user);
      localStorage.setItem('noble_user_cache', JSON.stringify(data.user));

      if (data.user.role === 'admin') {
        const u = data.users || [];
        setUsers(u);
        localStorage.setItem('noble_data_users', JSON.stringify(u));
      }
      
      const props = data.properties || [];
      setProperties(props);
      localStorage.setItem('noble_data_properties', JSON.stringify(props));

      const tens = data.tenants || [];
      setTenants(tens);
      localStorage.setItem('noble_data_tenants', JSON.stringify(tens));

      const allocs = data.allocations || [];
      setAllocations(allocs);
      localStorage.setItem('noble_data_allocations', JSON.stringify(allocs));

      const invs = data.invoices || [];
      setInvoices(invs);
      localStorage.setItem('noble_data_invoices', JSON.stringify(invs));

      const txs = data.transactions || [];
      setTransactions(txs);
      localStorage.setItem('noble_data_transactions', JSON.stringify(txs));

      const lg = data.logs || [];
      setLogs(lg);
      localStorage.setItem('noble_data_logs', JSON.stringify(lg));
    } catch (err: any) {
      console.error('Error synchronizing:', err);
      if (err.message?.includes('401') || err.message?.includes('403') || err.message?.includes('Unauthorized')) {
        clearLocalSession();
        setUserProfile(null);
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [setUserProfile, setUsers, setProperties, setTenants, setAllocations, setInvoices, setTransactions, setLogs]);

  // Listen to local session on mount and set up auto re-sync for cross-device consistency
  useEffect(() => {
    const token = localStorage.getItem('noble_session_token');
    if (token) {
      // Background silent sync if cache exists, or full sync if first time
      const hasCache = !!localStorage.getItem('noble_user_cache');
      syncKingdomData(!hasCache);
    } else {
      setLoading(false);
    }

    // Auto re-sync on tab focus or visibility change (e.g. switching back to phone browser)
    const handleFocus = () => {
      const currentToken = localStorage.getItem('noble_session_token');
      if (currentToken) {
        syncKingdomData(false);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleFocus();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic background auto-sync every 30 seconds
    const interval = setInterval(() => {
      const currentToken = localStorage.getItem('noble_session_token');
      if (currentToken && document.visibilityState === 'visible') {
        syncKingdomData(false);
      }
    }, 30000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [syncKingdomData]);

  // Action: Add Activity Log
  const handleAddLog = async (action: string, details: string) => {
    if (!userProfile) return;
    const newLog: ActivityLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      userId: userProfile.id,
      userName: userProfile.name,
      userRole: userProfile.role,
      action,
      details,
      timestamp: new Date().toISOString()
    };

    try {
      await apiFetch('/api/logs', {
        method: 'POST',
        body: JSON.stringify(newLog)
      });
    } catch (err) {
      console.error('Failed to log activity to DB:', err);
    }
  };

  // Action: Handle Profile Update Success
  const handleUpdateProfile = (updatedUser: User) => {
    setUserProfile(updatedUser);
    syncKingdomData(false);
  };

  // Action: Handle Successful Login
  const handleLoginSuccess = (user: User, token: string) => {
    localStorage.setItem('noble_session_token', token);
    setUserProfile(user);
    // Sync kingdom data immediately
    syncKingdomData(true);
  };

  // Action: Update owner status (Admin approval/suspension)
  const handleUpdateUserStatus = async (userId: string, status: 'active' | 'suspended', reason?: string) => {
    try {
      await apiFetch(`/api/users/${userId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, reason })
      });
      
      // Sync DB state to update UI
      await syncKingdomData(false);
    } catch (err) {
      console.error('Failed to update user status:', err);
    }
  };

  // Action: Create/Pre-register Owner (Admin only)
  const handleCreateOwner = async (ownerData: {
    name: string;
    email: string;
    phone: string;
    businessName: string;
    status: 'active' | 'pending';
  }) => {
    try {
      await apiFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(ownerData)
      });
      
      // Sync DB state to update UI
      await syncKingdomData(false);
      return true;
    } catch (err: any) {
      console.error('Failed to create owner account:', err);
      throw err;
    }
  };

  // Action: Add Property
  const handleAddProperty = async (propData: Omit<Property, 'id' | 'ownerId' | 'status'>) => {
    if (!userProfile) return;
    const newProp: Property = {
      ...propData,
      id: `prop_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      ownerId: userProfile.id,
      status: 'available'
    };

    try {
      await apiFetch('/api/properties', {
        method: 'POST',
        body: JSON.stringify(newProp)
      });
      await handleAddLog('Property Created', `Added new estate property: "${newProp.title}" inside ${newProp.location}.`);
      await syncKingdomData(false);
    } catch (err: any) {
      console.error('Failed to persist property:', err);
      alert(`Failed to save property to database: ${err.message || 'Server connection error'}. Please try again.`);
      throw err;
    }
  };

  // Action: Update Property
  const handleUpdateProperty = async (updatedProp: Property) => {
    if (!userProfile) return;
    try {
      await apiFetch('/api/properties', {
        method: 'POST',
        body: JSON.stringify(updatedProp)
      });
      await handleAddLog('Property Updated', `Updated estate property: "${updatedProp.title}".`);
      await syncKingdomData(false);
    } catch (err: any) {
      console.error('Failed to update property:', err);
      alert(`Failed to update property: ${err.message || 'Server error'}.`);
      throw err;
    }
  };

  // Action: Delete Property
  const handleDeleteProperty = async (propertyId: string) => {
    if (!userProfile) return;
    try {
      await apiFetch(`/api/properties/${propertyId}`, {
        method: 'DELETE'
      });
      await handleAddLog('Property Deleted', `Deleted property from database.`);
      await syncKingdomData(false);
    } catch (err: any) {
      console.error('Failed to delete property:', err);
      alert(`Failed to delete property: ${err.message || 'Server error'}.`);
      throw err;
    }
  };

  // Action: Add Tenant
  const handleAddTenant = async (tenantData: Omit<Tenant, 'id' | 'ownerId' | 'status' | 'joinedAt'>) => {
    if (!userProfile) return;
    const newTenant: Tenant = {
      ...tenantData,
      id: `ten_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      ownerId: userProfile.id,
      status: 'active',
      joinedAt: new Date().toISOString()
    };

    try {
      await apiFetch('/api/tenants', {
        method: 'POST',
        body: JSON.stringify(newTenant)
      });
      await handleAddLog('Tenant Registered', `Enrolled new tenant: ${newTenant.name} (${newTenant.phone}).`);
      await syncKingdomData(false);
    } catch (err: any) {
      console.error('Failed to persist tenant:', err);
      alert(`Failed to save tenant to database: ${err.message || 'Server error'}.`);
      throw err;
    }
  };

  // Action: Update Tenant
  const handleUpdateTenant = async (updatedTenant: Tenant) => {
    if (!userProfile) return;
    try {
      await apiFetch('/api/tenants', {
        method: 'POST',
        body: JSON.stringify(updatedTenant)
      });
      await handleAddLog('Tenant Updated', `Updated tenant profile: ${updatedTenant.name}.`);
      await syncKingdomData(false);
    } catch (err: any) {
      console.error('Failed to update tenant:', err);
      alert(`Failed to update tenant: ${err.message || 'Server error'}.`);
      throw err;
    }
  };

  // Action: Delete Tenant
  const handleDeleteTenant = async (tenantId: string) => {
    if (!userProfile) return;
    try {
      await apiFetch(`/api/tenants/${tenantId}`, {
        method: 'DELETE'
      });
      await handleAddLog('Tenant Deleted', `Deleted tenant from database.`);
      await syncKingdomData(false);
    } catch (err: any) {
      console.error('Failed to delete tenant:', err);
      alert(`Failed to delete tenant: ${err.message || 'Server error'}.`);
      throw err;
    }
  };

  // Action: Allocate Tenant to room with optional custom room rent
  const handleAllocateTenant = async (propertyId: string, tenantId: string, roomNo: string, rentOverride?: number) => {
    if (!userProfile) return;
    
    const newAlloc: Allocation = {
      id: `alloc_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      ownerId: userProfile.id,
      tenantId,
      propertyId,
      roomNo,
      rentOverride: rentOverride && rentOverride > 0 ? rentOverride : undefined,
      active: true,
      startDate: new Date().toISOString().split('T')[0]
    };

    try {
      // Update property status on server
      const updatedProp = properties.find(p => p.id === propertyId);
      if (updatedProp) {
        await apiFetch('/api/properties', {
          method: 'POST',
          body: JSON.stringify({ ...updatedProp, status: 'occupied' })
        });
      }

      // Create allocation on server
      await apiFetch('/api/allocations', {
        method: 'POST',
        body: JSON.stringify(newAlloc)
      });

      const tenantObj = tenants.find(t => t.id === tenantId);
      const propertyObj = properties.find(p => p.id === propertyId);
      const rentText = rentOverride ? ` with custom room rent ₹${rentOverride}` : '';
      await handleAddLog('Lease Allocation', `Assigned ${tenantObj?.name || 'Tenant'} to Room ${roomNo} at "${propertyObj?.title || 'Estate'}"${rentText}.`);
      await syncKingdomData(false);
    } catch (err: any) {
      console.error('Failed to allocate tenant:', err);
      alert(`Failed to allocate tenant: ${err.message || 'Server error'}.`);
      throw err;
    }
  };

  // Action: Update existing Room Allocation (room number or custom room rent)
  const handleUpdateAllocation = async (allocationId: string, updates: Partial<Allocation>) => {
    if (!userProfile) return;

    const targetAlloc = allocations.find(a => a.id === allocationId);
    if (!targetAlloc) return;

    const updated = { ...targetAlloc, ...updates };

    try {
      await apiFetch('/api/allocations', {
        method: 'POST',
        body: JSON.stringify(updated)
      });
      await handleAddLog('Allocation Updated', `Updated room details / rent rate for Room ${updated.roomNo}.`);
      await syncKingdomData(false);
    } catch (err: any) {
      console.error('Failed to update allocation:', err);
      alert(`Failed to update allocation: ${err.message || 'Server error'}.`);
      throw err;
    }
  };

  // Action: Auto-Generate Monthly Invoices
  const handleGenerateMonthlyInvoices = async (month: string): Promise<number> => {
    if (!userProfile) return 0;
    
    const activeOwnerAllocations = allocations.filter(a => a.ownerId === userProfile.id && a.active);
    let count = 0;
    const newInvoices: Invoice[] = [];

    activeOwnerAllocations.forEach(alloc => {
      const invoiceExists = invoices.some(i => i.allocationId === alloc.id && i.month === month);
      
      if (!invoiceExists) {
        const prop = properties.find(p => p.id === alloc.propertyId);
        if (!prop) return;

        const rentAmount = (alloc.rentOverride && alloc.rentOverride > 0) ? alloc.rentOverride : prop.rent;
        const serialNo = invoices.length + count + 1;
        const invoiceNo = `INV-${month.replace('-', '')}-${String(serialNo).padStart(3, '0')}`;
        const dueDate = `${month}-05`;
        
        const monthsNames = [
          "January", "February", "March", "April", "May", "June", 
          "July", "August", "September", "October", "November", "December"
        ];
        const [yearStr, monthStr] = month.split('-');
        const monthIndex = parseInt(monthStr, 10) - 1;
        const billingPeriod = `${monthsNames[monthIndex]} 1, ${yearStr} - ${monthsNames[monthIndex]} 31, ${yearStr}`;

        const newInv: Invoice = {
          id: `inv_${Date.now()}_${count}_${Math.random().toString(36).substring(2, 5)}`,
          ownerId: userProfile.id,
          tenantId: alloc.tenantId,
          propertyId: alloc.propertyId,
          allocationId: alloc.id,
          invoiceNumber: invoiceNo,
          month,
          amount: rentAmount,
          status: 'pending',
          dueDate,
          billingPeriod
        };

        newInvoices.push(newInv);
        count++;
      }
    });

    if (newInvoices.length > 0) {
      try {
        for (const invoice of newInvoices) {
          await apiFetch('/api/invoices', {
            method: 'POST',
            body: JSON.stringify(invoice)
          });
        }
        await handleAddLog('Invoices Generated', `Invoice batch generated for period ${month}. Total: ${count} records.`);
        await syncKingdomData(false);
      } catch (err: any) {
        console.error('Failed to save batch invoices:', err);
        alert(`Failed to save generated invoices: ${err.message || 'Server error'}.`);
        throw err;
      }
    }

    return count;
  };

  // Action: Record payment for pending rent invoice
  const handleRecordPayment = async (invoiceId: string, referenceNo: string) => {
    if (!userProfile) return;

    const targetInvoice = invoices.find(i => i.id === invoiceId);
    if (!targetInvoice) return;

    const updatedInvoice: Invoice = {
      ...targetInvoice,
      status: 'completed',
      paidDate: new Date().toISOString().split('T')[0]
    };

    const newTx: Transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      ownerId: userProfile.id,
      tenantId: targetInvoice.tenantId,
      propertyId: targetInvoice.propertyId,
      invoiceId: targetInvoice.id,
      type: 'credit',
      category: 'Rent Income',
      amount: targetInvoice.amount,
      date: new Date().toISOString().split('T')[0],
      description: `Cleared lease payment for cycle ${targetInvoice.month}. Invoice reference: ${targetInvoice.invoiceNumber}.`,
      referenceNo
    };

    try {
      await apiFetch('/api/invoices', {
        method: 'POST',
        body: JSON.stringify(updatedInvoice)
      });
      await apiFetch('/api/transactions', {
        method: 'POST',
        body: JSON.stringify(newTx)
      });
      await handleAddLog('Payment Received', `Recorded credit of ₹${targetInvoice.amount} for invoice ${targetInvoice.invoiceNumber}.`);
      await syncKingdomData(false);
    } catch (err: any) {
      console.error('Failed to sync payment transaction:', err);
      alert(`Failed to record payment: ${err.message || 'Server error'}.`);
      throw err;
    }
  };

  // Action: Add custom direct transaction
  const handleAddTransaction = async (txData: Omit<Transaction, 'id' | 'ownerId'>) => {
    if (!userProfile) return;
    
    const newTx: Transaction = {
      ...txData,
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      ownerId: userProfile.id,
      referenceNo: `MANUAL-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    };

    try {
      await apiFetch('/api/transactions', {
        method: 'POST',
        body: JSON.stringify(newTx)
      });
      await handleAddLog('Manual Ledger Entry', `Recorded manual ${newTx.type} of ₹${newTx.amount} inside "${newTx.category}".`);
      await syncKingdomData(false);
    } catch (err: any) {
      console.error('Failed to save manual ledger transaction:', err);
      alert(`Failed to save transaction: ${err.message || 'Server error'}.`);
      throw err;
    }
  };

  // Logout session
  const handleLogOut = async () => {
    try {
      await handleAddLog('Session Log-Out', `User logged out of the Sovereign Estate portal.`);
    } catch (e) {}
    clearLocalSession();
    setUserProfile(null);
  };

  return (
    <div className="min-h-screen bg-[#07070a] text-neutral-100 relative overflow-hidden font-sans selection:bg-[#d4af37]/30 selection:text-white">
      {/* iOS 26 Liquid Glass Ambient Mesh Background Orbs */}
      <div className="fixed -top-32 -left-32 w-[600px] h-[600px] bg-gradient-to-br from-[#d4af37]/15 via-amber-600/10 to-transparent rounded-full blur-[140px] pointer-events-none animate-liquid-float" />
      <div className="fixed top-1/2 -right-48 w-[700px] h-[700px] bg-gradient-to-bl from-amber-500/12 via-indigo-900/15 to-transparent rounded-full blur-[160px] pointer-events-none animate-liquid-float-reverse" />
      <div className="fixed -bottom-40 left-1/3 w-[650px] h-[650px] bg-gradient-to-tr from-purple-900/15 via-[#c5a880]/10 to-transparent rounded-full blur-[150px] pointer-events-none animate-liquid-float" />

      {(!userProfile || userProfile.status !== 'active') ? (
        <AuthPage 
          userProfile={userProfile}
          loading={loading}
          onLoginSuccess={handleLoginSuccess}
          onLogOut={handleLogOut}
        />
      ) : userProfile.role === 'admin' ? (
        <Suspense fallback={
          <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#0d0d0f]">
            <div className="w-10 h-10 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-[#d4af37] font-serif tracking-widest text-xs uppercase animate-pulse">Accessing Imperial Citadel...</p>
          </div>
        }>
          <AdminDashboard 
            adminUser={userProfile}
            users={users}
            properties={properties}
            logs={logs}
            onLogOut={handleLogOut}
            onUpdateUserStatus={handleUpdateUserStatus}
            onAddLog={handleAddLog}
            onCreateOwner={handleCreateOwner}
            onUpdateProfile={handleUpdateProfile}
          />
        </Suspense>
      ) : (
        <Suspense fallback={
          <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#0d0d0f]">
            <div className="w-10 h-10 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-[#d4af37] font-serif tracking-widest text-xs uppercase animate-pulse">Entering Estate Command...</p>
          </div>
        }>
          <OwnerDashboard 
            ownerUser={userProfile}
            properties={properties}
            tenants={tenants}
            allocations={allocations}
            invoices={invoices}
            transactions={transactions}
            logs={logs}
            onAddProperty={handleAddProperty}
            onUpdateProperty={handleUpdateProperty}
            onDeleteProperty={handleDeleteProperty}
            onAddTenant={handleAddTenant}
            onUpdateTenant={handleUpdateTenant}
            onDeleteTenant={handleDeleteTenant}
            onAllocateTenant={handleAllocateTenant}
            onUpdateAllocation={handleUpdateAllocation}
            onGenerateMonthlyInvoices={handleGenerateMonthlyInvoices}
            onRecordPayment={handleRecordPayment}
            onAddTransaction={handleAddTransaction}
            onLogOut={handleLogOut}
            onAddLog={handleAddLog}
            onUpdateProfile={handleUpdateProfile}
          />
        </Suspense>
      )}
    </div>
  );
}
