import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Copy, Check, ExternalLink } from 'lucide-react';
import api from '../../services/api';

export interface ProfileWidgetProps {
  title?: string;
  showJoinedDate?: boolean;
  showUserId?: boolean;
  showEmailSpoiler?: boolean;
  customBgUrl?: string | null;
  onNavigateToProfile?: () => void;
  height?: '1/2-raw' | '2/2-raw' | '1/2' | '2/2';
}

export const ProfileWidget: React.FC<ProfileWidgetProps> = ({
  showJoinedDate = true,
  showUserId = true,
  showEmailSpoiler = true,
  customBgUrl = null,
  onNavigateToProfile,
  height = '2/2-raw',
}) => {
  const { user } = useAuth();
  const [copiedId, setCopiedId] = useState(false);
  const [isEmailRevealed, setIsEmailRevealed] = useState(false);
  const [activeSessions, setActiveSessions] = useState<number>(user?.active_sessions_count || 1);
  const isHalfRow = height === '1/2-raw' || height === '1/2';
  const [joinedDate, setJoinedDate] = useState<string | null>(user?.created_at || null);

  useEffect(() => {
    let isMounted = true;

    // Fetch live active session count
    api.get('/auth/login-history?per_page=1')
      .then((res) => {
        if (isMounted && res.data?.stats?.active_count !== undefined) {
          setActiveSessions(Math.max(1, res.data.stats.active_count));
        }
      })
      .catch(() => {
        // Fallback to auth context count or default
      });

    // If user?.created_at is missing, fetch profile to retrieve joined date
    if (!user?.created_at && !joinedDate) {
      api.get('/auth/profile')
        .then((res) => {
          if (isMounted && res.data?.profile?.created_at) {
            setJoinedDate(res.data.profile.created_at);
            if (res.data?.profile?.active_sessions_count) {
              setActiveSessions(res.data.profile.active_sessions_count);
            }
          }
        })
        .catch(() => {});
    }

    return () => {
      isMounted = false;
    };
  }, [user?.created_at, joinedDate]);

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    const idToCopy = user?.identifier || `USR-${user?.id || '001'}`;
    navigator.clipboard.writeText(idToCopy);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleViewProfile = () => {
    if (onNavigateToProfile) {
      onNavigateToProfile();
    } else {
      window.location.href = '/profile';
    }
  };

  const formattedJoinedDate = useMemo(() => {
    const rawDate = user?.created_at || joinedDate;
    if (!rawDate) return null;
    try {
      return new Date(rawDate).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return null;
    }
  }, [user?.created_at, joinedDate]);

  // If no custom or user banner uploaded, render a dark, sleek, premium obsidian-indigo gradient
  const bgStyle = customBgUrl
    ? { backgroundImage: `url(${customBgUrl})` }
    : user?.banner_url
    ? { backgroundImage: `url(${user.banner_url})` }
    : { backgroundImage: 'linear-gradient(135deg, #090d16 0%, #15102a 50%, #0d121f 100%)' };

  if (isHalfRow) {
    return (
      <div className="w-full h-full min-h-[190px] rounded-3xl bg-white dark:bg-[#0c101b] shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between relative p-4">
        {/* Subtle glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-violet-600/[0.06] blur-2xl" />
        </div>

        <div className="relative z-10 flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-full border-2 border-white dark:border-[#0c101b] overflow-hidden bg-violet-600 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-md">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover rounded-full" />
            ) : (
              <span className="select-none">{user?.name?.charAt(0).toUpperCase() || 'U'}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
              {user?.first_name || user?.name || 'Administrator'} {user?.last_name || ''}
            </h3>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 truncate">
              <span>UserID: <strong className="font-mono text-slate-700 dark:text-slate-300">{user?.identifier || `USR-${user?.id || '001'}`}</strong></span>
              <span>•</span>
              <span className="text-emerald-500 font-semibold">{activeSessions} active</span>
            </div>
            {showEmailSpoiler && (
              <div
                onMouseEnter={() => setIsEmailRevealed(true)}
                onMouseLeave={() => setIsEmailRevealed(false)}
                className={`text-[10px] cursor-pointer transition-all mt-0.5 ${
                  isEmailRevealed ? 'filter-none text-slate-800 dark:text-slate-200' : 'filter blur-[3px] text-slate-400 select-none'
                }`}
              >
                {user?.email || 'user@arx-erp.local'}
              </div>
            )}
          </div>
        </div>

        <div className="relative z-10 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <span className="text-[10px] text-slate-400">
            {showJoinedDate && formattedJoinedDate ? `Joined: ${formattedJoinedDate}` : 'Overview Profile'}
          </span>
          <button
            type="button"
            onClick={handleViewProfile}
            className="py-1 px-3 rounded-lg text-[11px] font-semibold bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-1 shadow-xs cursor-pointer transition-all"
          >
            <span>Profile</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[394px] rounded-3xl bg-white dark:bg-[#0c101b] shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between relative">
      {/* Subtle Sleek Ambient Glow (clean & refined without busy grid/lines) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-48 h-32 rounded-full bg-violet-600/[0.07] dark:bg-violet-500/[0.08] blur-2xl" />
        <div className="absolute -bottom-8 -right-8 w-36 h-36 rounded-full bg-indigo-600/[0.04] dark:bg-indigo-500/[0.05] blur-2xl" />
      </div>

      {/* Main Card Content */}
      <div className="relative z-10">
        {/* Cover Header Banner - Dark when no custom banner (increased height h-28) */}
        <div className="h-28 w-full bg-cover bg-center relative transition-all duration-300 border-b border-slate-200/40 dark:border-slate-800/40" style={bgStyle}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[0.5px]" />
        </div>

        {/* Profile Card Body with increased height spacing */}
        <div className="px-5 pb-2 -mt-11 relative space-y-3.5">
          {/* Centered Profile Avatar in Circle */}
          <div className="flex justify-center">
            <div className="w-22 h-22 rounded-full border-4 border-white dark:border-[#0c101b] overflow-hidden bg-violet-600 text-white font-black text-2xl flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-105">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover rounded-full" />
              ) : (
                <span className="select-none">{user?.name?.charAt(0).toUpperCase() || 'U'}</span>
              )}
            </div>
          </div>

          {/* Centered Larger Name (Role removed as requested) */}
          <div className="text-center pt-1">
            <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              {user?.first_name || user?.name || 'Administrator'} {user?.last_name || ''}
            </h3>
          </div>

          {/* Below it: Email spoiled & User ID on side (NO round boxes, just plain text) */}
          <div className="flex items-center justify-center flex-wrap gap-x-2.5 gap-y-1 text-xs text-slate-600 dark:text-slate-400 pt-0.5">
            {showEmailSpoiler && (
              <span className="inline-flex items-center gap-1">
                <span className="text-slate-500 font-medium">Email :</span>
                <span
                  onMouseEnter={() => setIsEmailRevealed(true)}
                  onMouseLeave={() => setIsEmailRevealed(false)}
                  onClick={() => setIsEmailRevealed((prev) => !prev)}
                  className={`cursor-pointer transition-all duration-300 font-mono ${
                    isEmailRevealed
                      ? 'filter-none text-slate-900 dark:text-white select-all'
                      : 'filter blur-[4px] text-slate-400 select-none'
                  }`}
                  title="Hover to show email address"
                >
                  {user?.email || 'user@arx-erp.local'}
                </span>
              </span>
            )}

            {showEmailSpoiler && showUserId && (
              <span className="text-slate-300 dark:text-slate-700 select-none font-normal">|</span>
            )}

            {showUserId && (
              <span className="inline-flex items-center gap-1">
                <span className="text-slate-500 font-medium">UserID :</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {user?.identifier || `USR-${user?.id || '001'}`}
                </span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="inline-flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer p-0.5 rounded transition-colors"
                  title="Copy User ID"
                >
                  {copiedId ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </span>
            )}
          </div>

          {/* Active Login Sessions count & Joined Date */}
          <div className="flex items-center justify-center flex-wrap gap-x-2.5 gap-y-1 text-xs text-slate-600 dark:text-slate-400 pt-0.5">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-500 font-medium">Active Sessions :</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                {activeSessions}
              </span>
            </span>

            {showJoinedDate && formattedJoinedDate && (
              <>
                <span className="text-slate-300 dark:text-slate-700 select-none font-normal">|</span>
                <span className="inline-flex items-center gap-1">
                  <span className="text-slate-500 font-medium">Joined :</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formattedJoinedDate}
                  </span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* View Profile Action Button */}
      <div className="p-5 pt-2 relative z-10">
        <button
          type="button"
          onClick={handleViewProfile}
          className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center gap-1.5 shadow-sm shadow-violet-500/20 hover:shadow-violet-500/30 active:scale-[0.99] transition-all cursor-pointer"
        >
          <span>View Profile</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
