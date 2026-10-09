import React, { useState, useEffect } from 'react';
import {
  Lock,
  Mail,
  ShieldCheck,
  KeyRound,
  ArrowRight,
  AlertCircle,
  Clock,
  RefreshCw,
  Key,
  Smartphone,
  ArrowLeft,
  X,
  Eye,
  EyeOff,
  Sun,
  Moon,
  ExternalLink,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import authBgDark from '../../assets/auth-bg.jpg';
import authBgLight from '../../assets/auth-bg-light.jpg';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { mode, toggleTheme, currentLogo, settings } = useTheme();

  const [step, setStep] = useState<'login' | '2fa'>('login');
  const [email, setEmail] = useState<string>(() => {
    return localStorage.getItem('arx_remembered_email') || '';
  });
  const [password, setPassword] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    return localStorage.getItem('arx_remember_me') !== 'false';
  });
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showForgotNotice, setShowForgotNotice] = useState<boolean>(false);
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [forgotSubmitting, setForgotSubmitting] = useState<boolean>(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [isForgotPasswordEnabled, setIsForgotPasswordEnabled] = useState<boolean>(false);

  useEffect(() => {
    const checkMailStatus = async () => {
      try {
        const res = await api.get('/auth/mail-status');
        setIsForgotPasswordEnabled(Boolean(res.data?.forgot_password_enabled));
      } catch {
        setIsForgotPasswordEnabled(false);
      }
    };
    checkMailStatus();
  }, []);

  // 2FA Challenge State
  const [twoFactorToken, setTwoFactorToken] = useState<string>('');
  const [twoFactorCode, setTwoFactorCode] = useState<string>('');
  const [useBackupCode, setUseBackupCode] = useState<boolean>(false);
  const [backupCode, setBackupCode] = useState<string>('');
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [twoFactorSubmitting, setTwoFactorSubmitting] = useState<boolean>(false);
  const [lockoutSeconds, setLockoutSeconds] = useState<number | null>(null);

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;

    setForgotSubmitting(true);
    setForgotMessage(null);

    try {
      const res = await api.post('/auth/forgot-password', {
        email: forgotEmail.trim(),
      });
      setForgotMessage(
        res.data.message || 'If an account matches that email, a 10-minute secure reset link has been dispatched.'
      );
    } catch (err: any) {
      setForgotMessage(
        err.response?.data?.message || 'Failed to dispatch password reset email. Please try again.'
      );
    } finally {
      setForgotSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLockoutSeconds(null);
    setIsLoading(true);

    try {
      const response = await api.post('/auth/login', {
        email: email.trim(),
        password,
      });

      if (response.data.two_factor_required) {
        setTwoFactorToken(response.data.two_factor_token);
        setStep('2fa');
        setTwoFactorCode('');
        setBackupCode('');
        setTwoFactorError(null);
        return;
      }

      if (response.data.token && response.data.user) {
        if (rememberMe) {
          localStorage.setItem('arx_remembered_email', email.trim());
          localStorage.setItem('arx_remember_me', 'true');
        } else {
          localStorage.removeItem('arx_remembered_email');
          localStorage.setItem('arx_remember_me', 'false');
        }

        login(response.data.token, response.data.user);
        window.location.href = '/';
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.email?.[0] ||
        'Authentication failed. Please check your credentials and try again.';
      setError(msg);

      if (err.response?.status === 423 && err.response?.data?.retry_after_seconds) {
        setLockoutSeconds(err.response.data.retry_after_seconds);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFactorError(null);
    setTwoFactorSubmitting(true);

    try {
      const payload: any = {
        two_factor_token: twoFactorToken,
      };

      if (useBackupCode) {
        payload.recovery_code = backupCode.trim();
      } else {
        payload.code = twoFactorCode.trim();
      }

      const response = await api.post('/auth/2fa/verify', payload);

      if (response.data.token && response.data.user) {
        if (rememberMe) {
          localStorage.setItem('arx_remembered_email', email.trim());
          localStorage.setItem('arx_remember_me', 'true');
        }

        login(response.data.token, response.data.user);
        window.location.href = '/';
      }
    } catch (err: any) {
      setTwoFactorError(err.response?.data?.message || 'Invalid authentication code. Please try again.');
    } finally {
      setTwoFactorSubmitting(false);
    }
  };

  const isDark = mode === 'dark';

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 relative bg-cover bg-center bg-no-repeat overflow-hidden transition-all duration-500"
      style={{
        backgroundImage: `url(${isDark ? (settings.auth_bg_dark || authBgDark) : (settings.auth_bg_light || authBgLight)})`,
        backgroundColor: isDark ? '#0a0d14' : '#f8fafc',
      }}
    >
      {/* Background Overlay for high contrast */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${
          isDark ? 'bg-black/40 backdrop-brightness-75' : 'bg-white/30 backdrop-brightness-95'
        }`}
      />

      {/* Global Theme Toggle (Top Right) */}
      <div className="auth-scale absolute top-5 right-5 z-20">
        <button
          type="button"
          onClick={toggleTheme}
          title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          className="flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-xl bg-white/20 dark:bg-white/10 border border-white/40 dark:border-white/20 text-slate-800 dark:text-white hover:scale-105 active:scale-95 transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer"
        >
          {isDark ? (
            <>
              <Sun className="w-4 h-4 text-amber-300 animate-spin-slow" />
              <span className="text-xs font-semibold text-white/90 hidden sm:inline">Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-slate-700" />
              <span className="text-xs font-semibold text-slate-800 hidden sm:inline">Dark Mode</span>
            </>
          )}
        </button>
      </div>

      {/* Liquid Glass Login Card */}
      <div className="auth-scale w-full max-w-md p-8 sm:p-10 rounded-2xl backdrop-blur-xl bg-white/60 dark:bg-white/10 border border-white/80 dark:border-white/20 shadow-2xl relative z-10 space-y-6 transition-all duration-300 hover:border-white dark:hover:border-white/30 text-slate-900 dark:text-white">
        {/* Header */}
        <div className="space-y-3 text-center">
          <div className="flex justify-center">
            <img
              src={currentLogo}
              alt={settings.company_name || 'Logo'}
              className="w-16 h-16 object-contain drop-shadow-lg"
            />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white drop-shadow-xs">
              {step === 'login' ? 'Sign in to your account' : 'Two-Factor Authentication'}
            </h1>
            <p className="text-xs text-slate-600 dark:text-white/70 font-normal">
              {step === 'login' ? 'Enter your credentials below' : 'Security verification required to access your account'}
            </p>
          </div>
        </div>

        {/* STEP 1: Login Form */}
        {step === 'login' && (
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 dark:bg-rose-500/20 border border-rose-400/30 text-rose-900 dark:text-rose-100 text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-300" />
                <div className="flex-1">
                  <span>{error}</span>
                  {lockoutSeconds && (
                    <div className="flex items-center gap-1 mt-1 text-[11px] text-amber-700 dark:text-amber-300 font-semibold">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Lockout active (~{Math.ceil(lockoutSeconds / 60)} min remaining)</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700 dark:text-white/90">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 dark:text-white/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  autoComplete="email"
                  className="w-full bg-white/80 dark:bg-white/10 border border-slate-200/80 dark:border-white/20 focus:border-slate-400 dark:focus:border-white/50 focus:bg-white dark:focus:bg-white/15 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-slate-300/50 dark:focus:ring-white/20 transition-all duration-200"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700 dark:text-white/90">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 dark:text-white/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full bg-white/80 dark:bg-white/10 border border-slate-200/80 dark:border-white/20 focus:border-slate-400 dark:focus:border-white/50 focus:bg-white dark:focus:bg-white/15 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-slate-300/50 dark:focus:ring-white/20 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/50 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Row: Remind Me toggle & Forgot Password */}
            <div className="flex items-center justify-between pt-1">
              {/* Remind me Toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                <button
                  type="button"
                  role="switch"
                  aria-checked={rememberMe}
                  onClick={() => setRememberMe(!rememberMe)}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-slate-400/50 dark:focus:ring-white/30 cursor-pointer ${
                    rememberMe
                      ? 'bg-violet-600 dark:bg-violet-500'
                      : 'bg-slate-300 dark:bg-white/20 group-hover:bg-slate-400 dark:group-hover:bg-white/30'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white shadow-xs transform transition-transform duration-200 ease-in-out ${
                      rememberMe ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="text-xs text-slate-700 dark:text-white/80 group-hover:text-slate-900 dark:group-hover:text-white transition-colors font-medium">
                  Remind me
                </span>
              </label>

              {/* Forgot password link */}
              {isForgotPasswordEnabled && (
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setShowForgotNotice(true);
                    setForgotMessage(null);
                  }}
                  className="text-xs text-slate-600 dark:text-white/80 hover:text-slate-900 dark:hover:text-white underline-offset-4 hover:underline transition-colors cursor-pointer font-medium"
                >
                  Forgot password?
                </button>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-slate-950 dark:bg-white hover:bg-slate-800 dark:hover:bg-white/90 active:scale-[0.99] text-white dark:text-slate-950 text-xs font-semibold shadow-lg shadow-slate-950/15 dark:shadow-black/20 hover:shadow-slate-950/25 dark:hover:shadow-white/20 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white dark:text-slate-950" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: 2FA Form */}
        {step === '2fa' && (
          <form onSubmit={handle2FaSubmit} className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {twoFactorError && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 dark:bg-rose-500/20 border border-rose-400/30 text-rose-900 dark:text-rose-100 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-300" />
                <span>{twoFactorError}</span>
              </div>
            )}

            {!useBackupCode ? (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700 dark:text-white/90 flex items-center justify-between">
                  <span>6-Digit Authentication Code</span>
                  <span className="text-[11px] text-slate-500 dark:text-white/60 flex items-center gap-1 font-normal">
                    <Smartphone className="w-3 h-3" />
                    Authenticator App
                  </span>
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 dark:text-white/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    maxLength={6}
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    required
                    autoFocus
                    autoComplete="one-time-code"
                    className="w-full bg-white/80 dark:bg-white/10 border border-slate-200/80 dark:border-white/20 focus:border-slate-400 dark:focus:border-white/50 focus:bg-white dark:focus:bg-white/15 rounded-xl pl-10 pr-4 py-2.5 text-center text-lg tracking-widest font-mono text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-slate-300/50 dark:focus:ring-white/20 transition-all"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700 dark:text-white/90 flex items-center justify-between">
                  <span>Emergency Recovery Code</span>
                  <span className="text-[11px] text-amber-600 dark:text-amber-300 flex items-center gap-1 font-normal">
                    <Key className="w-3 h-3" />
                    8-Character Code
                  </span>
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 dark:text-white/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    maxLength={10}
                    value={backupCode}
                    onChange={(e) => setBackupCode(e.target.value.toUpperCase().trim())}
                    placeholder="A1B2C3D4"
                    required
                    autoFocus
                    className="w-full bg-white/80 dark:bg-white/10 border border-slate-200/80 dark:border-white/20 focus:border-slate-400 dark:focus:border-white/50 focus:bg-white dark:focus:bg-white/15 rounded-xl pl-10 pr-4 py-2.5 text-center text-sm font-mono tracking-wider text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-slate-300/50 dark:focus:ring-white/20 transition-all"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={twoFactorSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-slate-950 dark:bg-white hover:bg-slate-800 dark:hover:bg-white/90 active:scale-[0.99] text-white dark:text-slate-950 text-xs font-semibold shadow-lg shadow-slate-950/15 dark:shadow-black/20 hover:shadow-slate-950/25 dark:hover:shadow-white/20 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
            >
              {twoFactorSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white dark:text-slate-950" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify and Sign In</span>
                </>
              )}
            </button>

            {/* Toggle between TOTP & Backup code */}
            <div className="flex items-center justify-between pt-2 text-xs border-t border-slate-200/80 dark:border-white/15">
              <button
                type="button"
                onClick={() => {
                  setUseBackupCode(!useBackupCode);
                  setTwoFactorError(null);
                }}
                className="text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                {useBackupCode ? 'Use Authenticator App' : 'Use Backup Recovery Code'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('login');
                  setTwoFactorCode('');
                  setBackupCode('');
                  setTwoFactorError(null);
                }}
                className="text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Login</span>
              </button>
            </div>
          </form>
        )}

        {/* Login Page Quick Links (Always open in new tab) */}
        {settings.quick_links_login && settings.quick_links_login.length > 0 && (
          <div className="pt-2 border-t border-slate-200/80 dark:border-white/10">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {settings.quick_links_login.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl backdrop-blur-md bg-white/40 dark:bg-white/10 hover:bg-white/70 dark:hover:bg-white/20 border border-slate-200/80 dark:border-white/20 text-xs font-medium text-slate-800 dark:text-white transition-all duration-200 shadow-xs hover:scale-105"
                  title={link.name}
                >
                  {link.icon_url ? (
                    <img src={link.icon_url} alt={link.name} className="w-3.5 h-3.5 object-contain shrink-0" />
                  ) : (
                    <ExternalLink className="w-3 h-3 text-violet-600 dark:text-violet-400 shrink-0" />
                  )}
                  <span>{link.name}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Copyright Footer */}
        <div className="pt-2 text-center border-t border-slate-200/80 dark:border-white/10">
          <p className="text-[11px] text-slate-500 dark:text-white/50 font-normal">
            {settings.copyright_text || `© ${new Date().getFullYear()} ${settings.company_name || 'ARX-ERP'}. All rights reserved.`}
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="auth-scale backdrop-blur-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-white/20 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                <span>Reset Account Password</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowForgotNotice(false);
                  setForgotMessage(null);
                }}
                className="text-slate-400 dark:text-white/50 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-white/70">
              Enter your registered email address below. We'll send a 10-minute secure password reset link.
            </p>

            {forgotMessage ? (
              <div className="space-y-4">
                <div className="p-3 bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/20 rounded-xl text-xs text-slate-800 dark:text-white">
                  {forgotMessage}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotNotice(false);
                    setForgotMessage(null);
                  }}
                  className="w-full py-2.5 bg-slate-950 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-white/90 font-semibold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-white/90 mb-1.5">
                    Registered Email
                  </label>
                  <input
                    type="email"
                    required
                    autoFocus
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-white/10 border border-slate-300 dark:border-white/20 rounded-xl text-slate-900 dark:text-white text-xs outline-none focus:border-slate-500 dark:focus:border-white/50 focus:ring-2 focus:ring-slate-300/50 dark:focus:ring-white/20 transition-all placeholder:text-slate-400 dark:placeholder:text-white/40"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotNotice(false)}
                    className="px-4 py-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotSubmitting || !forgotEmail}
                    className="px-5 py-2 bg-slate-950 dark:bg-white hover:bg-slate-800 dark:hover:bg-white/90 text-white dark:text-slate-950 font-semibold rounded-xl text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {forgotSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-white dark:text-slate-950" />
                        <span>Sending Link...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-3.5 h-3.5" />
                        <span>Send 10-Min Reset Link</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
