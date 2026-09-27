import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  Users,
  Lock,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import api from '../../services/api';
import { RoleItem, PermissionGroup } from '../../types';

const COLOR_PRESETS = [
  { name: 'Red (Super Admin)', hex: '#ef4444' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Yellow (AI-Agent)', hex: '#eab308' },
  { name: 'Lime', hex: '#84cc16' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Cyan (User)', hex: '#06b6d4' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Violet', hex: '#8b5cf6' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Slate', hex: '#64748b' },
];

const getRoleColor = (role: RoleItem): string => {
  if (role.color) return role.color;
  if (role.name === 'super-admin') return '#ef4444'; // Red
  if (role.name === 'user') return '#06b6d4'; // Cyan/Lime
  if (role.name === 'ai-agent') return '#eab308'; // Yellow
  return '#8b5cf6'; // Default Violet
};

export const RolesPage: React.FC = () => {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [totalPermissionsCount, setTotalPermissionsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);

  // Form State
  const [formRoleName, setFormRoleName] = useState('');
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formColor, setFormColor] = useState('#8b5cf6');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchRolesAndPermissions = async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        api.get('/admin/roles'),
        api.get('/admin/permissions'),
      ]);

      setRoles(rolesRes.data.roles || []);
      const groups: PermissionGroup[] = permsRes.data.groups || [];
      setPermissionGroups(groups);
      setTotalPermissionsCount(permsRes.data.total_count || 0);

      // Default expand all categories
      const initialExpanded: Record<string, boolean> = {};
      groups.forEach((g) => {
        initialExpanded[g.key] = true;
      });
      setExpandedCategories(initialExpanded);
    } catch (err) {
      console.error('Failed to load roles and permissions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRolesAndPermissions();
  }, []);

  const openCreateModal = () => {
    setFormRoleName('');
    setFormDisplayName('');
    setFormDescription('');
    setFormColor('#8b5cf6');
    setSelectedPermissions([]);
    setShowCreateModal(true);
  };

  const openEditModal = (role: RoleItem) => {
    if (role.name === 'super-admin') return;
    setEditingRole(role);
    setFormRoleName(role.name);
    setFormDisplayName(role.display_name || role.name);
    setFormDescription(role.description || '');
    setFormColor(role.color || '#8b5cf6');
    setSelectedPermissions([...role.permissions]);
  };

  const toggleCategoryExpand = (categoryKey: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryKey]: !prev[categoryKey],
    }));
  };

  const togglePermission = (permName: string) => {
    if (selectedPermissions.includes(permName)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== permName));
    } else {
      setSelectedPermissions([...selectedPermissions, permName]);
    }
  };

  const toggleCategoryAll = (group: PermissionGroup) => {
    const groupPermNames = group.permissions.map((p) => p.name);
    const allSelected = groupPermNames.every((p) => selectedPermissions.includes(p));

    if (allSelected) {
      setSelectedPermissions(selectedPermissions.filter((p) => !groupPermNames.includes(p)));
    } else {
      const merged = Array.from(new Set([...selectedPermissions, ...groupPermNames]));
      setSelectedPermissions(merged);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.post('/admin/roles', {
        name: formRoleName,
        display_name: formDisplayName,
        description: formDescription,
        color: formColor,
        permissions: selectedPermissions,
      });

      setStatusMessage({ type: 'success', text: `Role '${formDisplayName || formRoleName}' created successfully.` });
      setShowCreateModal(false);
      await fetchRolesAndPermissions();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Failed to create role.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    setSubmitting(true);

    try {
      await api.put(`/admin/roles/${editingRole.id}`, {
        name: formRoleName,
        display_name: formDisplayName,
        description: formDescription,
        color: formColor,
        permissions: selectedPermissions,
      });

      setStatusMessage({ type: 'success', text: `Role '${formDisplayName || editingRole.name}' permissions updated successfully.` });
      setEditingRole(null);
      await fetchRolesAndPermissions();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update role.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async (role: RoleItem) => {
    if (!confirm(`Are you sure you want to permanently delete custom role '${role.name}'?`)) {
      return;
    }

    try {
      await api.delete(`/admin/roles/${role.id}`);
      setStatusMessage({ type: 'success', text: `Role '${role.name}' deleted successfully.` });
      await fetchRolesAndPermissions();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete role.' });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Roles & Permissions</h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Define role capabilities and fine-grained permission matrices across core and extensible modules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Role</span>
          </button>
          <button
            onClick={fetchRolesAndPermissions}
            title="Refresh"
            className="p-2 rounded-xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-sm transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Status Feedback Message */}
      {statusMessage && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-xl text-xs font-medium animate-in fade-in duration-150 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Roles Grid - 3 Per Row, Borderless Cards, Without Icons, With Description Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {roles.map((role) => (
          <div
            key={role.id}
            className="p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-all"
          >
            <div className="space-y-3">
              {/* Header Title & System Badge */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white tracking-tight">
                    {role.display_name || role.name}
                  </h3>
                  <p className="text-[11px] font-mono text-slate-400 mt-0.5">{role.name}</p>
                </div>

                <span
                  className={`text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-full ${
                    role.is_system
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      : 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                  }`}
                >
                  {role.is_system ? 'System' : 'Custom'}
                </span>
              </div>

              {/* Description Preview */}
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3 min-h-[40px]">
                {role.description || 'Custom role with granular permissions.'}
              </p>

              {/* Stats Footer Info */}
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-2">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 opacity-60" />
                  <span>{role.users_count} Users</span>
                </div>
                <div>•</div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 opacity-60 text-violet-600 dark:text-violet-400" />
                  <span>{role.permissions.length} Permissions</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: getRoleColor(role) }}
                  title={`Role Color: ${getRoleColor(role)}`}
                />
                {role.name === 'super-admin' ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Immutable • Full Access</span>
                  </div>
                ) : (
                  <button
                    onClick={() => openEditModal(role)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                    <span>Configure Permissions</span>
                  </button>
                )}
              </div>

              {!role.is_system && (
                <button
                  onClick={() => handleDeleteRole(role)}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  title="Delete Role"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Role Modal Styled to Match User Layout */}
      {(showCreateModal || editingRole) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-3xl max-h-[90vh] bg-white dark:bg-slate-950 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 shrink-0">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                {editingRole ? `Edit Role` : 'Create Role'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingRole(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form
              id="roleForm"
              onSubmit={editingRole ? handleUpdateRole : handleCreateRole}
              className="flex-1 overflow-y-auto space-y-6 pr-1"
            >
              {/* Row 1: Role Name / Identifier & Display Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Role Name
                  </label>
                  <input
                    type="text"
                    required
                    disabled={editingRole?.is_system}
                    placeholder="e.g., moderator"
                    value={formRoleName}
                    onChange={(e) => setFormRoleName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30 disabled:opacity-50 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Moderator"
                    value={formDisplayName}
                    onChange={(e) => setFormDisplayName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all"
                  />
                </div>
              </div>

              {/* Row 2: Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Role description..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all resize-none"
                />
              </div>

              {/* Row 3: Role Color Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Role Color
                </label>
                <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-slate-100/60 dark:bg-slate-900/60">
                  {COLOR_PRESETS.map((preset) => {
                    const isSelected = formColor.toLowerCase() === preset.hex.toLowerCase();
                    return (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={() => setFormColor(preset.hex)}
                        title={preset.name}
                        className={`w-7 h-7 rounded-full transition-transform cursor-pointer relative flex items-center justify-center ${
                          isSelected ? 'scale-110 ring-2 ring-violet-500 ring-offset-2 dark:ring-offset-slate-950' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: preset.hex }}
                      >
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-white shadow-xs" />
                        )}
                      </button>
                    );
                  })}
                  <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1" />
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                    <input
                      type="color"
                      value={formColor}
                      onChange={(e) => setFormColor(e.target.value)}
                      className="w-7 h-7 rounded-lg border-0 p-0 cursor-pointer bg-transparent"
                    />
                    <span className="font-mono text-[11px] uppercase">{formColor}</span>
                  </label>
                </div>
              </div>

              {/* Row 4: Permissions Accordion List */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                    Permissions
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedPermissions.length} of {totalPermissionsCount} selected
                  </span>
                </div>

                <div className="space-y-3">
                  {permissionGroups.map((group) => {
                    const groupPermNames = group.permissions.map((p) => p.name);
                    const allSelected = groupPermNames.length > 0 && groupPermNames.every((p) => selectedPermissions.includes(p));
                    const isExpanded = expandedCategories[group.key] ?? true;

                    return (
                      <div
                        key={group.key}
                        className="rounded-2xl bg-slate-100/60 dark:bg-slate-900/60 overflow-hidden transition-colors"
                      >
                        {/* Category Header Row */}
                        <div className="p-3.5 flex items-center justify-between hover:bg-slate-200/50 dark:hover:bg-slate-800/40 transition-colors">
                          <label className="flex items-center gap-3 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={() => toggleCategoryAll(group)}
                              className="w-4 h-4 rounded bg-white dark:bg-slate-800 text-violet-600 focus:ring-violet-500/20 cursor-pointer"
                            />
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                              {group.label}
                            </span>
                          </label>

                          <button
                            type="button"
                            onClick={() => toggleCategoryExpand(group.key)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>

                        {/* Category Permissions List */}
                        {isExpanded && (
                          <div className="px-3.5 pb-3.5 pt-1 space-y-2 divide-y divide-slate-200/40 dark:divide-slate-800/40">
                            {group.permissions.map((perm) => {
                              const isChecked = selectedPermissions.includes(perm.name);
                              return (
                                <div
                                  key={perm.id}
                                  className="pt-2 flex items-center justify-between gap-4 hover:opacity-90"
                                >
                                  <label className="flex items-center gap-3 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => togglePermission(perm.name)}
                                      className="w-4 h-4 rounded bg-white dark:bg-slate-800 text-violet-600 focus:ring-violet-500/20 cursor-pointer"
                                    />
                                    <span className="text-xs text-slate-700 dark:text-slate-300">
                                      {perm.action_label || perm.name}
                                    </span>
                                  </label>

                                  <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
                                    {perm.route_slug || perm.name}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </form>

            {/* Modal Footer Actions */}
            <div className="pt-4 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingRole(null);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="roleForm"
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Saving...' : editingRole ? 'Save Changes' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
