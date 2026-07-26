import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, UserCheck, UserX, FileDown, Activity, Search, ShieldAlert, CheckCircle, 
  XCircle, Ban, RefreshCcw, LogOut, Download, Globe, Server, Calendar, Building,
  Mail, Phone, Briefcase, User as UserIcon, Crown, Settings
} from 'lucide-react';
import { User, ActivityLog, Property } from '../types';
import SettingsModal from './SettingsModal';
import { formatTitleCaseName } from '../lib/api';

interface AdminDashboardProps {
  adminUser: User;
  users: User[];
  properties: Property[];
  logs: ActivityLog[];
  onLogOut: () => void;
  onUpdateUserStatus: (userId: string, status: 'active' | 'suspended', reason?: string) => void;
  onAddLog: (action: string, details: string) => void;
  onCreateOwner: (ownerData: {
    name: string;
    email: string;
    phone: string;
    businessName?: string;
    status: 'active' | 'pending';
  }) => Promise<boolean>;
  onUpdateProfile?: (updatedUser: User) => void;
}

export default function AdminDashboard({
  adminUser,
  users,
  properties,
  logs,
  onLogOut,
  onUpdateUserStatus,
  onAddLog,
  onCreateOwner,
  onUpdateProfile
}: AdminDashboardProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'owner' | 'admin'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'active' | 'suspended'>('all');
  const [logSearch, setLogSearch] = useState('');

  // Dialog State
  const [adminConfirmAction, setAdminConfirmAction] = useState<{
    type: 'verify' | 'suspend' | 'logout' | 'export_users' | 'export_logs';
    userId?: string;
    userName?: string;
    actionType?: 'active' | 'suspended';
  } | null>(null);

  const [actionReason, setActionReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  // Owner Creation Modal State
  const [showAddOwnerModal, setShowAddOwnerModal] = useState(false);
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [newOwnerPhone, setNewOwnerPhone] = useState('');
  const [newOwnerCountryCode, setNewOwnerCountryCode] = useState('+91');
  const [newOwnerStatus, setNewOwnerStatus] = useState<'active' | 'pending'>('active');
  const [isSubmittingOwner, setIsSubmittingOwner] = useState(false);
  const [ownerError, setOwnerError] = useState('');

  const countryCodes = [
    { code: '+91', country: 'IN' },
    { code: '+1', country: 'US' },
    { code: '+44', country: 'UK' },
    { code: '+971', country: 'UAE' },
    { code: '+65', country: 'SG' },
  ];

  const handleRegisterOwnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOwnerError('');
    
    if (!newOwnerName.trim()) {
      setOwnerError('Full Name is required.');
      return;
    }
    if (!newOwnerEmail.trim() || !newOwnerEmail.includes('@')) {
      setOwnerError('A valid Email address is required.');
      return;
    }
    if (!newOwnerPhone.trim()) {
      setOwnerError('Phone number is required.');
      return;
    }

    const fullPhone = `${newOwnerCountryCode} ${newOwnerPhone.trim()}`;
    const formattedName = formatTitleCaseName(newOwnerName);

    setIsSubmittingOwner(true);
    try {
      await onCreateOwner({
        name: formattedName,
        email: newOwnerEmail.trim().toLowerCase(),
        phone: fullPhone,
        status: newOwnerStatus
      });
      setShowAddOwnerModal(false);
      onAddLog('Owner Account Created', `Administrator created owner account for ${formattedName} (${newOwnerEmail.trim().toLowerCase()}).`);
    } catch (err: any) {
      console.error(err);
      setOwnerError(err.message || 'Failed to register owner account.');
    } finally {
      setIsSubmittingOwner(false);
    }
  };

  // Total owners (excluding admin itself)
  const owners = users.filter(u => u.role === 'owner');
  const totalOwners = owners.length;
  const pendingOwners = owners.filter(u => u.status === 'pending').length;
  const activeOwners = owners.filter(u => u.status === 'active').length;
  const suspendedOwners = owners.filter(u => u.status === 'suspended').length;

  // Property distribution computations
  const totalPropertiesCount = properties.length;
  const propertyCountsByLocation = properties.reduce<Record<string, number>>((acc, p) => {
    const loc = p.location ? p.location.trim() : "Unknown";
    acc[loc] = (acc[loc] || 0) + 1;
    return acc;
  }, {});
  const locationDetails = Object.entries(propertyCountsByLocation)
    .map(([loc, count]) => `${count} in ${loc}`)
    .join(', ');

  // Filter Owners
  const filteredOwners = owners.filter(o => {
    const matchesSearch = 
      o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.phone || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || o.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Filter Logs
  const filteredLogs = logs.filter(l => {
    const matchesSearch = 
      l.userName.toLowerCase().includes(logSearch.toLowerCase()) ||
      l.action.toLowerCase().includes(logSearch.toLowerCase()) ||
      l.details.toLowerCase().includes(logSearch.toLowerCase());
    return matchesSearch;
  });

  // Actual CSV Export Implementations
  const executeExportUsersCSV = () => {
    const headers = ['User ID', 'Name', 'Email', 'Role', 'Status', 'Status Reason', 'Registered Date', 'Phone'];
    const rows = users.map(u => [
      u.id,
      u.name,
      u.email,
      u.role,
      u.status,
      u.statusReason || 'N/A',
      new Date(u.createdAt).toLocaleDateString(),
      u.phone || 'N/A'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sovereign_users_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onAddLog('CSV Export', `Administrator exported user data reports containing ${users.length} entities to CSV.`);
  };

  const executeExportLogsCSV = () => {
    const headers = ['Log ID', 'User Name', 'Role', 'Action Took', 'Details', 'Timestamp'];
    const rows = logs.map(l => [
      l.id,
      l.userName,
      l.userRole,
      l.action,
      l.details,
      new Date(l.timestamp).toLocaleString()
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sovereign_activity_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onAddLog('CSV Export', `Administrator exported ${logs.length} activity log streams to CSV.`);
  };

  // Triggers for Confirmation Modal
  const handleExportUsersCSV = () => {
    setAdminConfirmAction({ type: 'export_users' });
  };

  const handleExportLogsCSV = () => {
    setAdminConfirmAction({ type: 'export_logs' });
  };

  const handleOpenStatusConfirm = (userId: string, actionType: 'active' | 'suspended') => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;
    
    setAdminConfirmAction({
      type: actionType === 'active' ? 'verify' : 'suspend',
      userId,
      userName: targetUser.name,
      actionType
    });
    setActionReason('');
    setReasonError('');
  };

  const handleExecuteAdminAction = () => {
    if (!adminConfirmAction) return;

    const { type, userId, userName, actionType } = adminConfirmAction;

    // Check if reason is provided for status changes
    if ((type === 'verify' || type === 'suspend') && !actionReason.trim()) {
      setReasonError('Please provide a reason for this administrative decision.');
      return;
    }

    if (type === 'verify' || type === 'suspend') {
      if (userId && actionType) {
        onUpdateUserStatus(userId, actionType, actionReason.trim());
        const logDetails = actionType === 'active'
          ? `Sovereign Admin approved & verified noble owner profile: ${userName}. Reason: ${actionReason.trim()}`
          : `Sovereign Admin suspended owner profile access: ${userName}. Reason: ${actionReason.trim()}`;
        
        onAddLog(actionType === 'active' ? 'Account Verified' : 'Account Suspended', logDetails);
      }
    } else if (type === 'logout') {
      onLogOut();
    } else if (type === 'export_users') {
      executeExportUsersCSV();
    } else if (type === 'export_logs') {
      executeExportLogsCSV();
    }

    setAdminConfirmAction(null);
    setActionReason('');
    setReasonError('');
  };

  return (
    <div className="min-h-screen text-neutral-100 font-sans pb-16 relative">
      
      {/* iOS 26 Liquid Glass Top Nav */}
      <header className="sticky top-2 z-40 mx-2 sm:mx-6 my-2 rounded-full liquid-glass border border-white/15 px-4 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#d4af37]/30 to-amber-900/40 border border-[#d4af37]/50 flex items-center justify-center shrink-0 shadow-inner">
            <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-[#f3e5ab]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-md font-sans font-bold tracking-wider text-[#f3e5ab] uppercase flex items-center gap-2 flex-wrap">
              Imperial Chamber
              <span className="text-[9px] sm:text-[10px] tracking-normal font-sans bg-amber-950/60 text-[#f3e5ab] px-2 py-0.5 rounded-full border border-[#d4af37]/30 backdrop-blur-md">
                ADMIN
              </span>
            </h1>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full liquid-pill-gold mt-0.5 max-w-full overflow-hidden">
              <Crown className="w-3 h-3 text-[#d4af37] animate-pulse shrink-0" />
              <span className="text-[9px] sm:text-[10px] font-sans font-bold uppercase tracking-widest text-[#f3e5ab] truncate">
                PORTFOLIO OF IMPERIAL ESTATES & SYSTEM CONTROL
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="hidden md:block text-right">
            <p className="text-xs font-medium text-neutral-200">{adminUser.name}</p>
            <p className="text-[10px] text-neutral-400">{adminUser.email}</p>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 py-1.5 px-3.5 rounded-full liquid-pill hover:border-[#d4af37]/60 text-xs text-neutral-200 transition-all duration-300 cursor-pointer"
            id="btn-admin-settings"
            title="Account Settings & Security"
          >
            <Settings className="w-3.5 h-3.5 text-[#d4af37]" />
            <span className="hidden xs:inline sm:inline font-medium">Settings</span>
          </button>
          <button 
            onClick={() => setAdminConfirmAction({ type: 'logout' })}
            className="flex items-center gap-1.5 sm:gap-2 py-1.5 px-3.5 rounded-full liquid-pill hover:bg-red-500/20 hover:border-red-500/40 text-xs text-neutral-300 hover:text-red-300 transition-all duration-300"
            id="btn-admin-logout"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden xs:inline sm:inline">Signet Exit</span>
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* Portfolio Property Distribution KPI Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="liquid-glass-card rounded-3xl p-6 relative overflow-hidden w-full mb-6"
        >
          <div className="absolute top-4 right-4 text-[#d4af37]/30">
            <Building className="w-7 h-7" />
          </div>
          <p className="text-[11px] font-sans uppercase tracking-wider text-[#f3e5ab]">Total Managed Properties</p>
          <div className="flex flex-col md:flex-row md:items-baseline gap-4 mt-2">
            <h3 className="text-3xl font-bold font-sans text-[#f3e5ab]">{totalPropertiesCount}</h3>
            {locationDetails ? (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[10px] text-neutral-400 font-sans uppercase tracking-wider">Location Distribution:</span>
                {Object.entries(propertyCountsByLocation).map(([loc, count]) => (
                  <span key={loc} className="text-[10px] liquid-pill text-neutral-200 px-3 py-1 rounded-full font-medium">
                    <span className="text-[#f3e5ab] font-bold">{count}</span> in {loc}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-neutral-400">No properties registered across systems</p>
            )}
          </div>
        </motion.div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="liquid-glass-card rounded-3xl p-5 relative overflow-hidden"
          >
            <div className="absolute top-4 right-4 text-neutral-500">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-[11px] font-sans uppercase tracking-wider text-[#f3e5ab]">Total Owners</p>
            <h3 className="text-3xl font-bold mt-2 font-sans text-white">{totalOwners}</h3>
            <p className="text-[10px] text-neutral-400 mt-1">Noble registries across systems</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-[#121214] border border-neutral-800/80 rounded-xl p-5 relative overflow-hidden"
          >
            <div className="absolute top-4 right-4 text-amber-500/20">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <p className="text-[11px] font-display uppercase tracking-wider text-amber-500">Pending Approvals</p>
            <h3 className="text-3xl font-bold mt-2 font-display text-amber-500">{pendingOwners}</h3>
            <p className="text-[10px] text-neutral-500 mt-1">Awaiting Imperial keys verification</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="bg-[#121214] border border-neutral-800/80 rounded-xl p-5 relative overflow-hidden"
          >
            <div className="absolute top-4 right-4 text-emerald-500/20">
              <CheckCircle className="w-6 h-6" />
            </div>
            <p className="text-[11px] font-display uppercase tracking-wider text-emerald-400">Verified Active</p>
            <h3 className="text-3xl font-bold mt-2 font-display text-emerald-400">{activeOwners}</h3>
            <p className="text-[10px] text-neutral-500 mt-1">Owners actively collecting tax/rents</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-[#121214] border border-neutral-800/80 rounded-xl p-5 relative overflow-hidden"
          >
            <div className="absolute top-4 right-4 text-neutral-700">
              <Activity className="w-6 h-6" />
            </div>
            <p className="text-[11px] font-display uppercase tracking-wider text-[#d4af37]">System Logs</p>
            <h3 className="text-3xl font-bold mt-2 font-display text-neutral-100">{logs.length}</h3>
            <p className="text-[10px] text-neutral-500 mt-1">Total secure records audited</p>
          </motion.div>

        </div>

        {/* Central Management Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          
          {/* Owners verification & control panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#121214] border border-neutral-800/80 rounded-xl p-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-neutral-800/80">
                <div>
                  <h2 className="text-lg font-display font-semibold tracking-wider text-[#c5a880]">
                    Noble Registrant Registries
                  </h2>
                  <p className="text-xs text-neutral-500">Authorize, monitor, and configure owner system-access credentials.</p>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleExportUsersCSV}
                    className="flex items-center gap-1.5 py-2 px-3 rounded-lg bg-[#d4af37]/10 hover:bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/20 font-medium text-xs transition-all duration-300"
                    id="btn-export-owners-csv"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Report CSV
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-3.5 w-3.5 text-neutral-500" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search name, email, or estate..."
                    className="block w-full pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#d4af37] text-xs transition-all duration-300"
                  />
                </div>

                <div className="flex gap-2">
                  <select
                    value={filterStatus}
                    onChange={(e: any) => setFilterStatus(e.target.value)}
                    className="block w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-300 focus:outline-none focus:ring-1 focus:ring-[#d4af37] text-xs transition-all duration-300"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Awaiting Verification</option>
                    <option value="active">Active Members</option>
                    <option value="suspended">Suspended Members</option>
                  </select>
                </div>
              </div>

              {/* Owners Table */}
              <div className="overflow-x-auto">
                {filteredOwners.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-neutral-800 rounded-lg">
                    <Users className="w-8 h-8 text-neutral-700 mx-auto mb-2" />
                    <p className="text-xs text-neutral-500">No matching noble owners found in current registries.</p>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-neutral-800">
                    <thead>
                      <tr className="text-left text-[10px] font-display uppercase tracking-widest text-[#c5a880] pb-2">
                        <th className="pb-3 font-semibold">Noble Credential</th>
                        <th className="pb-3 font-semibold">Registration Date</th>
                        <th className="pb-3 font-semibold">Status</th>
                        <th className="pb-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/50 text-xs">
                      {filteredOwners.map((owner) => (
                        <tr key={owner.id} className="hover:bg-neutral-900/40 transition-colors duration-150">
                          <td className="py-4">
                            <div className="font-semibold text-neutral-200">{owner.name}</div>
                            <div className="text-[10px] text-neutral-500">{owner.email}</div>
                            <div className="text-[9px] text-[#c5a880]/70 mt-0.5">{owner.phone}</div>
                          </td>
                          <td className="py-4">
                            <span className="font-medium text-neutral-300">Registered: {new Date(owner.createdAt).toLocaleDateString()}</span>
                            <div className="text-[9px] text-neutral-500 uppercase tracking-wider font-mono">{owner.role}</div>
                          </td>
                          <td className="py-4">
                            {owner.status === 'pending' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-950/40 text-amber-400 border border-amber-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                Pending Admin Keys
                              </span>
                            )}
                            {owner.status === 'active' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950/40 text-emerald-400 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                Active Sovereign
                              </span>
                            )}
                            {owner.status === 'suspended' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-red-950/40 text-red-400 border border-red-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                Suspended
                              </span>
                            )}
                            {owner.statusReason && (
                              <div className="text-[10px] text-neutral-500 mt-1.5 max-w-[180px] break-words leading-relaxed border-t border-neutral-900 pt-1">
                                <span className="text-[#c5a880]/90 font-medium">Reason:</span> {owner.statusReason}
                              </div>
                            )}
                          </td>
                          <td className="py-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              {owner.status === 'pending' && (
                                <button
                                  onClick={() => handleOpenStatusConfirm(owner.id, 'active')}
                                  className="py-1 px-2.5 rounded bg-emerald-900/20 hover:bg-emerald-900/40 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold tracking-wider uppercase transition-all duration-300"
                                  id={`btn-approve-${owner.id}`}
                                >
                                  Grant Access
                                </button>
                              )}
                              
                              {owner.status === 'active' && (
                                <button
                                  onClick={() => handleOpenStatusConfirm(owner.id, 'suspended')}
                                  className="py-1 px-2.5 rounded bg-red-900/10 hover:bg-red-900/30 text-red-400 border border-red-500/10 text-[10px] font-semibold tracking-wider uppercase transition-all duration-300 flex items-center gap-1"
                                  id={`btn-suspend-${owner.id}`}
                                >
                                  <Ban className="w-2.5 h-2.5" />
                                  Suspend
                                </button>
                              )}

                              {owner.status === 'suspended' && (
                                <button
                                  onClick={() => handleOpenStatusConfirm(owner.id, 'active')}
                                  className="py-1 px-2.5 rounded bg-emerald-900/15 hover:bg-emerald-900/30 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold tracking-wider uppercase transition-all duration-300"
                                  id={`btn-reactivate-${owner.id}`}
                                >
                                  Reactivate
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

            </div>

            {/* Quick Informational Tips */}
            <div className="bg-[#121214] border border-neutral-800/80 rounded-xl p-5 text-xs text-neutral-400 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-display font-semibold text-[#c5a880] mb-2 uppercase tracking-wide">
                  Account Verification Protocol
                </h4>
                <p className="leading-relaxed text-neutral-500 text-[11px]">
                  When noble Owners request access, the platform puts them in "Pending" status. They are strictly blocked from logging in or reading database resources until the Administrator clicks **"Grant Access"**.
                </p>
              </div>
              <div>
                <h4 className="font-display font-semibold text-[#c5a880] mb-2 uppercase tracking-wide">
                  Suspension Mechanics
                </h4>
                <p className="leading-relaxed text-neutral-500 text-[11px]">
                  Suspending an owner instantly revokes their active session and blocks all further database writes. Their associated properties, tenants, and tax data remain perfectly stored and encrypted.
                </p>
              </div>
            </div>

          </div>

          {/* Activity Logs Stream */}
          <div className="bg-[#121214] border border-neutral-800/80 rounded-xl p-6 flex flex-col h-[600px]">
            
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800/80 mb-4">
              <div>
                <h2 className="text-md font-display font-semibold tracking-wider text-[#c5a880] flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-[#d4af37]" />
                  Imperial Auditor Log
                </h2>
                <p className="text-[10px] text-neutral-500">Secure real-time platform audits.</p>
              </div>

              <button 
                onClick={handleExportLogsCSV}
                className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-[#d4af37]/30 text-neutral-400 hover:text-[#d4af37] transition-all duration-300"
                title="Download Audit Logs as CSV"
                id="btn-export-logs-csv"
              >
                <FileDown className="w-4 h-4" />
              </button>
            </div>

            {/* Logs Search */}
            <div className="mb-4">
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                  <Search className="h-3 w-3 text-neutral-500" />
                </div>
                <input
                  type="text"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Filter actions or actors..."
                  className="block w-full pl-8 pr-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-300 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#d4af37] text-[11px] transition-all duration-300"
                />
              </div>
            </div>

            {/* Scrollable logs stream */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-neutral-600">
                  <Server className="w-6 h-6 mx-auto mb-2 opacity-30" />
                  No audit entries found.
                </div>
              ) : (
                filteredLogs.slice().reverse().map((log) => (
                  <div key={log.id} className="p-3 bg-[#1c1c1e] border border-neutral-800/80 rounded-lg relative overflow-hidden">
                    <div className="absolute right-3 top-3 text-[9px] text-neutral-600 flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" />
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                    
                    <div className="font-semibold text-[#c5a880] text-[11px] flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        log.action.includes('Verified') || log.action.includes('Boot') ? 'bg-emerald-500' : 
                        log.action.includes('Suspend') ? 'bg-red-500' : 'bg-[#d4af37]'
                      }`} />
                      {log.action}
                    </div>

                    <p className="text-neutral-300 text-[11px] mt-1.5 leading-relaxed">
                      {log.details}
                    </p>

                    <div className="mt-2 pt-1 border-t border-neutral-900 text-[10px] text-neutral-500 flex justify-between items-center">
                      <span>Actor: {log.userName}</span>
                      <span className="uppercase text-[8px] tracking-wider px-1 bg-neutral-900 border border-neutral-800 rounded text-neutral-400">
                        {log.userRole}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>

        </div>

      </div>

      {/* Royal Admin Confirmation Modal */}
      <AnimatePresence>
        {adminConfirmAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAdminConfirmAction(null)}
              className="fixed inset-0 bg-black/85 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative bg-[#121214] border border-neutral-800 rounded-xl max-w-md w-full p-6 text-left shadow-2xl z-10 my-auto max-h-[88vh] flex flex-col overflow-hidden"
            >
              {/* Gold Accent Corner */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-transparent to-[#d4af37]/5 rounded-bl-full pointer-events-none" />

              <div className="flex items-start gap-4 flex-1 min-h-0 overflow-hidden">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
                  adminConfirmAction.type === 'verify' ? 'bg-emerald-950/40 border-emerald-500/20 text-emerald-400' :
                  adminConfirmAction.type === 'suspend' ? 'bg-red-950/40 border-red-500/20 text-red-400' :
                  adminConfirmAction.type === 'logout' ? 'bg-amber-950/40 border-amber-500/20 text-amber-400' :
                  'bg-[#d4af37]/10 border-[#d4af37]/20 text-[#d4af37]'
                }`}>
                  {adminConfirmAction.type === 'verify' && <CheckCircle className="w-5 h-5" />}
                  {adminConfirmAction.type === 'suspend' && <XCircle className="w-5 h-5" />}
                  {adminConfirmAction.type === 'logout' && <LogOut className="w-5 h-5" />}
                  {(adminConfirmAction.type === 'export_users' || adminConfirmAction.type === 'export_logs') && <Download className="w-5 h-5" />}
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                  <h3 className="text-md font-display font-bold tracking-wider text-neutral-100 uppercase shrink-0">
                    {adminConfirmAction.type === 'verify' && 'Confirm Account Approval'}
                    {adminConfirmAction.type === 'suspend' && 'Confirm Account Suspension'}
                    {adminConfirmAction.type === 'logout' && 'Confirm Signet Exit'}
                    {adminConfirmAction.type === 'export_users' && 'Confirm User Data Export'}
                    {adminConfirmAction.type === 'export_logs' && 'Confirm Audit Log Export'}
                  </h3>

                  <div className="flex-1 overflow-y-auto pr-1 mt-2 space-y-3">
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      {adminConfirmAction.type === 'verify' && `Are you sure you want to verify and grant active access to ${adminConfirmAction.userName}? This will permit immediate login and control of properties.`}
                      {adminConfirmAction.type === 'suspend' && `Are you sure you want to suspend access for ${adminConfirmAction.userName}? This will instantly lock out the user and block all session requests.`}
                      {adminConfirmAction.type === 'logout' && 'Are you sure you want to terminate your current administrative session and lock the chamber portals?'}
                      {adminConfirmAction.type === 'export_users' && 'Are you sure you want to download the entire registry of noble owners, contact details, and business holdings as a secure CSV report?'}
                      {adminConfirmAction.type === 'export_logs' && 'Are you sure you want to extract the full cryptographic activity stream of audit logs to a local CSV file?'}
                    </p>

                    {/* Reason Field for Verify or Suspend */}
                    {(adminConfirmAction.type === 'verify' || adminConfirmAction.type === 'suspend') && (
                      <div className="mt-4">
                        <label className="block text-[10px] font-display uppercase tracking-widest text-[#c5a880] mb-1.5 font-semibold">
                          Administrative Reason <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={actionReason}
                          onChange={(e) => {
                            setActionReason(e.target.value);
                            if (e.target.value.trim()) setReasonError('');
                          }}
                          placeholder={adminConfirmAction.type === 'verify' ? 'e.g. Identity and tax holdings verified successfully.' : 'e.g. Suspected breach of rental code.'}
                          rows={3}
                          className="block w-full p-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#d4af37] text-xs resize-none"
                        />
                        {reasonError && (
                          <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-red-400" />
                            {reasonError}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-800 flex justify-end gap-2 text-xs shrink-0">
                    <button
                      onClick={() => setAdminConfirmAction(null)}
                      className="py-2 px-4 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-all duration-300"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={handleExecuteAdminAction}
                      className={`py-2 px-4 rounded-lg font-semibold tracking-wider uppercase transition-all duration-300 ${
                        adminConfirmAction.type === 'suspend' ? 'bg-red-900 hover:bg-red-800 text-red-100 border border-red-500/20' :
                        adminConfirmAction.type === 'verify' ? 'bg-emerald-900 hover:bg-emerald-800 text-emerald-100 border border-emerald-500/20' :
                        'bg-[#d4af37] hover:bg-[#c5a880] text-black'
                      }`}
                    >
                      {adminConfirmAction.type === 'verify' && 'Approve'}
                      {adminConfirmAction.type === 'suspend' && 'Suspend'}
                      {adminConfirmAction.type === 'logout' && 'Exit Chamber'}
                      {adminConfirmAction.type === 'export_users' && 'Download Registry'}
                      {adminConfirmAction.type === 'export_logs' && 'Download Audit'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Owner Account Modal */}
      <AnimatePresence>
        {showAddOwnerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddOwnerModal(false)}
              className="fixed inset-0 bg-black/85 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative bg-[#121214] border border-neutral-800 rounded-xl max-w-md w-full p-6 text-left shadow-2xl z-10 my-auto max-h-[88vh] flex flex-col overflow-hidden"
            >
              {/* Gold Accent Corner */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-transparent to-[#d4af37]/5 rounded-bl-full pointer-events-none" />

              <div className="flex items-start gap-4 mb-3 shrink-0">
                <div className="w-10 h-10 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/20 text-[#d4af37] flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-md font-display font-bold tracking-wider text-neutral-100 uppercase">
                    Initialize Noble Owner
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">Pre-register system-access credentials for an estate owner.</p>
                </div>
              </div>

              <form onSubmit={handleRegisterOwnerSubmit} className="flex-1 flex flex-col min-h-0 text-xs">
                <div className="flex-1 overflow-y-auto pr-1 space-y-4 my-1">
                  {ownerError && (
                    <div className="p-3 bg-red-950/30 border border-red-500/20 text-red-400 rounded-lg flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                      <span>{ownerError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-medium uppercase tracking-widest text-[#c5a880]">
                        FULL NAME
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <UserIcon className="h-4 w-4 text-neutral-500" />
                        </div>
                        <input
                          type="text"
                          required
                          value={newOwnerName}
                          onChange={(e) => setNewOwnerName(e.target.value)}
                          placeholder="e.g. Lord Arthur"
                          className="block w-full pl-10 pr-3 py-2 bg-[#121212] border border-neutral-800 rounded-lg text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37] text-xs transition-all duration-300"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-medium uppercase tracking-widest text-[#c5a880]">
                        EMAIL ADDRESS
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Mail className="h-4 w-4 text-neutral-500" />
                        </div>
                        <input
                          type="email"
                          required
                          value={newOwnerEmail}
                          onChange={(e) => setNewOwnerEmail(e.target.value)}
                          placeholder="noble@imperial.com"
                          className="block w-full pl-10 pr-3 py-2 bg-[#121212] border border-neutral-800 rounded-lg text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37] text-xs transition-all duration-300"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium uppercase tracking-widest text-[#c5a880]">
                      SECURE CONTACT PHONE
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm flex gap-2">
                      <select
                        value={newOwnerCountryCode}
                        onChange={(e) => setNewOwnerCountryCode(e.target.value)}
                        className="block w-[85px] px-2 py-2 bg-[#121212] border border-neutral-800 rounded-lg text-neutral-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                      >
                        {countryCodes.map(c => (
                          <option key={c.code} value={c.code} className="bg-neutral-900 text-xs">
                            {c.country} ({c.code})
                          </option>
                        ))}
                      </select>

                      <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-4 w-4 text-neutral-500" />
                        </div>
                        <input
                          type="text"
                          required
                          value={newOwnerPhone}
                          onChange={(e) => setNewOwnerPhone(e.target.value)}
                          placeholder="9876543210"
                          className="block w-full pl-10 pr-3 py-2 bg-[#121212] border border-neutral-800 rounded-lg text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-[#d4af37] text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium uppercase tracking-widest text-[#c5a880]">
                      SYSTEM ACCESS STATUS
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <select
                        value={newOwnerStatus}
                        onChange={(e: any) => setNewOwnerStatus(e.target.value)}
                        className="block w-full px-3 py-2 bg-[#121212] border border-neutral-800 rounded-lg text-neutral-100 focus:outline-none focus:ring-1 focus:ring-[#d4af37] text-xs transition-all duration-300"
                      >
                        <option value="active" className="bg-neutral-900 text-neutral-200">Active (Instant Access)</option>
                        <option value="pending" className="bg-neutral-900 text-neutral-200">Pending Approval</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowAddOwnerModal(false)}
                    className="py-2 px-4 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-all duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingOwner}
                    className="py-2 px-4 rounded-lg bg-[#d4af37] hover:bg-[#c5a880] text-black font-semibold tracking-wider uppercase transition-all duration-300 flex items-center gap-1.5"
                  >
                    {isSubmittingOwner ? 'Creating...' : 'Create Owner Account'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentUser={adminUser}
        onUpdateSuccess={(updatedUser) => {
          if (onUpdateProfile) {
            onUpdateProfile(updatedUser);
          }
        }}
      />

    </div>
  );
}
