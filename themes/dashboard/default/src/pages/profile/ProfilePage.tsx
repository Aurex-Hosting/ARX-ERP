import React, { useState, useEffect, useRef } from 'react';
import {
  User as UserIcon,
  Camera,
  Trash2,
  Lock,
  Mail,
  Phone,
  MapPin,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Shield,
  History,
  Key,
  Globe,
  Settings2,
  Upload,
  KeyRound,
  ShieldCheck,
  Smartphone,
  Download,
  QrCode,
  RefreshCw,
  PowerOff,
  Eye,
  EyeOff,
  Laptop,
  Tablet,
  AlertTriangle,
  Clock,
  Bell,
  BellRing,
  Sparkles,
  Inbox,
  CheckCheck,
  ExternalLink,
  Search,
  Flame,
  ShieldAlert,
  Info,
  ChevronDown,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { CountryCodeSelect } from '../../components/common/CountryCodeSelect';
import { CountrySelect } from '../../components/common/CountrySelect';
import { ImageCropperModal } from '../../components/common/ImageCropperModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LoginHistoryItem, NotificationItem } from '../../types';

type ProfileTab = 'personal' | 'notifications' | 'history' | 'security' | 'services' | 'advanced';

interface ProfileData {
  id: number;
  identifier: string;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  user_type: string;
  is_super_admin: boolean;
  avatar_url: string | null;
  banner_url: string | null;
  has_avatar: boolean;
  has_banner: boolean;
  phone_country_code_1: string;
  phone_1: string;
  phone_country_code_2: string;
  phone_2: string;
  country: string;
  province_state: string;
  city: string;
  postal_code: string;
  address_line_1: string;
  address_line_2: string;
  roles: string[];
  permissions: string[];
  created_at: string;
}

export const ProfilePage: React.FC = () => {
  const { user: authUser, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>(() => {
    const storedTab = sessionStorage.getItem('arx_target_profile_tab');
    if (storedTab) {
      sessionStorage.removeItem('arx_target_profile_tab');
      const validTabs: ProfileTab[] = ['personal', 'notifications', 'history', 'security', 'services', 'advanced'];
      if (validTabs.includes(storedTab as ProfileTab)) {
        return storedTab as ProfileTab;
      }
    }
    const hash = window.location.hash.replace('#', '');
    const validTabs: ProfileTab[] = ['personal', 'notifications', 'history', 'security', 'services', 'advanced'];
    return validTabs.includes(hash as ProfileTab) ? (hash as ProfileTab) : 'personal';
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [bannerLoading, setBannerLoading] = useState(false);
  const [copiedIdentifier, setCopiedIdentifier] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tab navigation event listener
  useEffect(() => {
    const handleTabNav = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        const targetTab = customEvent.detail as ProfileTab;
        const validTabs: ProfileTab[] = ['personal', 'notifications', 'history', 'security', 'services', 'advanced'];
        if (validTabs.includes(targetTab)) {
          setActiveTab(targetTab);
          window.location.hash = targetTab;
        }
      }
    };

    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      const validTabs: ProfileTab[] = ['personal', 'notifications', 'history', 'security', 'services', 'advanced'];
      if (validTabs.includes(hash as ProfileTab)) {
        setActiveTab(hash as ProfileTab);
      }
    };

    const pendingTab = sessionStorage.getItem('arx_target_profile_tab');
    if (pendingTab) {
      sessionStorage.removeItem('arx_target_profile_tab');
      const validTabs: ProfileTab[] = ['personal', 'notifications', 'history', 'security', 'services', 'advanced'];
      if (validTabs.includes(pendingTab as ProfileTab)) {
        setActiveTab(pendingTab as ProfileTab);
        window.location.hash = pendingTab;
      }
    }

    window.addEventListener('arx:navigate-profile-tab', handleTabNav);
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('arx:navigate-profile-tab', handleTabNav);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Direct media URLs
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);

  // Cropper Modal state
  const [cropperModal, setCropperModal] = useState<{
    isOpen: boolean;
    imageSrc: string | null;
    cropType: 'avatar' | 'banner';
    title?: string;
  }>({
    isOpen: false,
    imageSrc: null,
    cropType: 'avatar',
  });

  // Hidden file inputs
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneCode1, setPhoneCode1] = useState('+1');
  const [phone1, setPhone1] = useState('');
  const [phoneCode2, setPhoneCode2] = useState('+1');
  const [phone2, setPhone2] = useState('');
  const [country, setCountry] = useState('');
  const [provinceState, setProvinceState] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Security Tab State: Password Update
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Password Visibility States
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [downloadedCodes, setDownloadedCodes] = useState(false);

  // Login History Tab State
  const [historyItems, setHistoryItems] = useState<LoginHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'active' | 'failed' | 'revoked'>('all');
  const [historyStats, setHistoryStats] = useState<{
    total_count: number;
    active_count: number;
    failed_count: number;
    revoked_count: number;
  }>({
    total_count: 0,
    active_count: 0,
    failed_count: 0,
    revoked_count: 0,
  });
  const [revokeConfirmItem, setRevokeConfirmItem] = useState<LoginHistoryItem | null>(null);
  const [showRevokeOtherModal, setShowRevokeOtherModal] = useState(false);
  const [historyActionLoading, setHistoryActionLoading] = useState(false);
  const [copiedFingerprintId, setCopiedFingerprintId] = useState<number | null>(null);

  const fetchLoginHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get('/auth/login-history', {
        params: { status: historyStatusFilter },
      });
      setHistoryItems(res.data.data || []);
      setHistoryStats(res.data.stats || {
        total_count: 0,
        active_count: 0,
        failed_count: 0,
        revoked_count: 0,
      });
    } catch (err) {
      console.error('Failed to load login history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchLoginHistory();
    }
  }, [activeTab, historyStatusFilter]);

  const handleRevokeSingle = async () => {
    if (!revokeConfirmItem) return;
    setHistoryActionLoading(true);
    try {
      await api.post(`/auth/login-history/${revokeConfirmItem.id}/revoke`);
      setStatusMessage({ type: 'success', text: 'Session successfully revoked.' });
      setRevokeConfirmItem(null);
      await fetchLoginHistory();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Failed to revoke session.' });
    } finally {
      setHistoryActionLoading(false);
    }
  };

  const handleRevokeOther = async () => {
    setHistoryActionLoading(true);
    try {
      const res = await api.post('/auth/login-history/revoke-other');
      setStatusMessage({ type: 'success', text: res.data.message || 'All other active sessions revoked.' });
      setShowRevokeOtherModal(false);
      await fetchLoginHistory();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Failed to revoke other sessions.' });
    } finally {
      setHistoryActionLoading(false);
    }
  };

  const handleCopyFingerprint = (id: number, fingerprint: string) => {
    navigator.clipboard.writeText(fingerprint);
    setCopiedFingerprintId(id);
    setTimeout(() => setCopiedFingerprintId(null), 2000);
  };

  // Notifications Tab State
  const [profileNotifications, setProfileNotifications] = useState<NotificationItem[]>([]);
  const [notifUnreadCount, setNotifUnreadCount] = useState<number>(0);
  const [notifTotalCount, setNotifTotalCount] = useState<number>(0);
  const [notifLoading, setNotifLoading] = useState<boolean>(false);
  const [notifStatusFilter, setNotifStatusFilter] = useState<'all' | 'unread' | 'alerts' | 'announcements'>('all');
  const [notifSearch, setNotifSearch] = useState<string>('');
  const [notifActionLoadingId, setNotifActionLoadingId] = useState<number | null>(null);
  const [expandedNotifIds, setExpandedNotifIds] = useState<Record<number, boolean>>({});

  const toggleExpandNotif = (id: number) => {
    setExpandedNotifIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const fetchProfileNotifications = async () => {
    setNotifLoading(true);
    try {
      const res = await api.get('/notifications', {
        params: {
          per_page: 50,
          status: notifStatusFilter === 'unread' ? 'unread' : undefined,
          category: notifStatusFilter === 'alerts' ? 'login_alert' : notifStatusFilter === 'announcements' ? 'announcement' : undefined,
          search: notifSearch.trim() || undefined,
        },
      });
      setProfileNotifications(res.data.notifications || []);
      setNotifUnreadCount(res.data.unread_count || 0);
      setNotifTotalCount(res.data.total || 0);
    } catch {
      // Ignore background error
    } finally {
      setNotifLoading(false);
    }
  };

  const handleProfileReact = async (id: number, emojiKey: string) => {
    try {
      const res = await api.post(`/notifications/${id}/react`, { reaction: emojiKey });
      setProfileNotifications((prev) =>
        prev.map((item) => {
          if (item.id === id) {
            return {
              ...item,
              user_reaction: res.data.user_reaction,
              reactions_summary: res.data.reactions_summary,
            };
          }
          return item;
        })
      );
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update reaction.' });
    }
  };

  const handleMarkProfileNotifRead = async (id: number) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setProfileNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      );
      setNotifUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Ignore error
    }
  };

  const handleMarkAllProfileNotifsRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setProfileNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      setNotifUnreadCount(0);
      setStatusMessage({ type: 'success', text: 'All notifications marked as read.' });
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to mark all notifications as read.' });
    }
  };

  const handleDeleteProfileNotif = async (id: number) => {
    setNotifActionLoadingId(id);
    try {
      await api.delete(`/notifications/${id}`);
      setProfileNotifications((prev) => prev.filter((n) => n.id !== id));
      setNotifTotalCount((prev) => Math.max(0, prev - 1));
      setStatusMessage({ type: 'success', text: 'Notification removed.' });
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to delete notification.' });
    } finally {
      setNotifActionLoadingId(null);
    }
  };

  const handleClearAllReadProfileNotifs = async () => {
    try {
      const res = await api.delete('/notifications/clear-all');
      setProfileNotifications((prev) => prev.filter((n) => !n.is_read));
      setStatusMessage({ type: 'success', text: res.data.message || 'Read notifications cleared.' });
      await fetchProfileNotifications();
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to clear read notifications.' });
    }
  };

  // Security Tab State: Two-Factor Authentication (2FA)
  const [twoFactorStatus, setTwoFactorStatus] = useState<{
    is_enabled: boolean;
    total: number;
    used: number;
    remaining: number;
  } | null>(null);
  const [twoFactorSetupData, setTwoFactorSetupData] = useState<{
    secret: string;
    qr_uri: string;
  } | null>(null);
  const [twoFactorSetupCode, setTwoFactorSetupCode] = useState('');
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [newlyGeneratedRecoveryCodes, setNewlyGeneratedRecoveryCodes] = useState<string[] | null>(null);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // 2FA Dialogs State
  const [showDisable2FaModal, setShowDisable2FaModal] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [disableUseBackup, setDisableUseBackup] = useState(false);
  const [showRegenCodesModal, setShowRegenCodesModal] = useState(false);
  const [regenPassword, setRegenPassword] = useState('');
  const [regenCode, setRegenCode] = useState('');

  // Fetch 2FA Status
  const fetchTwoFactorStatus = async () => {
    try {
      const res = await api.get('/auth/2fa/status');
      setTwoFactorStatus(res.data.status);
    } catch (err) {
      console.error('Failed to load 2FA status:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'security') {
      fetchTwoFactorStatus();
    }
  }, [activeTab]);

  // Update Password Handler
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    setPasswordSaving(true);
    try {
      await api.put('/auth/password', {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });

      setStatusMessage({ type: 'success', text: 'Password has been updated successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  // Start 2FA Setup
  const handleStart2FaSetup = async () => {
    setTwoFactorLoading(true);
    setTwoFactorError(null);
    try {
      const res = await api.get('/auth/2fa/setup');
      setTwoFactorSetupData(res.data);
      setShowSetupWizard(true);
      setTwoFactorSetupCode('');
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Failed to initialize 2FA setup.' });
    } finally {
      setTwoFactorLoading(false);
    }
  };

  // Confirm 2FA Setup
  const handleConfirm2Fa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorSetupData) return;
    if (twoFactorSetupCode.length < 6) {
      setTwoFactorError('Please enter a valid 6-digit authentication code.');
      return;
    }

    setTwoFactorLoading(true);
    setTwoFactorError(null);
    try {
      const res = await api.post('/auth/2fa/confirm', {
        secret: twoFactorSetupData.secret,
        code: twoFactorSetupCode,
      });

      setNewlyGeneratedRecoveryCodes(res.data.recovery_codes || []);
      setDownloadedCodes(false);
      setTwoFactorStatus(res.data.status || { is_enabled: true, total: 8, used: 0, remaining: 8 });
      setShowSetupWizard(false);
      setStatusMessage({ type: 'success', text: 'Two-Factor Authentication is now enabled!' });
    } catch (err: any) {
      setTwoFactorError(err.response?.data?.message || 'Invalid verification code. Please check your authenticator app.');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  // Download recovery codes as .txt file
  const handleDownloadRecoveryCodes = (codes: string[]) => {
    const email = profile?.email || authUser?.email || 'User';
    const dateStr = new Date().toLocaleString();
    const content = `=====================================================
ARX ERP - TWO-FACTOR RECOVERY BACKUP CODES
=====================================================
Account: ${email}
Generated: ${dateStr}

CRITICAL SECURITY NOTICE:
- Each recovery code below can be used ONLY ONCE.
- Store these codes in a secure password manager or offline location.
- If you lose access to your authenticator app, enter any single code
  to bypass 2FA and log into your account.
- Once a code is used, it will be marked as used and cannot be reused.

YOUR 8 RECOVERY CODES:
-----------------------------------------------------
${codes.map((code, idx) => `[${idx + 1}]  ${code}`).join('\n')}
-----------------------------------------------------

Keep this file confidential and do not share it with anyone.
=====================================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `arx-erp-recovery-codes-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloadedCodes(true);
  };

  // Regenerate Recovery Codes
  const handleRegenerateCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFactorError(null);
    setTwoFactorLoading(true);
    try {
      const res = await api.post('/auth/2fa/regenerate-recovery-codes', {
        password: regenPassword,
        code: regenCode,
      });

      setNewlyGeneratedRecoveryCodes(res.data.recovery_codes || []);
      setDownloadedCodes(false);
      setTwoFactorStatus(res.data.status || { is_enabled: true, total: 8, used: 0, remaining: 8 });
      setShowRegenCodesModal(false);
      setRegenPassword('');
      setRegenCode('');
      setStatusMessage({ type: 'success', text: 'New backup recovery codes generated successfully.' });
    } catch (err: any) {
      setTwoFactorError(err.response?.data?.message || 'Failed to regenerate recovery codes.');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  // Disable 2FA
  const handleDisable2Fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFactorError(null);
    setTwoFactorLoading(true);
    try {
      const payload: any = { password: disablePassword };
      if (disableUseBackup) {
        payload.backup_code = disableCode;
      } else {
        payload.code = disableCode;
      }

      await api.post('/auth/2fa/disable', payload);
      setTwoFactorStatus({ is_enabled: false, total: 0, used: 0, remaining: 0 });
      setNewlyGeneratedRecoveryCodes(null);
      setShowDisable2FaModal(false);
      setDisablePassword('');
      setDisableCode('');
      setDisableUseBackup(false);
      setStatusMessage({ type: 'success', text: 'Two-Factor Authentication has been disabled.' });
    } catch (err: any) {
      setTwoFactorError(err.response?.data?.message || 'Failed to disable 2FA. Please verify your credentials.');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  // Fetch profile data
  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await api.get('/auth/profile');
      const data: ProfileData = response.data.profile;
      setProfile(data);
      populateForm(data);
      setAvatarUrl(data.avatar_url || authUser?.avatar_url || null);
      setBannerUrl(data.banner_url || authUser?.banner_url || null);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to load profile details.',
      });
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (data: ProfileData) => {
    setFirstName(data.first_name || '');
    setLastName(data.last_name || '');
    setPhoneCode1(data.phone_country_code_1 || '+1');
    setPhone1(data.phone_1 || '');
    setPhoneCode2(data.phone_country_code_2 || '+1');
    setPhone2(data.phone_2 || '');
    setCountry(data.country || '');
    setProvinceState(data.province_state || '');
    setCity(data.city || '');
    setPostalCode(data.postal_code || '');
    setAddressLine1(data.address_line_1 || '');
    setAddressLine2(data.address_line_2 || '');
    setErrors({});
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (activeTab === 'notifications') {
      fetchProfileNotifications();
    }
  }, [activeTab, notifStatusFilter]);

  const handleCopyIdentifier = () => {
    if (profile?.identifier) {
      navigator.clipboard.writeText(profile.identifier);
      setCopiedIdentifier(true);
      setTimeout(() => setCopiedIdentifier(false), 2000);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  // Trigger Avatar selection & open Cropper
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';

    if (file.size > 10 * 1024 * 1024) {
      setStatusMessage({ type: 'error', text: 'Avatar image must not exceed 10MB.' });
      return;
    }

    try {
      const base64Data = await fileToBase64(file);
      setCropperModal({
        isOpen: true,
        imageSrc: base64Data,
        cropType: 'avatar',
        title: 'Edit & Crop Profile Picture',
      });
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to read image file.' });
    }
  };

  // Trigger Banner selection & open Cropper
  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';

    if (file.size > 15 * 1024 * 1024) {
      setStatusMessage({ type: 'error', text: 'Banner image must not exceed 15MB.' });
      return;
    }

    try {
      const base64Data = await fileToBase64(file);
      setCropperModal({
        isOpen: true,
        imageSrc: base64Data,
        cropType: 'banner',
        title: 'Edit & Crop Cover Banner',
      });
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to read image file.' });
    }
  };

  // Save Cropped Image from Editor Modal
  const handleSaveCroppedImage = async (croppedBase64: string) => {
    if (cropperModal.cropType === 'avatar') {
      setAvatarLoading(true);
      setStatusMessage(null);
      try {
        const res = await api.post('/auth/profile/avatar', { avatar: croppedBase64 });
        setAvatarUrl(res.data.avatar_url);
        setStatusMessage({ type: 'success', text: 'Profile picture updated successfully.' });
        if (profile) setProfile({ ...profile, has_avatar: true, avatar_url: res.data.avatar_url });
        if (res.data?.user) {
          updateUser(res.data.user);
          window.dispatchEvent(new CustomEvent('arx:user-updated', { detail: res.data.user }));
        }
        setCropperModal((prev) => ({ ...prev, isOpen: false, imageSrc: null }));
      } catch (err: any) {
        setStatusMessage({
          type: 'error',
          text: err.response?.data?.message || 'Failed to update profile picture.',
        });
      } finally {
        setAvatarLoading(false);
      }
    } else {
      setBannerLoading(true);
      setStatusMessage(null);
      try {
        const res = await api.post('/auth/profile/banner', { banner: croppedBase64 });
        setBannerUrl(res.data.banner_url);
        setStatusMessage({ type: 'success', text: 'Profile banner updated successfully.' });
        if (profile) setProfile({ ...profile, has_banner: true, banner_url: res.data.banner_url });
        if (res.data?.user) {
          updateUser(res.data.user);
          window.dispatchEvent(new CustomEvent('arx:user-updated', { detail: res.data.user }));
        }
        setCropperModal((prev) => ({ ...prev, isOpen: false, imageSrc: null }));
      } catch (err: any) {
        setStatusMessage({
          type: 'error',
          text: err.response?.data?.message || 'Failed to update profile banner.',
        });
      } finally {
        setBannerLoading(false);
      }
    }
  };

  // Avatar Remove
  const handleRemoveAvatar = async () => {
    setAvatarLoading(true);
    setStatusMessage(null);
    try {
      const res = await api.delete('/auth/profile/avatar');
      setAvatarUrl(null);
      setStatusMessage({ type: 'success', text: 'Profile picture removed.' });
      if (profile) setProfile({ ...profile, has_avatar: false, avatar_url: null });
      if (res.data?.user) {
        updateUser(res.data.user);
        window.dispatchEvent(new CustomEvent('arx:user-updated', { detail: res.data.user }));
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to remove profile picture.',
      });
    } finally {
      setAvatarLoading(false);
    }
  };

  // Banner Remove
  const handleRemoveBanner = async () => {
    setBannerLoading(true);
    setStatusMessage(null);
    try {
      const res = await api.delete('/auth/profile/banner');
      setBannerUrl(null);
      setStatusMessage({ type: 'success', text: 'Profile banner removed.' });
      if (profile) setProfile({ ...profile, has_banner: false, banner_url: null });
      if (res.data?.user) {
        updateUser(res.data.user);
        window.dispatchEvent(new CustomEvent('arx:user-updated', { detail: res.data.user }));
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to remove profile banner.',
      });
    } finally {
      setBannerLoading(false);
    }
  };

  // Form Submit
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Client-side validation
    const newErrors: Record<string, string> = {};
    if (!firstName.trim()) {
      newErrors.first_name = 'First name is required.';
    }
    if (!phone1.trim()) {
      newErrors.phone_1 = 'Phone number 1 is required.';
    }
    if (!phone2.trim()) {
      newErrors.phone_2 = 'Phone number 2 is required.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setStatusMessage({ type: 'error', text: 'Please fill in all required fields.' });
      return;
    }

    setSaving(true);
    setStatusMessage(null);
    try {
      const payload = {
        first_name: firstName,
        last_name: lastName,
        phone_country_code_1: phoneCode1,
        phone_1: phone1,
        phone_country_code_2: phoneCode2,
        phone_2: phone2,
        country: country,
        province_state: provinceState,
        city: city,
        postal_code: postalCode,
        address_line_1: addressLine1,
        address_line_2: addressLine2,
      };

      const res = await api.put('/auth/profile', payload);
      const updatedData: ProfileData = res.data.profile;
      setProfile(updatedData);
      populateForm(updatedData);
      if (res.data?.user) {
        updateUser(res.data.user);
        window.dispatchEvent(new CustomEvent('arx:user-updated', { detail: res.data.user }));
      }
      setStatusMessage({ type: 'success', text: 'Personal profile details updated successfully.' });
    } catch (err: any) {
      if (err.response?.data?.errors) {
        const fieldErrors: Record<string, string> = {};
        Object.entries(err.response.data.errors).forEach(([key, msgs]: [string, any]) => {
          fieldErrors[key] = Array.isArray(msgs) ? msgs[0] : msgs;
        });
        setErrors(fieldErrors);
      }
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update profile.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[450px]">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const tabs: { id: ProfileTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'personal', label: 'Personal Details', icon: UserIcon },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: notifUnreadCount },
    { id: 'history', label: 'Login History', icon: History },
    { id: 'security', label: 'Security & 2FA', icon: Key },
    { id: 'services', label: 'Connected Services', icon: Globe },
    { id: 'advanced', label: 'Advanced', icon: Settings2 },
  ];

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Hidden File Inputs */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleAvatarChange}
      />
      <input
        ref={bannerInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleBannerChange}
      />

      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Account Profile
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your personal identity, notifications, activity history, and security credentials
        </p>
      </div>

      {/* Sub-Navigation Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                window.location.hash = tab.id;
                setStatusMessage(null);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-900/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white text-violet-600' : 'bg-violet-600 text-white'
                  }`}
                >
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Status Banner Alert */}
      {statusMessage && (
        <div
          className={`flex items-center justify-between p-4 rounded-2xl text-xs ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
          } animate-in fade-in slide-in-from-top-1`}
        >
          <div className="flex items-center gap-2.5">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer ml-4"
          >
            ×
          </button>
        </div>
      )}

      {activeTab === 'personal' && (
        <div className="space-y-6">
          {/* Hero Banner & Avatar Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm">
            {/* Cover Banner Area */}
            <div className="relative h-44 sm:h-56 md:h-64 w-full bg-slate-800 group overflow-hidden">
              {bannerUrl || authUser?.banner_url ? (
                <img
                  src={bannerUrl || authUser?.banner_url || ''}
                  alt="Profile Banner"
                  className="w-full h-full object-cover"
                  onError={() => {
                    if (bannerUrl && authUser?.banner_url && bannerUrl !== authUser.banner_url) {
                      setBannerUrl(authUser.banner_url);
                    } else {
                      setBannerUrl(null);
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full bg-slate-900 dark:bg-slate-950 flex items-center justify-center">
                  <div className="opacity-30 flex flex-col items-center">
                    <Camera className="w-10 h-10 text-slate-400 mb-1.5" />
                    <span className="text-xs text-slate-400 font-medium">Cover Banner</span>
                  </div>
                </div>
              )}

              {/* Banner Hover Action Overlay */}
              <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3 p-4">
                <button
                  type="button"
                  disabled={bannerLoading}
                  onClick={() => bannerInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-white text-xs font-semibold hover:bg-white dark:hover:bg-slate-900 shadow-lg cursor-pointer backdrop-blur-sm transition-all disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{bannerUrl || authUser?.banner_url ? 'Change Banner' : 'Upload Banner'}</span>
                </button>

                {(bannerUrl || authUser?.banner_url) && (
                  <button
                    type="button"
                    disabled={bannerLoading}
                    onClick={handleRemoveBanner}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600/90 text-white text-xs font-semibold hover:bg-rose-600 shadow-lg cursor-pointer backdrop-blur-sm transition-all disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Banner</span>
                  </button>
                )}
              </div>

              {bannerLoading && (
                <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full border-2 border-white border-t-transparent animate-spin" />
                </div>
              )}
            </div>

            {/* Profile Meta & Avatar Row */}
            <div className="px-6 sm:px-8 pb-6 pt-0 relative">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 sm:-mt-16 mb-4">
                {/* Avatar with Hover Controls */}
                <div className="relative group w-28 h-28 sm:w-32 sm:h-32 rounded-2xl ring-4 ring-white dark:ring-slate-900 bg-slate-900 overflow-hidden shadow-xl shrink-0">
                  {avatarUrl || authUser?.avatar_url ? (
                    <img
                      src={avatarUrl || authUser?.avatar_url || ''}
                      alt={profile?.name || authUser?.name || 'User Avatar'}
                      className="w-full h-full object-cover"
                      onError={() => {
                        if (avatarUrl && authUser?.avatar_url && avatarUrl !== authUser.avatar_url) {
                          setAvatarUrl(authUser.avatar_url);
                        } else {
                          setAvatarUrl(null);
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-800 dark:bg-slate-950 flex items-center justify-center text-slate-300 dark:text-slate-400 text-3xl font-bold">
                      {profile?.name?.charAt(0) || authUser?.name?.charAt(0) || 'U'}
                    </div>
                  )}

                  {/* Avatar Hover Overlay */}
                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1.5 p-2 text-white">
                    <button
                      type="button"
                      disabled={avatarLoading}
                      onClick={() => avatarInputRef.current?.click()}
                      title="Upload photo"
                      className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] font-medium text-center leading-tight">
                      {avatarUrl ? 'Change' : 'Upload'}
                    </span>

                    {avatarUrl && (
                      <button
                        type="button"
                        disabled={avatarLoading}
                        onClick={handleRemoveAvatar}
                        title="Remove photo"
                        className="p-1.5 rounded-lg bg-rose-500/30 hover:bg-rose-500/50 text-rose-200 transition-colors cursor-pointer mt-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {avatarLoading && (
                    <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center">
                      <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    </div>
                  )}
                </div>

                {/* Role Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  {profile?.roles && profile.roles.length > 0 ? (
                    profile.roles.map((role) => {
                      const r = role.toLowerCase();
                      const isSuperAdmin = r.includes('super-admin') || r.includes('super admin');
                      const isUser = r === 'user';
                      const isAi = r.includes('ai-agent') || r.includes('agent');

                      let colorClass = 'bg-violet-500/10 text-violet-600 dark:text-violet-400';
                      let formattedName = role.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

                      if (isSuperAdmin) {
                        colorClass = 'bg-rose-500/10 text-rose-500 font-semibold';
                        formattedName = 'Super Admin';
                      } else if (isUser) {
                        colorClass = 'bg-emerald-500/10 text-emerald-500';
                        formattedName = 'User';
                      } else if (isAi) {
                        colorClass = 'bg-amber-500/10 text-amber-500';
                        formattedName = 'AI Agent';
                      }

                      return (
                        <span
                          key={role}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs ${colorClass}`}
                        >
                          {isSuperAdmin && <Shield className="w-3 h-3" />}
                          <span>{formattedName}</span>
                        </span>
                      );
                    })
                  ) : profile?.is_super_admin ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500">
                      <Shield className="w-3 h-3" />
                      Super Admin
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Identity Details */}
              <div className="space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {profile?.name || 'Your Name'}
                  </h2>

                  {/* Unique Identifier Pill */}
                  {profile?.identifier && (
                    <button
                      type="button"
                      onClick={handleCopyIdentifier}
                      title="Click to copy unique ID"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      <span>ID: {profile.identifier}</span>
                      {copiedIdentifier ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{profile?.email}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Personal Details Form */}
          <form onSubmit={handleSaveProfile} className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-sm space-y-8">
            {/* Section 1: Basic Information */}
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Basic Information</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Your primary system identity and legal name</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* First Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter first name"
                    className={`w-full bg-slate-100 dark:bg-slate-950/60 hover:dark:bg-slate-950/80 focus:dark:bg-slate-950/90 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                      errors.first_name ? 'ring-2 ring-rose-500/50' : ''
                    }`}
                  />
                  {errors.first_name && (
                    <p className="text-[11px] text-rose-500 mt-1.5">{errors.first_name}</p>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter last name"
                    className="w-full bg-slate-100 dark:bg-slate-950/60 hover:dark:bg-slate-950/80 focus:dark:bg-slate-950/90 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                  />
                </div>

                {/* Email Address (Immutable) */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={profile?.email || ''}
                      disabled
                      className="w-full bg-slate-100/60 dark:bg-slate-950/40 rounded-xl pl-4 pr-10 py-3 text-xs text-slate-500 dark:text-slate-400 cursor-not-allowed select-none"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span>Email address cannot be changed through this form.</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2: Contact Phone Numbers */}
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Phone Numbers</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Manage your primary and emergency contact numbers</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* Phone Number 1 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Phone Number 1 <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex relative">
                    <CountryCodeSelect
                      value={phoneCode1}
                      onChange={(code) => setPhoneCode1(code)}
                    />
                    <input
                      type="tel"
                      value={phone1}
                      onChange={(e) => setPhone1(e.target.value)}
                      placeholder="e.g. 771234567"
                      className={`flex-1 min-w-0 bg-slate-100 dark:bg-slate-950/60 hover:dark:bg-slate-950/80 focus:dark:bg-slate-950/90 rounded-r-xl px-4 py-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                        errors.phone_1 ? 'ring-2 ring-rose-500/50' : ''
                      }`}
                    />
                  </div>
                  {errors.phone_1 && (
                    <p className="text-[11px] text-rose-500 mt-1.5">{errors.phone_1}</p>
                  )}
                </div>

                {/* Phone Number 2 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Phone Number 2 <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex relative">
                    <CountryCodeSelect
                      value={phoneCode2}
                      onChange={(code) => setPhoneCode2(code)}
                    />
                    <input
                      type="tel"
                      value={phone2}
                      onChange={(e) => setPhone2(e.target.value)}
                      placeholder="e.g. 719876543"
                      className={`flex-1 min-w-0 bg-slate-100 dark:bg-slate-950/60 hover:dark:bg-slate-950/80 focus:dark:bg-slate-950/90 rounded-r-xl px-4 py-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${
                        errors.phone_2 ? 'ring-2 ring-rose-500/50' : ''
                      }`}
                    />
                  </div>
                  {errors.phone_2 && (
                    <p className="text-[11px] text-rose-500 mt-1.5">{errors.phone_2}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: Location & Address */}
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Address & Location</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Physical address and regional residence details</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {/* Country */}
                <div className="lg:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Country
                  </label>
                  <CountrySelect
                    value={country}
                    onChange={(selected) => setCountry(selected)}
                    placeholder="Select country..."
                  />
                  {errors.country && (
                    <p className="text-[11px] text-rose-500 mt-1.5">{errors.country}</p>
                  )}
                </div>

                {/* Province / State */}
                <div className="lg:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Province / State
                  </label>
                  <input
                    type="text"
                    value={provinceState}
                    onChange={(e) => setProvinceState(e.target.value)}
                    placeholder="e.g. Western Province"
                    className="w-full bg-slate-100 dark:bg-slate-950/60 hover:dark:bg-slate-950/80 focus:dark:bg-slate-950/90 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                  />
                </div>

                {/* City */}
                <div className="lg:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Colombo"
                    className="w-full bg-slate-100 dark:bg-slate-950/60 hover:dark:bg-slate-950/80 focus:dark:bg-slate-950/90 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                  />
                </div>

                {/* Postal Code */}
                <div className="lg:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="e.g. 00100"
                    className="w-full bg-slate-100 dark:bg-slate-950/60 hover:dark:bg-slate-950/80 focus:dark:bg-slate-950/90 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                  />
                </div>

                {/* Address Line 1 */}
                <div className="lg:col-span-4">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Address Line 1
                  </label>
                  <input
                    type="text"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="Street address, P.O. box, company name, c/o"
                    className="w-full bg-slate-100 dark:bg-slate-950/60 hover:dark:bg-slate-950/80 focus:dark:bg-slate-950/90 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                  />
                </div>

                {/* Address Line 2 (Optional) */}
                <div className="lg:col-span-4">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Address Line 2 <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="Apartment, suite, unit, building, floor, etc."
                    className="w-full bg-slate-100 dark:bg-slate-950/60 hover:dark:bg-slate-950/80 focus:dark:bg-slate-950/90 rounded-xl px-4 py-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Action Footer */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => profile && populateForm(profile)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-500/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab: Notifications & Alerts */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          {/* Header Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Inbox */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Inbox</span>
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Inbox className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{notifTotalCount}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">All notifications</p>
            </div>

            {/* Unread Alerts */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Unread Alerts</span>
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <BellRing className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2">{notifUnreadCount}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Pending attention</p>
            </div>

            {/* Security Alerts */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Security Alerts</span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
                {profileNotifications.filter((n) => n.category === 'login_alert' || n.type === 'security').length}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Sign-ins & 2FA events</p>
            </div>

            {/* Announcements */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Broadcasts</span>
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 mt-2">
                {profileNotifications.filter((n) => n.category === 'announcement' || n.type === 'announcement').length}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">System announcements</p>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Filter Tabs & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950/60 rounded-xl overflow-x-auto">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'unread', label: `Unread (${notifUnreadCount})` },
                    { id: 'alerts', label: 'Security & Sign-ins' },
                    { id: 'announcements', label: 'Broadcasts' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setNotifStatusFilter(tab.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                        notifStatusFilter === tab.id
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search in notifications..."
                    value={notifSearch}
                    onChange={(e) => setNotifSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') fetchProfileNotifications();
                    }}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs border border-transparent focus:border-violet-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {notifUnreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllProfileNotifsRead}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-violet-600 dark:text-violet-400 bg-violet-500/10 hover:bg-violet-500/15 transition-all cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all as read</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleClearAllReadProfileNotifs}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear read</span>
                </button>
              </div>
            </div>

            {/* Notification Cards List */}
            {notifLoading ? (
              <div className="py-12 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
              </div>
            ) : profileNotifications.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-3">
                <Inbox className="w-12 h-12 opacity-30 text-slate-400" />
                <p className="font-semibold text-sm text-slate-600 dark:text-slate-300">No notifications found</p>
                <p className="text-slate-400 max-w-sm">
                  You're all caught up! When security alerts, sign-ins, or system announcements arrive, they will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {profileNotifications.map((notif) => {
                  const isAlert = notif.category === 'login_alert' || notif.type === 'security';
                  const isAnnouncement = notif.category === 'announcement' || notif.type === 'announcement';
                  const isDanger = notif.type === 'danger';
                  const isSuccess = notif.type === 'success';

                  const categoryLabel = isAlert
                    ? 'Security & Sign-in'
                    : isAnnouncement
                    ? 'Announcement'
                    : notif.category === 'manual'
                    ? 'Message'
                    : 'System Notice';

                  return (
                    <div
                      key={notif.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
                        !notif.is_read
                          ? 'bg-violet-500/5 dark:bg-violet-500/10 border-violet-500/20 shadow-xs'
                          : 'bg-slate-50/60 dark:bg-slate-950/40 border-slate-200/60 dark:border-slate-800/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div
                            className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                              isAlert
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : isAnnouncement
                                ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                                : isDanger
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                : isSuccess
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            }`}
                          >
                            {isAlert ? (
                              <ShieldAlert className="w-5 h-5" />
                            ) : isAnnouncement ? (
                              <Sparkles className="w-5 h-5" />
                            ) : isDanger ? (
                              <AlertTriangle className="w-5 h-5" />
                            ) : isSuccess ? (
                              <Flame className="w-5 h-5" />
                            ) : (
                              <Info className="w-5 h-5" />
                            )}
                          </div>

                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {categoryLabel}
                              </span>
                              {!notif.is_read && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-600 text-white animate-pulse">
                                  Unread
                                </span>
                              )}
                              <span className="text-xs text-slate-400 font-medium">
                                {new Date(notif.created_at).toLocaleString()}
                              </span>
                            </div>

                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                              {notif.title}
                            </h4>

                            {(() => {
                              const isExpanded = !!expandedNotifIds[notif.id];
                              const isLong = Boolean(notif.body && (notif.body.length > 120 || notif.body.includes('\n')));

                              return (
                                <div className="space-y-1">
                                  <p className={`text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed ${!isExpanded && isLong ? 'line-clamp-2' : ''}`}>
                                    {notif.body}
                                  </p>
                                  {isLong && (
                                    <button
                                      type="button"
                                      onClick={() => toggleExpandNotif(notif.id)}
                                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 cursor-pointer transition-colors"
                                    >
                                      <span>{isExpanded ? 'Show less' : 'Read more'}</span>
                                      <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                    </button>
                                  )}
                                </div>
                              );
                            })()}

                            {/* Action Buttons */}
                            {notif.action_buttons && notif.action_buttons.length > 0 && (
                              <div className="flex items-center gap-2 pt-2 flex-wrap">
                                {notif.action_buttons.map((btn, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (btn.external && btn.url && btn.url.startsWith('http')) {
                                        window.open(btn.url, '_blank', 'noopener,noreferrer');
                                        return;
                                      }
                                      if (
                                        btn.action_subtab === 'history' ||
                                        btn.action_tab === 'login-history' ||
                                        btn.url === '/login-history' ||
                                        notif.category === 'login_alert'
                                      ) {
                                        setActiveTab('history');
                                        return;
                                      }
                                      if (btn.action_subtab && ['personal', 'notifications', 'history', 'security', 'services', 'advanced'].includes(btn.action_subtab)) {
                                        setActiveTab(btn.action_subtab as ProfileTab);
                                        return;
                                      }
                                      if (btn.action_tab && ['personal', 'notifications', 'history', 'security', 'services', 'advanced'].includes(btn.action_tab)) {
                                        setActiveTab(btn.action_tab as ProfileTab);
                                        return;
                                      }
                                      if (btn.url && btn.url.startsWith('http')) {
                                        window.open(btn.url, '_blank', 'noopener,noreferrer');
                                      }
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                                  >
                                    <span>{btn.label}</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Interactive Emoji Reactions */}
                            {notif.enable_reactions && (
                              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 mt-3 flex items-center gap-1.5 flex-wrap">
                                <span className="text-[11px] font-medium text-slate-400 mr-1">Reactions:</span>
                                {[
                                  { key: 'fire', emoji: '🔥', label: 'Fire' },
                                  { key: 'thumbs_up', emoji: '👍', label: 'Thumbs Up' },
                                  { key: 'smile', emoji: '😊', label: 'Smile' },
                                  { key: 'laugh', emoji: '😂', label: 'Laugh' },
                                  { key: 'handshake', emoji: '🤝', label: 'Handshake' },
                                  { key: 'cry', emoji: '😢', label: 'Cry' },
                                  { key: 'angry', emoji: '😡', label: 'Angry' },
                                ].map((em) => {
                                  const isReacted = notif.user_reaction === em.key;
                                  const count = notif.reactions_summary?.[em.key]?.count || 0;
                                  return (
                                    <button
                                      key={em.key}
                                      type="button"
                                      onClick={() => handleProfileReact(notif.id, em.key)}
                                      title={`React with ${em.label}`}
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                                        isReacted
                                          ? 'bg-violet-500/20 text-violet-700 dark:text-violet-300 border border-violet-500/40 shadow-xs scale-105'
                                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-transparent'
                                      }`}
                                    >
                                      <span className="text-sm">{em.emoji}</span>
                                      {count > 0 && <span className="font-bold text-[11px]">{count}</span>}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Card Top Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {!notif.is_read && (
                            <button
                              type="button"
                              onClick={() => handleMarkProfileNotifRead(notif.id)}
                              title="Mark as read"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors cursor-pointer"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={notifActionLoadingId === notif.id}
                            onClick={() => handleDeleteProfileNotif(notif.id)}
                            title="Delete notification"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Login History */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Header Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Logins */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Activity</span>
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <History className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{historyStats.total_count}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Recorded sign-ins</p>
            </div>

            {/* Active Sessions */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Sessions</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{historyStats.active_count}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Currently authorized</p>
            </div>

            {/* Failed Logins */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Failed Attempts</span>
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2">{historyStats.failed_count}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Rejected or strike locks</p>
            </div>

            {/* Revoked Sessions */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Revoked Sessions</span>
                <div className="p-2 rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-400">
                  <PowerOff className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-700 dark:text-slate-300 mt-2">{historyStats.revoked_count}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Invalidated tokens</p>
            </div>
          </div>

          {/* Controls Bar & Sessions List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950/60 rounded-xl overflow-x-auto">
                {[
                  { id: 'all', label: 'All Activities' },
                  { id: 'active', label: `Active (${historyStats.active_count})` },
                  { id: 'failed', label: `Failed (${historyStats.failed_count})` },
                  { id: 'revoked', label: `Revoked (${historyStats.revoked_count})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setHistoryStatusFilter(tab.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                      historyStatusFilter === tab.id
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchLoginHistory}
                  title="Refresh login history"
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
                </button>

                {historyStats.active_count > 1 && (
                  <button
                    type="button"
                    onClick={() => setShowRevokeOtherModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs font-medium transition-all cursor-pointer"
                  >
                    <PowerOff className="w-3.5 h-3.5" />
                    <span>Revoke Other Sessions</span>
                  </button>
                )}
              </div>
            </div>

            {/* Login History Table */}
            {historyLoading ? (
              <div className="py-12 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
              </div>
            ) : historyItems.length === 0 ? (
              <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-xs">
                No login activities found matching the current filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3 whitespace-nowrap">Device / Client</th>
                      <th className="px-4 py-3 whitespace-nowrap">IP & Location</th>
                      <th className="px-4 py-3 whitespace-nowrap">Status</th>
                      <th className="px-4 py-3 whitespace-nowrap">Timestamp</th>
                      <th className="px-4 py-3 whitespace-nowrap text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                    {historyItems.map((item) => {
                      const isTablet = item.device_type === 'tablet' || item.platform?.toLowerCase().includes('ipad');
                      const isMobile = item.device_type === 'mobile' || item.platform?.toLowerCase().includes('android') || item.platform?.toLowerCase().includes('iphone');
                      const isDesktop = item.device_type === 'desktop' || (!isTablet && !isMobile && !item.platform?.toLowerCase().includes('android') && !item.platform?.toLowerCase().includes('ios'));
                      const DeviceIcon = isTablet ? Tablet : isMobile ? Smartphone : isDesktop ? Laptop : Globe;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                          {/* Device / Client */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                <DeviceIcon className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900 dark:text-white">
                                  {item.browser || 'Unknown Browser'} on {item.platform || 'Unknown OS'}
                                </p>
                                {item.device_fingerprint && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopyFingerprint(item.id, item.device_fingerprint!)}
                                    title="Click to copy device fingerprint"
                                    className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mt-0.5 cursor-pointer"
                                  >
                                    <span>FP: {item.device_fingerprint.slice(0, 8)}...</span>
                                    {copiedFingerprintId === item.id ? (
                                      <Check className="w-3 h-3 text-emerald-500" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* IP & Location */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <p className="font-mono font-medium text-slate-800 dark:text-slate-200">{item.ip_address}</p>
                            <p className="text-[11px] text-slate-400">
                              {item.city && item.country ? `${item.city}, ${item.country}` : item.location || 'Local Network'}
                            </p>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {item.is_active ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Active Session
                              </span>
                            ) : item.status === 'success' && item.is_revoked ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                <PowerOff className="w-3 h-3" />
                                Revoked
                              </span>
                            ) : item.status === 'success' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                <CheckCircle2 className="w-3 h-3 text-slate-400" />
                                Signed In
                              </span>
                            ) : (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                  <AlertTriangle className="w-3 h-3" />
                                  Failed
                                </span>
                                {item.failure_reason && (
                                  <p className="text-[10px] text-rose-500 mt-0.5 max-w-xs truncate" title={item.failure_reason}>
                                    {item.failure_reason}
                                  </p>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Timestamp */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-slate-500 dark:text-slate-400">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3 opacity-60" />
                              <span>{new Date(item.login_at).toLocaleString()}</span>
                            </div>
                          </td>

                          {/* Action */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-right">
                            {item.is_active ? (
                              <button
                                type="button"
                                onClick={() => setRevokeConfirmItem(item)}
                                title="Revoke this active session"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              >
                                <PowerOff className="w-4 h-4" />
                              </button>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-700 text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Revoke Single Session */}
      <ConfirmDialog
        isOpen={!!revokeConfirmItem}
        title="Revoke Active Session"
        message={`Are you sure you want to terminate the session on ${revokeConfirmItem?.browser || 'this device'} (${revokeConfirmItem?.ip_address})? That device will be immediately signed out.`}
        confirmText="Revoke Session"
        cancelText="Cancel"
        variant="danger"
        loading={historyActionLoading}
        onConfirm={handleRevokeSingle}
        onCancel={() => setRevokeConfirmItem(null)}
      />

      {/* MODAL: Revoke Other Sessions */}
      <ConfirmDialog
        isOpen={showRevokeOtherModal}
        title="Revoke All Other Sessions"
        message="Are you sure you want to log out all other active devices? Your current session on this device will remain active."
        confirmText="Revoke Other Devices"
        cancelText="Cancel"
        variant="danger"
        loading={historyActionLoading}
        onConfirm={handleRevokeOther}
        onCancel={() => setShowRevokeOtherModal(false)}
      />

      {/* Tab: Security */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Section 1: Update Password */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Change Account Password</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Ensure your account uses a long, random password to stay secure</p>
              </div>
            </div>

            {passwordError && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-xl">
              {/* Current Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Current Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="Enter your current password"
                    className="w-full bg-slate-100 dark:bg-slate-950/60 hover:dark:bg-slate-950/80 focus:dark:bg-slate-950/90 rounded-xl pl-4 pr-10 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Minimum 8 characters"
                    className="w-full bg-slate-100 dark:bg-slate-950/60 hover:dark:bg-slate-950/80 focus:dark:bg-slate-950/90 rounded-xl pl-4 pr-10 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Repeat your new password"
                    className="w-full bg-slate-100 dark:bg-slate-950/60 hover:dark:bg-slate-950/80 focus:dark:bg-slate-950/90 rounded-xl pl-4 pr-10 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-md shadow-violet-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {passwordSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Two-Factor Authentication (2FA) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${twoFactorStatus?.is_enabled ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'}`}>
                  {twoFactorStatus?.is_enabled ? <ShieldCheck className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Two-Factor Authentication (2FA)</h3>
                    {twoFactorStatus?.is_enabled ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        Disabled
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Protect your login sessions with a time-based one-time passcode (TOTP) authenticator app
                  </p>
                </div>
              </div>

              {!twoFactorStatus?.is_enabled && !showSetupWizard && (
                <button
                  type="button"
                  disabled={twoFactorLoading}
                  onClick={handleStart2FaSetup}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-md shadow-violet-500/20 transition-all cursor-pointer self-start sm:self-auto disabled:opacity-50"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Enable 2FA</span>
                </button>
              )}
            </div>

            {/* If 2FA is ENABLED */}
            {twoFactorStatus?.is_enabled && (
              <div className="space-y-6 pt-2">
                {/* Status summary banner */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-violet-500" />
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Authenticator App (RFC 6238 TOTP)
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Use Google Authenticator, 1Password, Bitwarden, or Microsoft Authenticator for 6-digit login codes.
                    </p>
                  </div>

                  {/* Backup codes count indicator */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {twoFactorStatus.used}/8 backup codes used
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {twoFactorStatus.remaining} single-use codes remaining
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center font-mono text-xs font-bold text-violet-600 dark:text-violet-400">
                      {twoFactorStatus.remaining}
                    </div>
                  </div>
                </div>

                {/* Newly Generated Recovery Codes Banner (Shown right after enable or regenerate) */}
                {newlyGeneratedRecoveryCodes && (
                  <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Download className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                            Download Your Recovery Backup Codes
                          </h4>
                        </div>
                        <p className="text-xs text-amber-800/90 dark:text-amber-300">
                          These 8 single-use codes are your only emergency access if you lose your phone or authenticator app. Store them safely.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setNewlyGeneratedRecoveryCodes(null)}
                        className="text-xs font-medium text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200 cursor-pointer underline shrink-0"
                      >
                        Hide Codes
                      </button>
                    </div>

                    {/* 8-Code Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {newlyGeneratedRecoveryCodes.map((code, index) => (
                        <div
                          key={index}
                          className="bg-white/90 dark:bg-slate-900/90 border border-amber-500/20 rounded-xl p-2.5 text-center font-mono font-bold text-xs tracking-wider text-slate-800 dark:text-slate-100 shadow-sm"
                        >
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-sans font-normal mb-0.5">
                            Code #{index + 1}
                          </span>
                          {code}
                        </div>
                      ))}
                    </div>

                    {/* Download button */}
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => handleDownloadRecoveryCodes(newlyGeneratedRecoveryCodes)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-md shadow-amber-600/20 transition-all cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Codes (.txt)</span>
                      </button>
                      {downloadedCodes && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          Downloaded successfully
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* 2FA Action Controls */}
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRegenCodesModal(true);
                      setTwoFactorError(null);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Regenerate Backup Codes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowDisable2FaModal(true);
                      setTwoFactorError(null);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs font-medium transition-all cursor-pointer"
                  >
                    <PowerOff className="w-3.5 h-3.5" />
                    <span>Disable 2FA</span>
                  </button>
                </div>
              </div>
            )}

            {/* 2FA Setup Wizard (When user clicks Enable 2FA) */}
            {!twoFactorStatus?.is_enabled && showSetupWizard && twoFactorSetupData && (
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-violet-500/20 space-y-6 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-violet-500" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Step-by-Step 2FA Setup
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSetupWizard(false)}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  {/* Step 1: QR Code & Secret */}
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        1
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white">
                          Scan QR code with your Authenticator App
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Scan using Google Authenticator, Authy, 1Password, or Microsoft Authenticator.
                        </p>
                      </div>
                    </div>

                    {/* QR Code Container */}
                    <div className="flex flex-col items-center sm:items-start pl-9">
                      <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200 inline-block">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                            twoFactorSetupData.qr_uri
                          )}`}
                          alt="Two-Factor QR Code"
                          className="w-40 h-40 object-contain"
                        />
                      </div>
                    </div>

                    {/* Manual Secret Key */}
                    <div className="pl-9 space-y-1.5">
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        Or enter this key manually:
                      </p>
                      <div className="flex items-center gap-2 max-w-sm">
                        <input
                          type="text"
                          readOnly
                          value={twoFactorSetupData.secret}
                          className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 select-all"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(twoFactorSetupData.secret);
                            setCopiedSecret(true);
                            setTimeout(() => setCopiedSecret(false), 2000);
                          }}
                          className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                          title="Copy secret key"
                        >
                          {copiedSecret ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Verification Code Input */}
                  <div className="space-y-4 md:border-l md:border-slate-200 dark:md:border-slate-800 md:pl-6">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        2
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white">
                          Verify 6-digit Code
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Enter the current 6-digit verification code generated by your app to complete setup.
                        </p>
                      </div>
                    </div>

                    {twoFactorError && (
                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                        <span>{twoFactorError}</span>
                      </div>
                    )}

                    <form onSubmit={handleConfirm2Fa} className="space-y-4 pl-9">
                      <div>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          value={twoFactorSetupCode}
                          onChange={(e) => setTwoFactorSetupCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="123456"
                          required
                          className="w-full max-w-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-center font-mono text-lg font-bold tracking-widest text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="submit"
                          disabled={twoFactorLoading || twoFactorSetupCode.length !== 6}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-md shadow-violet-500/20 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {twoFactorLoading ? (
                            <>
                              <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                              <span>Verifying...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Verify & Activate 2FA</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowSetupWizard(false)}
                          className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-200/50 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Regenerate Backup Codes */}
      {showRegenCodesModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-violet-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Regenerate Backup Recovery Codes
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRegenCodesModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Regenerating will invalidate all existing 8 backup recovery codes immediately. Please verify your password and current 2FA code to proceed.
            </p>

            {twoFactorError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{twoFactorError}</span>
              </div>
            )}

            <form onSubmit={handleRegenerateCodes} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Current Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={regenPassword}
                  onChange={(e) => setRegenPassword(e.target.value)}
                  required
                  placeholder="Enter current password"
                  className="w-full bg-slate-100 dark:bg-slate-950/60 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  6-Digit Authenticator Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={regenCode}
                  onChange={(e) => setRegenCode(e.target.value.replace(/\D/g, ''))}
                  required
                  placeholder="123456"
                  className="w-full bg-slate-100 dark:bg-slate-950/60 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegenCodesModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={twoFactorLoading || !regenPassword || regenCode.length !== 6}
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-md shadow-violet-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {twoFactorLoading ? 'Regenerating...' : 'Regenerate Codes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Disable 2FA */}
      {showDisable2FaModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PowerOff className="w-4 h-4 text-rose-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Disable Two-Factor Authentication
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDisable2FaModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Disabling 2FA will remove the extra layer of security on your account. To proceed, please enter your password and either a 6-digit TOTP code or a single-use backup recovery code.
            </p>

            {twoFactorError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{twoFactorError}</span>
              </div>
            )}

            <form onSubmit={handleDisable2Fa} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Account Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  required
                  placeholder="Enter your account password"
                  className="w-full bg-slate-100 dark:bg-slate-950/60 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {disableUseBackup ? 'Backup Recovery Code' : '6-Digit Authenticator Code'} <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setDisableUseBackup(!disableUseBackup);
                      setDisableCode('');
                    }}
                    className="text-[11px] text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                  >
                    {disableUseBackup ? 'Use Authenticator code' : 'Use backup code instead'}
                  </button>
                </div>
                <input
                  type="text"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value)}
                  required
                  placeholder={disableUseBackup ? 'e.g. 1A2B-3C4D' : 'e.g. 123456'}
                  className="w-full bg-slate-100 dark:bg-slate-950/60 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDisable2FaModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={twoFactorLoading || !disablePassword || !disableCode.trim()}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-md shadow-rose-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {twoFactorLoading ? 'Disabling...' : 'Confirm & Disable 2FA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab: Connected Services */}
      {activeTab === 'services' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm text-center py-16 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
            <Globe className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Connected Services</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Third-party OAuth connections, webhooks, and authorized API integration keys.
          </p>
        </div>
      )}

      {/* Tab: Advanced */}
      {activeTab === 'advanced' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm text-center py-16 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto">
            <Settings2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Advanced Preferences</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Locale formatting, timezone overrides, export personal data, and account governance.
          </p>
        </div>
      )}

      {/* Image Cropper / Editor Modal */}
      <ImageCropperModal
        isOpen={cropperModal.isOpen}
        imageSrc={cropperModal.imageSrc}
        cropType={cropperModal.cropType}
        title={cropperModal.title}
        isSaving={avatarLoading || bannerLoading}
        onClose={() => setCropperModal((prev) => ({ ...prev, isOpen: false, imageSrc: null }))}
        onSave={handleSaveCroppedImage}
      />
    </div>
  );
};
