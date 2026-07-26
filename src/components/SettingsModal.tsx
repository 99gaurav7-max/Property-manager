import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, X, User, Mail, Phone, Key, ShieldCheck, CheckCircle2, AlertCircle, Eye, EyeOff, Save } from 'lucide-react';
import { User as UserType } from '../types';
import { apiFetch, formatTitleCaseName } from '../lib/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType;
  onUpdateSuccess: (updatedUser: UserType) => void;
}

export default function SettingsModal({ isOpen, onClose, currentUser, onUpdateSuccess }: SettingsModalProps) {
  const [name, setName] = useState(currentUser.name || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [phone, setPhone] = useState(currentUser.phone || '');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  if (!isOpen) return null;

  const handleValidation = (): boolean => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setErrorMsg('Full Name is required.');
      return false;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg('Please provide a valid email address.');
      return false;
    }

    if (newPassword || confirmPassword || currentPassword) {
      if (!currentPassword || !currentPassword.trim()) {
        setErrorMsg('Current password is required to authorize any password change.');
        return false;
      }
      if (!newPassword || !newPassword.trim()) {
        setErrorMsg('Please enter your new password.');
        return false;
      }
      if (!confirmPassword || !confirmPassword.trim()) {
        setErrorMsg('Please confirm your new password.');
        return false;
      }
      if (newPassword.length < 6) {
        setErrorMsg('New password must be at least 6 characters long.');
        return false;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg('New password and confirm new password do not match.');
        return false;
      }
      if (newPassword === currentPassword) {
        setErrorMsg('New password cannot be identical to your current password.');
        return false;
      }
    }

    return true;
  };

  const handlePreSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (handleValidation()) {
      setShowConfirmDialog(true);
    }
  };

  const handleExecuteSave = async () => {
    setShowConfirmDialog(false);
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const formattedName = formatTitleCaseName(name);
      const payload: any = {
        name: formattedName,
        email: email.trim(),
        phone: phone.trim()
      };

      if (newPassword || confirmPassword || currentPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
        payload.confirmPassword = confirmPassword;
      }

      const res = await apiFetch('/api/user/profile', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.user) {
        onUpdateSuccess(res.user);
        setSuccessMsg(res.message || 'Profile details and security credentials updated successfully in database!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setErrorMsg(res.error || 'Failed to update profile settings.');
      }
    } catch (err: any) {
      console.error('Settings update failed:', err);
      setErrorMsg(err.message || 'An error occurred while updating profile.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#121214] border border-[#d4af37]/40 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden relative my-8"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37]">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-display font-semibold text-neutral-100 uppercase tracking-wider">Account Settings & Security</h2>
              <p className="text-xs text-neutral-400">Update user profile details and password in database registry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-100 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handlePreSave} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl flex items-center gap-2 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl flex items-center gap-2 text-xs text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Section 1: User Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-display uppercase tracking-wider text-[#d4af37] font-semibold flex items-center gap-2">
              <User className="w-4 h-4" /> Personal & Account Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1 font-medium">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter full name"
                    className="block w-full pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1 font-medium">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className="block w-full pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1 font-medium">
                  Contact Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="block w-full pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Password Security Updates */}
          <div className="space-y-4 pt-4 border-t border-neutral-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-display uppercase tracking-wider text-[#d4af37] font-semibold flex items-center gap-2">
                <Key className="w-4 h-4" /> Password Security Updates
              </h3>
              <span className="text-[10px] text-neutral-500">Leave blank if keeping current password</span>
            </div>

            <div className="space-y-3 bg-neutral-900/50 p-4 rounded-xl border border-neutral-800">
              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1 font-medium flex items-center justify-between">
                  <span>Current Password <span className="text-[#d4af37]">(Mandatory)</span></span>
                  {currentPassword && (
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-normal">
                      <CheckCircle2 className="w-3 h-3" /> Password entered
                    </span>
                  )}
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password to authorize changes"
                    className="block w-full pl-9 pr-10 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-2.5 text-neutral-500 hover:text-neutral-300 cursor-pointer"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1 font-medium">
                    New Password
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="block w-full pl-9 pr-10 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2.5 text-neutral-500 hover:text-neutral-300 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1 font-medium">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <ShieldCheck className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type new password"
                      className="block w-full pl-9 pr-10 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 text-neutral-500 hover:text-neutral-300 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Requirement Checks */}
              {(currentPassword || newPassword || confirmPassword) && (
                <div className="p-2.5 rounded-lg bg-neutral-950/80 border border-neutral-800/80 space-y-1.5 text-[11px] text-neutral-400 mt-2">
                  <div className="flex items-center gap-2">
                    {currentPassword.trim() ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    )}
                    <span className={currentPassword.trim() ? "text-emerald-300" : "text-amber-400"}>
                      Current password authorization provided
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {newPassword.length >= 6 ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                    )}
                    <span className={newPassword.length >= 6 ? "text-emerald-300" : "text-neutral-400"}>
                      New password is at least 6 characters long
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {newPassword && confirmPassword && newPassword === confirmPassword ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                    )}
                    <span className={newPassword && confirmPassword && newPassword === confirmPassword ? "text-emerald-300" : "text-neutral-400"}>
                      New password matches confirmation
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {newPassword && currentPassword && newPassword !== currentPassword ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                    )}
                    <span className={newPassword && currentPassword && newPassword !== currentPassword ? "text-emerald-300" : "text-neutral-400"}>
                      New password is distinct from current password
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-neutral-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-medium rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-[#d4af37] hover:bg-[#c5a880] text-neutral-950 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-[#d4af37]/10 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {submitting ? 'Saving to Database...' : 'Save Changes & Update Profile'}
            </button>
          </div>
        </form>

        {/* Confirmation Modal overlay */}
        <AnimatePresence>
          {showConfirmDialog && (
            <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-[#18181b] border border-[#d4af37]/50 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-center"
              >
                <div className="w-12 h-12 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37] mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-display font-semibold text-neutral-100 uppercase tracking-wider">Confirm Profile & Security Update</h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Are you sure you want to push these updates to the database? All future log-ins and sessions will require your updated credentials.
                  </p>
                </div>
                <div className="flex gap-3 justify-center pt-2">
                  <button
                    onClick={() => setShowConfirmDialog(false)}
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium rounded-xl transition-colors"
                  >
                    Go Back & Review
                  </button>
                  <button
                    onClick={handleExecuteSave}
                    className="px-5 py-2 bg-[#d4af37] hover:bg-[#c5a880] text-neutral-950 text-xs font-semibold rounded-xl shadow-lg transition-all"
                  >
                    Yes, Confirm & Push to Database
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
