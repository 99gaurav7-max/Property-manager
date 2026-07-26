import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Landmark, Key, Mail, User as UserIcon, Phone, Briefcase, Sparkles, ArrowRight, CheckCircle, AlertCircle, LogOut, ArrowLeft, Eye, EyeOff, Building, FileText, DollarSign, Users, Globe } from 'lucide-react';
import { User, UserRole } from '../types';
import { formatTitleCaseName, API_BASE } from '../lib/api';

const countryCodes = [
  { code: '+91', country: 'IN', name: 'India (+91)' },
  { code: '+1', country: 'US', name: 'USA (+1)' },
  { code: '+44', country: 'GB', name: 'UK (+44)' },
  { code: '+61', country: 'AU', name: 'Australia (+61)' },
  { code: '+49', country: 'DE', name: 'Germany (+49)' },
  { code: '+971', country: 'AE', name: 'UAE (+971)' },
  { code: '+65', country: 'SG', name: 'Singapore (+65)' },
  { code: '+33', country: 'FR', name: 'France (+33)' },
  { code: '+81', country: 'JP', name: 'Japan (+81)' },
  { code: '+966', country: 'SA', name: 'Saudi Arabia (+966)' }
];

const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

const phoneValidationRules: Record<string, { country: string; expected: string; regex: RegExp; startCheck?: (digits: string) => boolean; startDesc?: string }> = {
  '+91': {
    country: 'India',
    expected: 'exactly 10 digits',
    regex: /^\d{10}$/,
    startCheck: (d) => /^[6-9]/.test(d),
    startDesc: '6, 7, 8, or 9'
  },
  '+1': {
    country: 'USA',
    expected: 'exactly 10 digits',
    regex: /^\d{10}$/,
    startCheck: (d) => /^[2-9]/.test(d),
    startDesc: '2 to 9'
  },
  '+44': {
    country: 'UK',
    expected: '9 to 11 digits',
    regex: /^\d{9,11}$/,
    startCheck: (d) => !d.startsWith('0'),
    startDesc: 'non-zero digit'
  },
  '+61': {
    country: 'Australia',
    expected: '9 digits',
    regex: /^\d{9}$/,
    startCheck: (d) => !d.startsWith('0'),
    startDesc: 'non-zero digit'
  },
  '+49': {
    country: 'Germany',
    expected: '10 to 12 digits',
    regex: /^\d{10,12}$/,
    startCheck: (d) => !d.startsWith('0'),
    startDesc: 'non-zero digit'
  },
  '+971': {
    country: 'UAE',
    expected: '8 to 9 digits',
    regex: /^\d{8,9}$/,
    startCheck: (d) => !d.startsWith('0'),
    startDesc: 'non-zero digit'
  },
  '+65': {
    country: 'Singapore',
    expected: 'exactly 8 digits',
    regex: /^\d{8}$/,
    startCheck: (d) => /^[3689]/.test(d),
    startDesc: '3, 6, 8, or 9'
  },
  '+33': {
    country: 'France',
    expected: 'exactly 9 digits',
    regex: /^\d{9}$/,
    startCheck: (d) => !d.startsWith('0'),
    startDesc: 'non-zero digit'
  },
  '+81': {
    country: 'Japan',
    expected: '9 to 10 digits',
    regex: /^\d{9,10}$/,
    startCheck: (d) => !d.startsWith('0'),
    startDesc: 'non-zero digit'
  },
  '+966': {
    country: 'Saudi Arabia',
    expected: 'exactly 9 digits',
    regex: /^\d{9}$/,
    startCheck: (d) => /^5/.test(d),
    startDesc: '5'
  }
};

const validateCountryPhone = (phone: string, countryCode: string): ValidationResult => {
  const digits = phone.replace(/[\s()-]/g, '');
  
  if (!digits) {
    return { isValid: false, error: 'Phone number cannot be empty.' };
  }

  if (!/^\d+$/.test(digits)) {
    return { isValid: false, error: 'Phone number must contain only digits.' };
  }

  const rule = phoneValidationRules[countryCode];
  if (!rule) {
    if (digits.length < 7 || digits.length > 15) {
      return { isValid: false, error: 'Phone number must be between 7 and 15 digits.' };
    }
    return { isValid: true };
  }

  if (!rule.regex.test(digits)) {
    return { 
      isValid: false, 
      error: `${rule.country} phone number must be ${rule.expected}. Current length: ${digits.length}.` 
    };
  }

  if (rule.startCheck && !rule.startCheck(digits)) {
    return { 
      isValid: false, 
      error: `${rule.country} phone numbers must start with ${rule.startDesc}.` 
    };
  }

  return { isValid: true };
};

interface AuthPageProps {
  userProfile: User | null;      // Profile in DB
  loading: boolean;
  onLoginSuccess: (user: User, token: string) => void;
  onLogOut: () => void;
}

export default function AuthPage({ 
  userProfile, 
  loading, 
  onLoginSuccess,
  onLogOut
}: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Registration States
  const [role, setRole] = useState<UserRole>('owner');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Password Visibility Toggles
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
  
  // Login States & Remember Me
  const [loginUsername, setLoginUsername] = useState(() => localStorage.getItem('remembered_user') || '');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('remembered_user'));

  // Status/Error States
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    
    if (!loginUsername || !loginPassword) {
      setFormError('Please enter both your registered email/phone number and password.');
      return;
    }

    if (rememberMe) {
      localStorage.setItem('remembered_user', loginUsername);
    } else {
      localStorage.removeItem('remembered_user');
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }

      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setFormError(err.message || 'Failed to authenticate.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name || !email || !phone || !password || !confirmPassword) {
      setFormError('Please fill in all mandatory fields.');
      return;
    }

    if (!isValidEmail(email)) {
      setFormError('A valid email address is required.');
      return;
    }

    const phoneVal = validateCountryPhone(phone, countryCode);
    if (!phoneVal.isValid) {
      setFormError(phoneVal.error || 'Invalid phone number format.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }

    const finalPhone = `${countryCode} ${phone.trim().replace(/[\s()-]/g, '')}`;
    const formattedName = formatTitleCaseName(name);

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formattedName,
          email,
          phone: finalPhone,
          role,
          password,
          confirmPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setFormError(err.message || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Floating celestial stardust particles configuration
  const stardust = [
    { id: 1, size: 3, top: '10%', left: '12%', duration: 7, delay: 0 },
    { id: 2, size: 5, top: '22%', left: '82%', duration: 9, delay: 1 },
    { id: 3, size: 2, top: '42%', left: '8%', duration: 6, delay: 2 },
    { id: 4, size: 4, top: '68%', left: '88%', duration: 8, delay: 0.5 },
    { id: 5, size: 3, top: '82%', left: '18%', duration: 7.5, delay: 1.5 },
    { id: 6, size: 2, top: '32%', left: '92%', duration: 8.5, delay: 2.5 },
    { id: 7, size: 4, top: '58%', left: '6%', duration: 9.5, delay: 3 },
    { id: 8, size: 3, top: '15%', left: '62%', duration: 6.5, delay: 0.8 },
  ];

  return (
    <div className="min-h-screen bg-[#06050a] relative overflow-hidden text-neutral-100 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 select-none">
      
      {/* Heavenly Royal Animated Nebulae & Background Orbs */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-b from-[#d4af37]/20 via-[#8a6a1c]/10 to-transparent rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute top-1/3 -left-40 w-[600px] h-[600px] bg-gradient-to-r from-amber-900/15 via-purple-950/10 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 -right-40 w-[600px] h-[600px] bg-gradient-to-l from-[#c5a880]/15 via-amber-950/10 to-transparent rounded-full blur-[140px] pointer-events-none" />

      {/* Floating Gold Stardust Particles */}
      {stardust.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-gradient-to-r from-[#d4af37] via-amber-100 to-[#c5a880] shadow-[0_0_12px_#d4af37] pointer-events-none"
          style={{
            width: p.size,
            height: p.size,
            top: p.top,
            left: p.left,
          }}
          animate={{
            y: [-20, 20, -20],
            opacity: [0.25, 0.9, 0.25],
            scale: [0.8, 1.5, 0.8]
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: p.delay
          }}
        />
      ))}

      {/* Decorative royal gold accent line */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent shadow-[0_0_20px_#d4af37]" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md mt-6 z-10 relative">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="flex flex-col items-center"
        >
          {/* Celestial Halo Icon Frame */}
          <div className="relative mb-4">
            <div className="absolute inset-0 rounded-full border border-[#d4af37]/30 animate-[spin_18s_linear_infinite] p-1" />
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1c1c1e] via-[#0f0d14] to-black border border-[#d4af37]/60 flex items-center justify-center shadow-[0_0_35px_rgba(212,175,55,0.35)] relative z-10">
              <Landmark className="w-8 h-8 text-[#d4af37]" />
            </div>
          </div>

          <h2 className="text-3xl font-display font-extrabold tracking-widest text-center text-transparent bg-clip-text bg-gradient-to-r from-[#d4af37] via-white to-[#c5a880] drop-shadow-[0_2px_12px_rgba(212,175,55,0.3)]">
            Property Manager
          </h2>
          <p className="text-xs font-display tracking-[0.3em] text-[#c5a880] mt-1 uppercase flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-[#d4af37] inline" />
            <span>ESTATE &amp; PROPERTY SUITE</span>
            <Sparkles className="w-3 h-3 text-[#d4af37] inline" />
          </p>
        </motion.div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg z-10 relative">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="liquid-glass-gold py-8 px-6 sm:px-10 rounded-3xl relative overflow-hidden"
        >
          <div className="absolute top-0 -left-[100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 animate-shimmer" />
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#d4af37]/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#c5a880]/10 rounded-full blur-3xl animate-pulse" />

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-10 h-10 rounded-full border-2 border-[#d4af37] border-t-transparent animate-spin" />
              <p className="text-[#c5a880] text-xs font-sans tracking-widest uppercase animate-pulse">
                Synchronizing Kingdom Data...
              </p>
            </div>
          ) : userProfile && userProfile.status === 'pending' ? (
            // Awaiting verification
            <div className="space-y-6 py-6 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-amber-400 animate-pulse" />
              </div>
              <h3 className="text-lg font-medium text-[#c5a880]">Awaiting Imperial Verification</h3>
              <p className="text-xs text-neutral-400 leading-relaxed max-w-sm mx-auto">
                Thank you for registering your profile, <span className="text-neutral-200 font-semibold">{userProfile.name}</span>. 
                Your credentials are currently awaiting approval from the Imperial Administrator.
              </p>
              <div className="pt-4">
                <button
                  onClick={onLogOut}
                  className="py-2.5 px-6 rounded-full liquid-pill text-neutral-300 text-xs tracking-wider uppercase transition-all duration-300 flex items-center gap-2 mx-auto"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out / Switch Account
                </button>
              </div>
            </div>
          ) : userProfile && userProfile.status === 'suspended' ? (
            // Identity Restricted
            <div className="space-y-6 py-6 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-red-400">Identity Restricted</h3>
              <p className="text-xs text-neutral-400 leading-relaxed max-w-sm mx-auto">
                Your portal access is currently suspended by the Imperial Administrator. 
                {userProfile.statusReason && (
                  <span className="block mt-2 text-red-300 italic">"Reason: {userProfile.statusReason}"</span>
                )}
              </p>
              <div className="pt-4">
                <button
                  onClick={onLogOut}
                  className="py-2.5 px-6 rounded-full liquid-pill text-neutral-300 text-xs tracking-wider uppercase transition-all duration-300 flex items-center gap-2 mx-auto"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Top Auth Mode Switcher Tabs - Liquid Pill Segmented Control */}
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full mb-6">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setFormError(''); }}
                  className={`py-2.5 px-4 text-xs font-bold uppercase tracking-widest rounded-full transition-all duration-300 flex items-center justify-center gap-2 ${
                    mode === 'login'
                      ? 'bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#c5a880] text-black shadow-lg shadow-[#d4af37]/25'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  id="tab-gate-login"
                >
                  <Key className="w-3.5 h-3.5" />
                  GATE LOGIN
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('register'); setFormError(''); }}
                  className={`py-2.5 px-4 text-xs font-bold uppercase tracking-widest rounded-full transition-all duration-300 flex items-center justify-center gap-2 ${
                    mode === 'register'
                      ? 'bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#c5a880] text-black shadow-lg shadow-[#d4af37]/25'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  id="tab-register-estate"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  REGISTER ESTATE
                </button>
              </div>

              {mode === 'login' ? (
                // LOGIN FORM
                <form onSubmit={handleLoginSubmit} className="space-y-5">
                  <div className="pb-1">
                    <h3 className="text-base font-medium text-[#d4af37]">Gate Login</h3>
                    <p className="text-[10px] text-neutral-400">Log in using your registered Email or Phone Number.</p>
                  </div>

                  {formError && (
                    <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs backdrop-blur-md">
                      {formError}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-widest text-[#c5a880] mb-1.5">
                      REGISTERED EMAIL / PHONE NUMBER
                    </label>
                    <div className="relative rounded-2xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Mail className="h-4 w-4 text-neutral-400" />
                      </div>
                      <input
                        type="text"
                        required
                        value={loginUsername}
                        onChange={(e) => setLoginUsername(e.target.value)}
                        placeholder="Enter registered email or phone number"
                        className="block w-full pl-10 pr-3 py-2.5 liquid-input text-neutral-100 placeholder-neutral-500 focus:outline-none text-sm"
                        id="login-username-input"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-widest text-[#c5a880] mb-1.5">
                      Secure Password
                    </label>
                    <div className="relative rounded-2xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Key className="h-4 w-4 text-neutral-400" />
                      </div>
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="block w-full pl-10 pr-10 py-2.5 liquid-input text-neutral-100 placeholder-neutral-500 focus:outline-none text-sm"
                        id="login-password-input"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-200 transition-colors"
                        title={showLoginPassword ? 'Hide password' : 'Show password'}
                      >
                        {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me Checkbox */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-white/20 bg-black/40 text-[#d4af37] focus:ring-[#d4af37] focus:ring-offset-neutral-900 cursor-pointer"
                        id="remember-me-checkbox"
                      />
                      <span className="text-neutral-300 hover:text-white font-medium">Remember Me</span>
                    </label>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 px-4 rounded-full bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#c5a880] text-black font-bold text-sm hover:opacity-95 focus:outline-none transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-[#d4af37]/20 active:scale-[0.98] disabled:opacity-50"
                    >
                      {isSubmitting ? 'Authenticating...' : 'Authenticate Credentials'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              ) : (
                // REGISTER FORM
                <form onSubmit={handleRegisterSubmit} className="space-y-4" id="form-register">
                  <div className="pb-1">
                    <h3 className="text-base font-medium text-[#c5a880]">Register Estate Profile</h3>
                    <p className="text-[10px] text-neutral-400">Persist details in PostgreSQL registry.</p>
                  </div>

                  {/* Role Switch - Liquid Segmented Pill */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-black/40 border border-white/10 rounded-full">
                    <button
                      type="button"
                      onClick={() => { setRole('owner'); setFormError(''); }}
                      className={`py-2 text-xs font-semibold uppercase tracking-wider rounded-full transition-all duration-300 flex items-center justify-center gap-2 ${
                        role === 'owner' ? 'bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#f3e5ab] shadow-sm' : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Landmark className="w-3.5 h-3.5" />
                      Noble Owner
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRole('admin'); setFormError(''); }}
                      className={`py-2 text-xs font-semibold uppercase tracking-wider rounded-full transition-all duration-300 flex items-center justify-center gap-2 ${
                        role === 'admin' ? 'bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#f3e5ab] shadow-sm' : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Administrator
                    </button>
                  </div>

                  {role === 'admin' && (
                    <div className="p-3 rounded-2xl bg-[#d4af37]/10 border border-[#d4af37]/20 text-[#c5a880] text-[11px] leading-relaxed backdrop-blur-md">
                      ⚠️ System security mandates a maximum of **one** Administrator. New admin registrations will fail if an Administrator already presides in PostgreSQL.
                    </div>
                  )}

                  {formError && (
                    <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs backdrop-blur-md">
                      {formError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-medium uppercase tracking-widest text-[#c5a880]">
                        Full Name
                      </label>
                      <div className="mt-1 relative rounded-2xl shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <UserIcon className="h-4 w-4 text-neutral-400" />
                        </div>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Lord Arthur"
                          className="block w-full pl-10 pr-3 py-2 liquid-input text-neutral-100 placeholder-neutral-500 focus:outline-none text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-medium uppercase tracking-widest text-[#c5a880]">
                        Email Address
                      </label>
                      <div className="mt-1 relative rounded-2xl shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Mail className="h-4 w-4 text-neutral-400" />
                        </div>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="noble@imperial.com"
                          className="block w-full pl-10 pr-3 py-2 liquid-input text-neutral-100 placeholder-neutral-500 focus:outline-none text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium uppercase tracking-widest text-[#c5a880]">
                      Secure Contact Phone
                    </label>
                    <div className="mt-1 relative rounded-2xl shadow-sm flex gap-2">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="block w-[95px] px-2 py-2 liquid-input text-neutral-200 text-xs focus:outline-none cursor-pointer"
                      >
                        {countryCodes.map(c => (
                          <option key={c.code} value={c.code} className="bg-neutral-900 text-xs">
                            {c.country} ({c.code})
                          </option>
                        ))}
                      </select>

                      <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-4 w-4 text-neutral-400" />
                        </div>
                        <input
                          type="text"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="9876543210"
                          className="block w-full pl-10 pr-3 py-2 liquid-input text-neutral-100 placeholder-neutral-500 focus:outline-none text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-medium uppercase tracking-widest text-[#c5a880]">
                        Password
                      </label>
                      <div className="mt-1 relative rounded-2xl shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Key className="h-4 w-4 text-neutral-400" />
                        </div>
                        <input
                          type={showRegisterPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="block w-full pl-10 pr-10 py-2 liquid-input text-neutral-100 placeholder-neutral-500 focus:outline-none text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-200"
                          title={showRegisterPassword ? 'Hide password' : 'Show password'}
                        >
                          {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-medium uppercase tracking-widest text-[#c5a880]">
                        Confirm Password
                      </label>
                      <div className="mt-1 relative rounded-2xl shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Key className="h-4 w-4 text-neutral-400" />
                        </div>
                        <input
                          type={showRegisterConfirmPassword ? 'text' : 'password'}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="block w-full pl-10 pr-10 py-2 liquid-input text-neutral-100 placeholder-neutral-500 focus:outline-none text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegisterConfirmPassword(!showRegisterConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-200"
                          title={showRegisterConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showRegisterConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-2.5 px-4 rounded-full bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#c5a880] text-black font-bold text-xs hover:opacity-95 focus:outline-none transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-[#d4af37]/20 active:scale-[0.98] disabled:opacity-50"
                    >
                      {isSubmitting ? 'Registering...' : 'Inscribe in Registry'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* Decorated Feature Showcase Grid & Badges */}
      <div className="mt-12 max-w-5xl mx-auto w-full px-4">
        <div className="text-center mb-6">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#d4af37] px-3 py-1 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30">
            Sovereign Estate Infrastructure
          </span>
          <h3 className="text-lg font-display font-bold text-neutral-200 mt-2">
            Comprehensive Property &amp; Tenant Ecosystem
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800/80 hover:border-[#d4af37]/40 transition-all group">
            <div className="w-9 h-9 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Building className="w-5 h-5 text-[#d4af37]" />
            </div>
            <h4 className="text-xs font-semibold text-neutral-200 mb-1">Multi-Unit Management</h4>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Configure custom unit breakdowns, BHK room types, and location hierarchies with ease.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800/80 hover:border-[#d4af37]/40 transition-all group">
            <div className="w-9 h-9 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5 text-[#d4af37]" />
            </div>
            <h4 className="text-xs font-semibold text-neutral-200 mb-1">Automated Invoicing</h4>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Generate monthly rent schedules, record payment reference numbers, and issue statements.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800/80 hover:border-[#d4af37]/40 transition-all group">
            <div className="w-9 h-9 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <DollarSign className="w-5 h-5 text-[#d4af37]" />
            </div>
            <h4 className="text-xs font-semibold text-neutral-200 mb-1">Financial Ledger</h4>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Track income, maintenance expenses, and net profit margins across currencies in real time.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800/80 hover:border-[#d4af37]/40 transition-all group">
            <div className="w-9 h-9 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5 text-[#d4af37]" />
            </div>
            <h4 className="text-xs font-semibold text-neutral-200 mb-1">Tenant Allocations</h4>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Allocate verified tenants to rooms, attach lease agreements, and handle custom rent terms.
            </p>
          </div>
        </div>

        {/* Security & System Trust Badges */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-[11px] text-neutral-500 border-t border-neutral-900 pt-6">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#d4af37]" />
            <span>PostgreSQL Data Persistence</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Key className="w-4 h-4 text-[#d4af37]" />
            <span>Encrypted Authentication</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-[#d4af37]" />
            <span>Global Multi-Currency Support</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] text-neutral-600 mt-8 font-sans z-10 relative">
        <div>
          Property Manager &copy; 2026. All rights reserved.
        </div>
      </div>
    </div>
  );
}
