import React, { useEffect, useState } from 'react';
import {
  Mail,
  Server,
  Zap,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Send,
  Save,
  Eye,
  EyeOff,
  Copy,
  Plus,
  Trash2,
  Globe,
  Sparkles,
  Layers,
} from 'lucide-react';
import api from '../../services/api';

interface MailConfig {
  id?: number;
  is_enabled: boolean;
  host: string;
  port: number;
  username: string;
  password?: string;
  has_password?: boolean;
  encryption: 'tls' | 'ssl' | 'none';
  verify_peer?: boolean;
  from_address: string;
  from_name: string;
  last_tested_at: string | null;
  last_test_status: 'success' | 'failed' | null;
  last_test_message: string | null;
}

interface MailHooks {
  id?: number;
  hook_user_pwd_change: boolean;
  hook_forgot_password: boolean;
  hook_verify_email_on_created: boolean;
  hook_account_status_change: boolean;
  hook_notify_broadcast: boolean;
  custom_placeholders: Array<{
    key: string;
    value: string;
    description: string;
  }>;
}

interface MailTemplate {
  id: number;
  key: string;
  name: string;
  subject: string;
  body_html: string;
  body_plain: string | null;
  action_button_label: string | null;
  placeholders_schema: Record<string, string> | null;
}

export const MailSetupPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'server' | 'hooks' | 'templates'>('server');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Mail Config State
  const [config, setConfig] = useState<MailConfig>({
    is_enabled: false,
    host: '',
    port: 587,
    username: '',
    password: '',
    has_password: false,
    encryption: 'tls',
    verify_peer: false,
    from_address: '',
    from_name: 'ARX-ERP System',
    last_tested_at: null,
    last_test_status: null,
    last_test_message: null,
  });
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Connection Check & Test Email State
  const [isTestingConn, setIsTestingConn] = useState<boolean>(false);
  const [autoEnableOnSuccess, setAutoEnableOnSuccess] = useState<boolean>(true);
  const [connTestResult, setConnTestResult] = useState<{
    success: boolean;
    message: string;
    latency_ms: number;
  } | null>(null);

  const [testEmailModal, setTestEmailModal] = useState<boolean>(false);
  const [testRecipient, setTestRecipient] = useState<string>('');
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);

  // Hooks State
  const [hooks, setHooks] = useState<MailHooks>({
    hook_user_pwd_change: true,
    hook_forgot_password: true,
    hook_verify_email_on_created: true,
    hook_account_status_change: true,
    hook_notify_broadcast: true,
    custom_placeholders: [],
  });

  // Templates State
  const [templates, setTemplates] = useState<MailTemplate[]>([]);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('password_reset');
  const [currentTemplate, setCurrentTemplate] = useState<MailTemplate | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [configRes, hooksRes, templatesRes] = await Promise.all([
        api.get('/admin/mail/config'),
        api.get('/admin/mail/hooks'),
        api.get('/admin/mail/templates'),
      ]);

      setConfig(configRes.data.config);
      setHooks(hooksRes.data.hooks);
      const tmpls = (templatesRes.data.templates || []).filter(
        (t: MailTemplate) => t.key !== 'broadcast_notice'
      );
      setTemplates(tmpls);

      if (tmpls.length > 0) {
        const initial = tmpls.find((t: MailTemplate) => t.key === selectedTemplateKey) || tmpls[0];
        setCurrentTemplate(initial);
        setSelectedTemplateKey(initial.key);
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to load mail configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle Master Enable Switch
  const handleToggleMasterEnable = async (enabled: boolean) => {
    try {
      const updatedConfig = { ...config, is_enabled: enabled };
      setConfig(updatedConfig);
      await api.put('/admin/mail/config', updatedConfig);
      showToast(
        'success',
        enabled
          ? 'Mail system successfully ENABLED. Outbound emails will now be processed.'
          : 'Mail system DISABLED. All outbound mail dispatches are suspended.'
      );
    } catch (err: any) {
      setConfig((prev) => ({ ...prev, is_enabled: !enabled }));
      showToast('error', err.response?.data?.message || 'Failed to toggle mail status.');
    }
  };

  // Save Mail Server Config
  const handleSaveConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.put('/admin/mail/config', config);
      setConfig(res.data.config);
      showToast('success', 'SMTP Server configuration saved successfully.');
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to save server configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  // Test Real-Time Connection
  const handleTestConnection = async () => {
    setIsTestingConn(true);
    setConnTestResult(null);
    try {
      const res = await api.post('/admin/mail/test-connection', {
        auto_enable: autoEnableOnSuccess,
        host: config.host,
        port: config.port,
        encryption: config.encryption,
        username: config.username,
        password: config.password,
      });

      setConnTestResult({
        success: true,
        message: res.data.message,
        latency_ms: res.data.latency_ms,
      });

      if (res.data.is_enabled !== undefined) {
        setConfig((prev) => ({
          ...prev,
          is_enabled: res.data.is_enabled,
          last_tested_at: new Date().toISOString(),
          last_test_status: 'success',
          last_test_message: res.data.message,
        }));
      }

      showToast('success', `Connection successful (${res.data.latency_ms}ms).`);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Connection check failed.';
      setConnTestResult({
        success: false,
        message: msg,
        latency_ms: err.response?.data?.latency_ms || 0,
      });
      setConfig((prev) => ({
        ...prev,
        last_tested_at: new Date().toISOString(),
        last_test_status: 'failed',
        last_test_message: msg,
      }));
      showToast('error', msg);
    } finally {
      setIsTestingConn(false);
    }
  };

  // Dispatch Diagnostic Test Email
  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipient) return;

    setIsSendingTest(true);
    try {
      const res = await api.post('/admin/mail/test-send', {
        email: testRecipient,
      });
      showToast('success', res.data.message || `Test email dispatched to ${testRecipient}.`);
      setTestEmailModal(false);
      setTestRecipient('');
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to dispatch test email.');
    } finally {
      setIsSendingTest(false);
    }
  };

  const [isSavingHooks, setIsSavingHooks] = useState<boolean>(false);
  const [isSavingPlaceholders, setIsSavingPlaceholders] = useState<boolean>(false);

  // Save Feature Trigger Hooks only
  const handleSaveHooksOnly = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingHooks(true);
    try {
      const res = await api.put('/admin/mail/hooks', hooks);
      setHooks(res.data.hooks);
      showToast('success', 'Feature trigger hooks updated successfully.');
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to update trigger hooks.');
    } finally {
      setIsSavingHooks(false);
    }
  };

  // Save Custom Placeholders Dictionary only
  const handleSavePlaceholdersOnly = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingPlaceholders(true);
    try {
      const res = await api.put('/admin/mail/hooks', hooks);
      setHooks(res.data.hooks);
      showToast('success', 'Global custom placeholders saved successfully.');
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to save custom placeholders.');
    } finally {
      setIsSavingPlaceholders(false);
    }
  };

  // Add / Remove Custom Placeholder
  const handleAddPlaceholder = () => {
    setHooks((prev) => ({
      ...prev,
      custom_placeholders: [
        ...(prev.custom_placeholders || []),
        { key: 'custom_tag', value: 'Default value', description: 'Description' },
      ],
    }));
  };

  const handleRemovePlaceholder = (index: number) => {
    setHooks((prev) => ({
      ...prev,
      custom_placeholders: prev.custom_placeholders.filter((_, i) => i !== index),
    }));
  };

  const handleUpdatePlaceholder = (index: number, field: string, val: string) => {
    const updated = [...(hooks.custom_placeholders || [])];
    updated[index] = { ...updated[index], [field]: val };
    setHooks((prev) => ({ ...prev, custom_placeholders: updated }));
  };

  // Template Management
  const handleSelectTemplate = (key: string) => {
    setSelectedTemplateKey(key);
    const tmpl = templates.find((t) => t.key === key) || null;
    setCurrentTemplate(tmpl);
    if (viewMode === 'preview' && tmpl) {
      loadTemplatePreview(tmpl.key);
    }
  };

  const loadTemplatePreview = async (key: string) => {
    setIsPreviewLoading(true);
    try {
      const res = await api.post(`/admin/mail/templates/${key}/preview`);
      setPreviewHtml(res.data.preview?.html || '<p>No preview generated</p>');
    } catch (err) {
      setPreviewHtml('<p class="text-rose-400 p-4">Failed to load HTML preview.</p>');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTemplate) return;

    setIsSaving(true);
    try {
      const res = await api.put(`/admin/mail/templates/${currentTemplate.key}`, {
        subject: currentTemplate.subject,
        body_html: currentTemplate.body_html,
        body_plain: currentTemplate.body_plain,
        action_button_label: currentTemplate.action_button_label,
      });

      // Update in templates array
      setTemplates((prev) =>
        prev.map((t) => (t.key === currentTemplate.key ? res.data.template : t))
      );
      setCurrentTemplate(res.data.template);
      showToast('success', `Template '${currentTemplate.name}' saved successfully.`);
      if (viewMode === 'preview') {
        loadTemplatePreview(currentTemplate.key);
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Failed to save email template.');
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
        <p className="text-sm text-slate-400">Loading Mail Setup & Server Settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-medium animate-in slide-in-from-bottom-5 duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-950/95 text-emerald-200'
              : 'bg-rose-950/95 text-rose-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Page Header & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Mail className="w-7 h-7 text-violet-500" />
            <span>Mail Setup & SMTP Services</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure SMTP outbound transport, 10-minute secure action token links, event hooks, and rich email templates.
          </p>
        </div>

        {/* Top Master Enable / Disable Toggle Bar */}
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2.5 px-4 rounded-2xl shadow-sm">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Mail Service Status:
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={config.is_enabled}
            onClick={() => handleToggleMasterEnable(!config.is_enabled)}
            className={`relative inline-flex h-6 w-11 p-0.5 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
              config.is_enabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                config.is_enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              config.is_enabled
                ? 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400'
                : 'bg-slate-500/15 text-slate-500 dark:text-slate-400'
            }`}
          >
            {config.is_enabled ? 'ENABLED' : 'DISABLED'}
          </span>
        </div>
      </div>

      {/* Global Inactive Alert Banner */}
      {!config.is_enabled && (
        <div className="p-4 bg-amber-500/10 rounded-2xl flex items-start gap-3.5 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <h3 className="font-semibold text-amber-600 dark:text-amber-400">
              Outbound Email Service is Currently Disabled
            </h3>
            <p className="text-slate-600 dark:text-slate-300 mt-0.5 text-xs">
              When disabled, system emails, password reset links, verification emails, and broadcast notifications will not be dispatched to users. Toggle the switch above or test your connection to enable service.
            </p>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 dark:bg-slate-900/80 rounded-2xl w-fit shadow-xs">
        <button
          onClick={() => setActiveTab('server')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
            activeTab === 'server'
              ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Mail Server Setup (SMTP)</span>
        </button>

        <button
          onClick={() => setActiveTab('hooks')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
            activeTab === 'hooks'
              ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Feature Trigger Hooks</span>
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
            activeTab === 'templates'
              ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Dynamic Email Templates</span>
        </button>
      </div>

      {/* TAB 1: MAIL SERVER SETUP */}
      {activeTab === 'server' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main SMTP Form */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-1">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-violet-500" />
                <span>SMTP Server Parameters</span>
              </h2>
              <span className="text-xs text-slate-500">Credentials stored encrypted</span>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    SMTP Host
                  </label>
                  <input
                    type="text"
                    required
                    value={config.host}
                    onChange={(e) => setConfig({ ...config, host: e.target.value })}
                    placeholder="e.g. smtp.mailtrap.io or smtp.gmail.com"
                    className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-violet-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Port
                  </label>
                  <input
                    type="number"
                    required
                    value={config.port}
                    onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) || 587 })}
                    placeholder="587"
                    className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-violet-500/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Username / Access Key
                  </label>
                  <input
                    type="text"
                    value={config.username}
                    onChange={(e) => setConfig({ ...config, username: e.target.value })}
                    placeholder="SMTP Username"
                    className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-violet-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Encryption
                  </label>
                  <select
                    value={config.encryption}
                    onChange={(e: any) => setConfig({ ...config, encryption: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-violet-500/40"
                  >
                    <option value="tls">TLS (STARTTLS)</option>
                    <option value="ssl">SSL / SMTPS</option>
                    <option value="none">None (Plaintext)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Password / Auth Token
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={config.password || ''}
                    onChange={(e) => setConfig({ ...config, password: e.target.value })}
                    placeholder={config.has_password ? '•••••••• (Stored Encrypted)' : 'Enter SMTP password'}
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-violet-500/40 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Leave blank to retain existing encrypted password.
                </p>
              </div>

              {/* SSL Verification / Self-Signed Certificate Toggle */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between gap-4 shadow-xs">
                <div className="space-y-0.5">
                  <label htmlFor="verify-peer-toggle" className="text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer block">
                    Strict SSL / TLS Certificate Verification
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    Keep disabled to allow self-signed, local development, or untrusted STARTTLS certificates.
                  </p>
                </div>
                <button
                  id="verify-peer-toggle"
                  type="button"
                  role="switch"
                  aria-checked={!!config.verify_peer}
                  onClick={() => setConfig({ ...config, verify_peer: !config.verify_peer })}
                  className={`relative inline-flex h-6 w-11 p-0.5 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                    config.verify_peer ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      config.verify_peer ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Default From Email Address
                  </label>
                  <input
                    type="email"
                    value={config.from_address}
                    onChange={(e) => setConfig({ ...config, from_address: e.target.value })}
                    placeholder="noreply@yourdomain.com"
                    className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-violet-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Default From Sender Name
                  </label>
                  <input
                    type="text"
                    value={config.from_name}
                    onChange={(e) => setConfig({ ...config, from_name: e.target.value })}
                    placeholder="ARX-ERP System"
                    className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-violet-500/40"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-sm flex items-center gap-2 shadow-md shadow-violet-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Configuration</span>
                </button>
              </div>
            </form>
          </div>

          {/* Diagnostics & Live Testing Panel */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm space-y-5">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ActivityIcon className="w-4 h-4 text-emerald-500" />
                <span>Live Socket Handshake</span>
              </h2>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Perform an immediate socket connection check to the configured host and port to measure network latency and handshake availability.
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="auto_enable"
                  checked={autoEnableOnSuccess}
                  onChange={(e) => setAutoEnableOnSuccess(e.target.checked)}
                  className="rounded text-violet-600 focus:ring-violet-500 cursor-pointer"
                />
                <label htmlFor="auto_enable" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  Automatically enable mail system upon successful connection
                </label>
              </div>

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTestingConn || !config.host}
                className="w-full py-2.5 px-4 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isTestingConn ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-violet-400" />
                    <span>Testing Connection...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Check Connection</span>
                  </>
                )}
              </button>

              {/* Handshake Result Box */}
              {connTestResult && (
                <div
                  className={`p-3.5 rounded-xl text-xs shadow-xs animate-in fade-in duration-200 ${
                    connTestResult.success
                      ? 'bg-emerald-950/40 text-emerald-300'
                      : 'bg-rose-950/40 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold mb-1">
                    {connTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                    )}
                    <span>{connTestResult.success ? 'Handshake Succeeded' : 'Handshake Failed'}</span>
                    {connTestResult.latency_ms > 0 && (
                      <span className="ml-auto text-[10px] bg-slate-800/80 px-2 py-0.5 rounded-full font-mono">
                        {connTestResult.latency_ms} ms
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] leading-relaxed break-words">{connTestResult.message}</p>
                </div>
              )}

              {/* Stored Status info */}
              {config.last_tested_at && (
                <div className="pt-3 text-[11px] text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Last Check:</span>
                    <span className="font-medium text-slate-300">
                      {new Date(config.last_tested_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span
                      className={`font-semibold uppercase ${
                        config.last_test_status === 'success' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {config.last_test_status}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Test Email Dispatch Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-indigo-500" />
                <span>Send Test Email</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dispatch an end-to-end diagnostic test email to any recipient address to verify inbound delivery.
              </p>

              <button
                type="button"
                onClick={() => setTestEmailModal(true)}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Dispatch Test Email</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FEATURE TRIGGER HOOKS & PLACEHOLDERS */}
      {activeTab === 'hooks' && (
        <div className="space-y-6">
          {/* Card 1: Feature Trigger Toggles */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Feature Trigger Toggles</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Control which platform events automatically trigger secure outbound transactional emails.
                </p>
              </div>

              {/* Single Save Button in Header */}
              <button
                type="button"
                onClick={() => handleSaveHooksOnly()}
                disabled={isSavingHooks}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-violet-600/20 cursor-pointer disabled:opacity-50 self-start sm:self-auto"
              >
                {isSavingHooks ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save Trigger Hooks</span>
              </button>
            </div>

            {/* 3 Columns in a row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Hook 1: Password Reset via Email */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex flex-col justify-between gap-4 shadow-xs">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Password Reset via Email
                    </h3>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={hooks.hook_user_pwd_change}
                      onClick={() => setHooks({ ...hooks, hook_user_pwd_change: !hooks.hook_user_pwd_change })}
                      className={`relative inline-flex h-6 w-11 p-0.5 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                        hooks.hook_user_pwd_change ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          hooks.hook_user_pwd_change ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Enables "Send Reset Link" in User Management to dispatch 10-minute secure reset tokens. When disabled, action is hidden and standard manual password change is used.
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">User Management</span>
                  <span className={`font-semibold ${hooks.hook_user_pwd_change ? 'text-violet-400' : 'text-slate-400'}`}>
                    {hooks.hook_user_pwd_change ? 'ACTIVE' : 'OFF'}
                  </span>
                </div>
              </div>

              {/* Hook 2: Forgot Password on Login */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex flex-col justify-between gap-4 shadow-xs">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Forgot Password on Login
                    </h3>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={hooks.hook_forgot_password}
                      onClick={() => setHooks({ ...hooks, hook_forgot_password: !hooks.hook_forgot_password })}
                      className={`relative inline-flex h-6 w-11 p-0.5 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                        hooks.hook_forgot_password ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          hooks.hook_forgot_password ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Displays "Forgot Password?" link on login portal for user self-service 10-minute reset links. When disabled, the link is completely hidden.
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Authentication Portal</span>
                  <span className={`font-semibold ${hooks.hook_forgot_password ? 'text-violet-400' : 'text-slate-400'}`}>
                    {hooks.hook_forgot_password ? 'ACTIVE' : 'OFF'}
                  </span>
                </div>
              </div>

              {/* Hook 3: Send Verify Email when User Created */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex flex-col justify-between gap-4 shadow-xs">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Verify Email on User Created
                    </h3>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={hooks.hook_verify_email_on_created}
                      onClick={() =>
                        setHooks({ ...hooks, hook_verify_email_on_created: !hooks.hook_verify_email_on_created })
                      }
                      className={`relative inline-flex h-6 w-11 p-0.5 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                        hooks.hook_verify_email_on_created ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          hooks.hook_verify_email_on_created ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Dispatches an account activation link (10-minute validity) upon new user registration and enables "Resend Activation" action in user list.
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Account Activation</span>
                  <span className={`font-semibold ${hooks.hook_verify_email_on_created ? 'text-violet-400' : 'text-slate-400'}`}>
                    {hooks.hook_verify_email_on_created ? 'ACTIVE' : 'OFF'}
                  </span>
                </div>
              </div>

              {/* Hook 4: Account Status Change Notifications */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex flex-col justify-between gap-4 shadow-xs">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Account Status Change Alert
                    </h3>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={hooks.hook_account_status_change}
                      onClick={() =>
                        setHooks({ ...hooks, hook_account_status_change: !hooks.hook_account_status_change })
                      }
                      className={`relative inline-flex h-6 w-11 p-0.5 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                        hooks.hook_account_status_change ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          hooks.hook_account_status_change ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Sends automated notification emails whenever an account is deactivated or restored by an administrator.
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Security Audit</span>
                  <span className={`font-semibold ${hooks.hook_account_status_change ? 'text-violet-400' : 'text-slate-400'}`}>
                    {hooks.hook_account_status_change ? 'ACTIVE' : 'OFF'}
                  </span>
                </div>
              </div>

              {/* Hook 5: Notify & Broadcast Delivery */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex flex-col justify-between gap-4 shadow-xs">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Email on Notify & Broadcast
                    </h3>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={hooks.hook_notify_broadcast}
                      onClick={() =>
                        setHooks({ ...hooks, hook_notify_broadcast: !hooks.hook_notify_broadcast })
                      }
                      className={`relative inline-flex h-6 w-11 p-0.5 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                        hooks.hook_notify_broadcast ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          hooks.hook_notify_broadcast ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Enables dual-channel broadcast dispatching so announcements can be customized and sent as in-app notifications AND outbound emails simultaneously.
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Broadcast Manager</span>
                  <span className={`font-semibold ${hooks.hook_notify_broadcast ? 'text-violet-400' : 'text-slate-400'}`}>
                    {hooks.hook_notify_broadcast ? 'ACTIVE' : 'OFF'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Custom Placeholders Dictionary Manager */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-500" />
                  <span>Global Custom Placeholders Dictionary</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Define custom placeholder tokens (e.g. <code>&#123;company_phone&#125;</code>) that can be inserted into any email template.
                </p>
              </div>

              {/* Single Save Button in Placeholders Header */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={handleAddPlaceholder}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Placeholder</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSavePlaceholdersOnly()}
                  disabled={isSavingPlaceholders}
                  className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-600/20 disabled:opacity-50 transition-colors"
                >
                  {isSavingPlaceholders ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Save Placeholders</span>
                </button>
              </div>
            </div>

            {/* Placeholders Table */}
            <div className="rounded-xl overflow-hidden shadow-xs bg-slate-50 dark:bg-slate-800/40">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold">
                  <tr>
                    <th className="p-3">Placeholder Key</th>
                    <th className="p-3">Substitution Value</th>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                  {hooks.custom_placeholders?.map((ph, idx) => (
                    <tr key={idx} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-2.5 font-mono text-violet-400">
                        <input
                          type="text"
                          value={ph.key}
                          onChange={(e) => handleUpdatePlaceholder(idx, 'key', e.target.value)}
                          className="px-2.5 py-1.5 bg-white dark:bg-slate-800 rounded-lg text-xs w-full text-violet-600 dark:text-violet-300 outline-none focus:ring-2 focus:ring-violet-500/40"
                          placeholder="support_hotline"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={ph.value}
                          onChange={(e) => handleUpdatePlaceholder(idx, 'value', e.target.value)}
                          className="px-2.5 py-1.5 bg-white dark:bg-slate-800 rounded-lg text-xs w-full text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/40"
                          placeholder="+1-800-555-0199"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={ph.description}
                          onChange={(e) =>
                            handleUpdatePlaceholder(idx, 'description', e.target.value)
                          }
                          className="px-2.5 py-1.5 bg-white dark:bg-slate-800 rounded-lg text-xs w-full text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-violet-500/40"
                          placeholder="Helpdesk phone number"
                        />
                      </td>
                      <td className="p-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemovePlaceholder(idx)}
                          className="p-1.5 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                          title="Delete Placeholder"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {(!hooks.custom_placeholders || hooks.custom_placeholders.length === 0) && (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-500 dark:text-slate-400">
                        No custom placeholders configured yet. Click "Add Placeholder" to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DYNAMIC EMAIL TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Templates Sidebar */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-2 py-1">
              Email Templates
            </h2>

            <div className="space-y-1">
              {templates.map((tmpl) => {
                const isSelected = selectedTemplateKey === tmpl.key;
                return (
                  <button
                    key={tmpl.key}
                    type="button"
                    onClick={() => handleSelectTemplate(tmpl.key)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex flex-col gap-0.5 ${
                      isSelected
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{tmpl.name}</span>
                    <span
                      className={`text-[10px] font-mono ${
                        isSelected ? 'text-violet-200' : 'text-slate-400'
                      }`}
                    >
                      {tmpl.key}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Template Editor & Preview */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm space-y-5">
            {currentTemplate ? (
              <form onSubmit={handleSaveTemplate} className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <FileCode className="w-5 h-5 text-violet-500" />
                      <span>{currentTemplate.name}</span>
                    </h2>
                    <span className="text-xs font-mono text-slate-400">
                      Template Key: {currentTemplate.key}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode('edit');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                        viewMode === 'edit'
                          ? 'bg-violet-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Edit Code
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode('preview');
                        loadTemplatePreview(currentTemplate.key);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-all ${
                        viewMode === 'preview'
                          ? 'bg-violet-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Live HTML Preview</span>
                    </button>
                  </div>
                </div>

                {/* Available Placeholders Chips (Standard + Custom) */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-3 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Template Placeholders (Click to copy token)</span>
                    </span>
                    {copiedTag && (
                      <span className="text-emerald-500 dark:text-emerald-400 font-normal text-[11px] animate-in fade-in">
                        Copied {copiedTag}
                      </span>
                    )}
                  </div>

                  {/* Template specific standard tokens */}
                  <div className="flex flex-wrap gap-1.5">
                    {currentTemplate.placeholders_schema &&
                      Object.entries(currentTemplate.placeholders_schema).map(([tag, desc]) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => copyToClipboard(tag)}
                          title={desc}
                          className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-violet-600 hover:text-white text-slate-800 dark:text-slate-300 rounded-lg text-[11px] font-mono transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <span>{tag}</span>
                          <Copy className="w-2.5 h-2.5 opacity-60" />
                        </button>
                      ))}
                  </div>

                  {/* Global Custom Placeholders list */}
                  {hooks.custom_placeholders && hooks.custom_placeholders.length > 0 && (
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/50 space-y-1.5">
                      <span className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        <span>Global Custom Tokens:</span>
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {hooks.custom_placeholders.map((ph) => {
                          const tag = `{${ph.key}}`;
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => copyToClipboard(tag)}
                              title={`${ph.description} (Value: ${ph.value})`}
                              className="px-2.5 py-1 bg-cyan-950/40 hover:bg-cyan-600 hover:text-white text-cyan-300 rounded-lg text-[11px] font-mono transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                            >
                              <span>{tag}</span>
                              <Copy className="w-2.5 h-2.5 opacity-60" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {viewMode === 'edit' ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                          Email Subject Line
                        </label>
                        <input
                          type="text"
                          required
                          value={currentTemplate.subject}
                          onChange={(e) =>
                            setCurrentTemplate({ ...currentTemplate, subject: e.target.value })
                          }
                          className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-violet-500/40"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                          Action Button Label (Optional)
                        </label>
                        <input
                          type="text"
                          value={currentTemplate.action_button_label || ''}
                          onChange={(e) =>
                            setCurrentTemplate({
                              ...currentTemplate,
                              action_button_label: e.target.value,
                            })
                          }
                          placeholder="e.g. Reset Password"
                          className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-violet-500/40"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        HTML Body Content
                      </label>
                      <textarea
                        rows={14}
                        required
                        value={currentTemplate.body_html}
                        onChange={(e) =>
                          setCurrentTemplate({ ...currentTemplate, body_html: e.target.value })
                        }
                        className="w-full p-3.5 bg-slate-950 rounded-xl text-slate-200 text-xs font-mono leading-relaxed outline-none focus:ring-2 focus:ring-violet-500/40 shadow-inner"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Plaintext Fallback Body
                      </label>
                      <textarea
                        rows={4}
                        value={currentTemplate.body_plain || ''}
                        onChange={(e) =>
                          setCurrentTemplate({ ...currentTemplate, body_plain: e.target.value })
                        }
                        placeholder="Fallback text for mail clients that don't support HTML"
                        className="w-full p-3 bg-slate-950 rounded-xl text-slate-200 text-xs font-mono leading-relaxed outline-none focus:ring-2 focus:ring-violet-500/40 shadow-inner"
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    {/* Simulated Mail Client Header */}
                    <div className="p-4 bg-slate-950 rounded-2xl space-y-2.5 shadow-sm">
                      <div className="flex items-center justify-between pb-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="font-semibold text-slate-200">Email Client Rendering Simulation</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => loadTemplatePreview(currentTemplate.key)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Refresh Preview"
                        >
                          <RefreshCw className={`w-3 h-3 ${isPreviewLoading ? 'animate-spin' : ''}`} />
                          <span>Refresh Preview</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-1 text-xs text-slate-400 font-mono">
                        <div>
                          <strong className="text-slate-300">From:</strong>{' '}
                          <span className="text-violet-300">
                            {config.from_name || 'ARX-ERP'} &lt;{config.from_address || 'system@arx-erp.local'}&gt;
                          </span>
                        </div>
                        <div>
                          <strong className="text-slate-300">To:</strong>{' '}
                          <span className="text-slate-200">recipient@example.com</span>
                        </div>
                        <div>
                          <strong className="text-slate-300">Subject:</strong>{' '}
                          <span className="text-white font-sans font-semibold">{currentTemplate.subject}</span>
                        </div>
                      </div>
                    </div>

                    {/* Rendered HTML Box */}
                    {isPreviewLoading ? (
                      <div className="h-96 flex flex-col items-center justify-center gap-3 bg-slate-950 rounded-2xl">
                        <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
                        <span className="text-xs text-slate-400">Rendering email template with sample variables...</span>
                      </div>
                    ) : (
                      <div className="p-6 bg-slate-950 rounded-2xl overflow-auto max-h-[600px] shadow-inner">
                        <div
                          className="max-w-xl mx-auto rounded-xl p-2"
                          dangerouslySetInnerHTML={{ __html: previewHtml }}
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end pt-3">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-sm flex items-center gap-2 shadow-md shadow-violet-600/20 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Save Template Changes</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="py-12 text-center text-slate-500">
                Select a template from the left sidebar to edit.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Test Email Dispatch Modal */}
      {testEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-indigo-400" />
                <span>Dispatch SMTP Diagnostic Test</span>
              </h3>
              <button
                type="button"
                onClick={() => setTestEmailModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              An automated email with current server diagnostic information will be sent to the address specified below.
            </p>

            <form onSubmit={handleSendTestEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Recipient Email Address
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTestEmailModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingTest || !testRecipient}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-indigo-600/25 cursor-pointer disabled:opacity-50"
                >
                  {isSendingTest ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending Test...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Test Now</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Activity icon helper
function ActivityIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
