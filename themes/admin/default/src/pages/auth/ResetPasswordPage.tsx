import React, { useEffect, useState } from 'react';
import { Lock, CheckCircle2, XCircle, Loader2, ArrowRight, Eye, EyeOff, KeyRound } from 'lucide-react';
import api from '../../services/api';

export const ResetPasswordPage: React.FC = () => {
  const [token, setToken] = useState<string>('');
  const [isValidating, setIsValidating] = useState<boolean>(true);
  const [isValid, setIsValid] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<{ name: string; email: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [password, setPassword] = useState<string>('');
  const [passwordConfirmation, setPasswordConfirmation] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(5);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token') || '';
    setToken(tokenParam);

    if (!tokenParam) {
      setIsValidating(false);
      setIsValid(false);
      setErrorMessage('No security reset token found in the URL.');
      return;
    }

    const checkToken = async () => {
      try {
        const response = await api.post('/auth/validate-token', {
          token: tokenParam,
          type: 'password_reset',
        });

        setIsValid(true);
        setUserInfo(response.data.user || null);
      } catch (err: any) {
        setIsValid(false);
        setErrorMessage(
          err.response?.data?.message || 'This password reset link is invalid, has expired (10 minutes limit), or was already used.'
        );
      } finally {
        setIsValidating(false);
      }
    };

    checkToken();
  }, []);

  // Auto redirect countdown on success
  useEffect(() => {
    if (isSuccess) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            window.location.href = '/login';
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== passwordConfirmation) {
      setErrorMessage('Passwords do not match. Please verify.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await api.post('/auth/reset-password', {
        token,
        password,
        password_confirmation: passwordConfirmation,
      });

      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Failed to reset password. The link may have expired (10-minute limit).'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Visual background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 relative z-10">
        {/* Brand Header */}
        <div className="flex justify-center items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <KeyRound className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">ARX-ERP</span>
        </div>

        {isValidating && (
          <div className="py-8 space-y-4 text-center">
            <Loader2 className="w-12 h-12 text-violet-500 animate-spin mx-auto" />
            <h2 className="text-lg font-semibold text-white">Validating Security Token</h2>
            <p className="text-sm text-slate-400">Checking link authorization & 10-minute expiration...</p>
          </div>
        )}

        {!isValidating && isSuccess && (
          <div className="py-6 space-y-5 text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Password Updated!</h2>
              <p className="text-sm text-slate-300 mt-2">
                Your account password has been successfully updated. The one-time token has now been revoked.
              </p>
            </div>

            <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/40 rounded-xl text-xs text-emerald-300">
              Redirecting to login portal in <strong className="font-bold text-white">{countdown}</strong> seconds...
            </div>

            <button
              onClick={() => (window.location.href = '/login')}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 cursor-pointer"
            >
              <span>Go to Login</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {!isValidating && !isValid && (
          <div className="py-6 space-y-5 text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-rose-500/20 border border-rose-500/40 rounded-full flex items-center justify-center mx-auto text-rose-400">
              <XCircle className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Reset Link Invalid or Expired</h2>
              <p className="text-sm text-rose-300/90 mt-2 bg-rose-950/30 border border-rose-900/40 p-3 rounded-xl text-left">
                {errorMessage}
              </p>
            </div>

            <p className="text-xs text-slate-400">
              For security, password reset links expire in 10 minutes and can only be used once. Please request a new reset email from the login page.
            </p>

            <button
              onClick={() => (window.location.href = '/login')}
              className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
            >
              <span>Return to Login</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {!isValidating && isValid && !isSuccess && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-white">Set New Password</h2>
              {userInfo && (
                <p className="text-xs text-slate-400 mt-1">
                  Resetting credentials for <span className="text-violet-300 font-medium">{userInfo.email}</span>
                </p>
              )}
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/50 rounded-xl text-xs text-rose-300">
                {errorMessage}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-800/80 border border-slate-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl text-white text-sm outline-none transition-all placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-800/80 border border-slate-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl text-white text-sm outline-none transition-all placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="text-[11px] text-slate-400 bg-slate-800/50 p-2.5 rounded-lg border border-slate-700/50">
              <span>&#9432; Upon saving, your new credentials take effect immediately and this 10-minute token will expire permanently.</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-600/25 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <span>Save Password & Return to Login</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
