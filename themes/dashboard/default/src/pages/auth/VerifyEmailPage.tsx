import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import api from '../../services/api';

export const VerifyEmailPage: React.FC = () => {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState<string>('Verifying your security token...');
  const [userName, setUserName] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(5);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setStatus('error');
      setMessage('No security token was provided in the URL.');
      return;
    }

    const performVerification = async () => {
      try {
        const response = await api.post('/auth/verify-email', { token });
        setStatus('success');
        setMessage(response.data.message || 'Your email has been verified and your account is active.');
        if (response.data.user?.name) {
          setUserName(response.data.user.name);
        }
      } catch (err: any) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'This activation link is invalid, has expired (10 minutes limit), or was already used.');
      }
    };

    performVerification();
  }, []);

  // Auto redirect countdown on success
  useEffect(() => {
    if (status === 'success') {
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
  }, [status]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background visual glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 relative z-10 text-center">
        {/* Logo / Header */}
        <div className="flex justify-center items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">ARX-ERP</span>
        </div>

        {status === 'verifying' && (
          <div className="py-8 space-y-4">
            <Loader2 className="w-12 h-12 text-violet-500 animate-spin mx-auto" />
            <h2 className="text-xl font-bold text-white">Validating Security Token</h2>
            <p className="text-sm text-slate-400">Please wait while we verify your cryptographic link...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-6 space-y-5 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Verification Successful!</h2>
              {userName && (
                <p className="text-base text-violet-300 font-medium mt-1">Welcome, {userName}</p>
              )}
              <p className="text-sm text-slate-300 mt-2">{message}</p>
            </div>

            <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/40 rounded-xl text-xs text-emerald-300">
              Redirecting to login portal in <strong className="font-bold text-white">{countdown}</strong> seconds...
            </div>

            <button
              onClick={() => (window.location.href = '/login')}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 cursor-pointer"
            >
              <span>Return to Login</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="py-6 space-y-5 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-rose-500/20 border border-rose-500/40 rounded-full flex items-center justify-center mx-auto text-rose-400">
              <XCircle className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Invalid or Expired Link</h2>
              <p className="text-sm text-rose-300/90 mt-2 bg-rose-950/30 border border-rose-900/40 p-3 rounded-xl">
                {message}
              </p>
            </div>

            <p className="text-xs text-slate-400">
              For security, activation links expire in 10 minutes and can only be used once. You can request a new activation email from your administrator.
            </p>

            <button
              onClick={() => (window.location.href = '/login')}
              className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
            >
              <span>Back to Login</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
