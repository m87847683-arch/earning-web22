'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import {
    Save, Loader2, Settings,
    DollarSign, Clock, Users, Crown, Lock
} from 'lucide-react';

interface SiteSettings {
    dailyTaskLimit: number;
    dailyOfferLimit: number;
    cooldownHours: number;
    minWithdrawal: number;
    referralCommission: number;
    vipUnlimited: boolean;
    coinExchangeRate?: number;
    withdrawalMethods?: {
        id: string;
        name: string;
        minAmount: number;
        feePercent: number;
    }[];
}

export default function AdminSettingsPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // Password state
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    const [settings, setSettings] = useState<SiteSettings>({
        dailyTaskLimit: 6,
        dailyOfferLimit: 1,
        cooldownHours: 1,
        minWithdrawal: 5,
        referralCommission: 10,
        vipUnlimited: true,
        coinExchangeRate: 1000,
        withdrawalMethods: [
            { id: 'jazzcash', name: 'JazzCash', minAmount: 1, feePercent: 0 },
            { id: 'easypaisa', name: 'Easypaisa', minAmount: 1, feePercent: 0 },
            { id: 'usdt_trc20', name: 'USDT (TRC20)', minAmount: 5, feePercent: 2 },
            { id: 'binance_pay', name: 'Binance Pay', minAmount: 2, feePercent: 0 }
        ]
    });

    useEffect(() => {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            router.push('/admin');
            return;
        }
        loadSettings(token);
    }, [router]);

    const loadSettings = async (token: string) => {
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/settings`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (response.ok) {
                const data = await response.json();
                setSettings(data);
            }
        } catch (error) {
            console.log('Using default settings');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        const token = localStorage.getItem('adminToken');
        if (!token) return;

        setIsSaving(true);
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/settings`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(settings),
                }
            );

            if (!response.ok) throw new Error('Failed to save');
            showToast('Settings saved!', 'success');
        } catch (error) {
            showToast('Failed to save settings', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (newPassword.length < 6) {
            showToast('Password must be at least 6 characters', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }

        const token = localStorage.getItem('adminToken');
        if (!token) return;

        setIsChangingPassword(true);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ newPassword }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to change password');
            }

            showToast('Password updated successfully!', 'success');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            showToast(error.message || 'Failed to change password', 'error');
        } finally {
            setIsChangingPassword(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8">
            <div className="w-full">
                <div className="flex items-center gap-3 mb-6">
                    <h1 className="text-2xl font-bold">Settings</h1>
                </div>

                <div className="space-y-6">
                    {/* Daily Limits */}
                    <div className="card">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-[var(--primary)]/10">
                                <Users size={20} className="text-[var(--primary)]" />
                            </div>
                            <h2 className="font-semibold">Daily Limits (Free Users)</h2>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-[var(--muted)] mb-1 block">Tasks Per Day</label>
                                <input
                                    type="number"
                                    value={settings.dailyTaskLimit}
                                    onChange={(e) => setSettings({ ...settings, dailyTaskLimit: parseInt(e.target.value) })}
                                    className="input"
                                    min="1"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-[var(--muted)] mb-1 block">Offers Per Day</label>
                                <input
                                    type="number"
                                    value={settings.dailyOfferLimit}
                                    onChange={(e) => setSettings({ ...settings, dailyOfferLimit: parseInt(e.target.value) })}
                                    className="input"
                                    min="1"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Cooldown */}
                    <div className="card">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-amber-500/10">
                                <Clock size={20} className="text-amber-500" />
                            </div>
                            <h2 className="font-semibold">Cooldown Settings</h2>
                        </div>

                        <div>
                            <label className="text-sm text-[var(--muted)] mb-1 block">Cooldown After Limit (Hours)</label>
                            <input
                                type="number"
                                value={settings.cooldownHours}
                                onChange={(e) => setSettings({ ...settings, cooldownHours: parseInt(e.target.value) })}
                                className="input"
                                min="1"
                            />
                            <p className="text-xs text-[var(--muted)] mt-1">
                                Time users must wait after reaching daily limit
                            </p>
                        </div>
                    </div>

                    {/* Financial */}
                    <div className="card">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-green-500/10">
                                <DollarSign size={20} className="text-green-500" />
                            </div>
                            <h2 className="font-semibold">Financial Settings</h2>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-[var(--muted)] mb-1 block">Global Min Withdrawal ($)</label>
                                <input
                                    type="number"
                                    value={settings.minWithdrawal}
                                    onChange={(e) => setSettings({ ...settings, minWithdrawal: parseFloat(e.target.value) })}
                                    className="input"
                                    step="0.01"
                                    min="0"
                                />
                                <p className="text-xs text-[var(--muted)] mt-1">Default if method specific is not set</p>
                            </div>
                            <div>
                                <label className="text-sm text-[var(--muted)] mb-1 block">Referral Commission (%)</label>
                                <input
                                    type="number"
                                    value={settings.referralCommission}
                                    onChange={(e) => setSettings({ ...settings, referralCommission: parseFloat(e.target.value) })}
                                    className="input"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="text-sm text-[var(--muted)] mb-1 block">Coin Exchange Rate (Coins = $1.00)</label>
                                <input
                                    type="number"
                                    value={settings.coinExchangeRate || 1000}
                                    onChange={(e) => setSettings({ ...settings, coinExchangeRate: parseFloat(e.target.value) })}
                                    className="input"
                                    min="1"
                                />
                                <p className="text-xs text-[var(--muted)] mt-1">E.g. 1000 means 1000 Coins equals $1.00.</p>
                            </div>
                        </div>

                        {/* Dynamic Withdrawal Methods */}
                        <div className="mt-6 border-t border-[var(--card-border)] pt-6">
                            <h3 className="font-medium mb-4 text-sm text-[var(--muted)]">Payment Method Overrides</h3>
                            <div className="space-y-4">
                                {settings.withdrawalMethods?.map((method, index) => (
                                    <div key={method.id} className="grid grid-cols-3 gap-4 items-center bg-[var(--card-bg)] border border-[var(--card-border)] p-3 rounded-lg">
                                        <div className="font-medium text-sm">{method.name}</div>
                                        <div>
                                            <label className="text-xs text-[var(--muted)] mb-1 block">Min ($)</label>
                                            <input
                                                type="number"
                                                value={method.minAmount}
                                                onChange={(e) => {
                                                    const newMethods = [...(settings.withdrawalMethods || [])];
                                                    newMethods[index].minAmount = parseFloat(e.target.value);
                                                    setSettings({ ...settings, withdrawalMethods: newMethods });
                                                }}
                                                className="input py-1.5 text-sm"
                                                step="0.01"
                                                min="0"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-[var(--muted)] mb-1 block">Fee (%)</label>
                                            <input
                                                type="number"
                                                value={method.feePercent}
                                                onChange={(e) => {
                                                    const newMethods = [...(settings.withdrawalMethods || [])];
                                                    newMethods[index].feePercent = parseFloat(e.target.value);
                                                    setSettings({ ...settings, withdrawalMethods: newMethods });
                                                }}
                                                className="input py-1.5 text-sm"
                                                step="0.1"
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* VIP Settings */}
                    <div className="card">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg gradient-gold">
                                <Crown size={20} className="text-white" />
                            </div>
                            <h2 className="font-semibold">VIP Settings</h2>
                        </div>

                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.vipUnlimited}
                                onChange={(e) => setSettings({ ...settings, vipUnlimited: e.target.checked })}
                                className="w-5 h-5 rounded"
                            />
                            <span>VIP users have unlimited daily tasks</span>
                        </label>
                    </div>

                    {/* Security */}
                    <div className="card">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-red-500/10">
                                <Lock size={20} className="text-red-500" />
                            </div>
                            <h2 className="font-semibold">Security</h2>
                        </div>
                        
                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-[var(--muted)] mb-1 block">New Password</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="input"
                                        placeholder="Enter new admin password"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-[var(--muted)] mb-1 block">Confirm Password</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="input"
                                        placeholder="Confirm new admin password"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isChangingPassword || !newPassword || !confirmPassword}
                                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isChangingPassword ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                                    Update Password
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Save Button */}
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="btn btn-primary w-full"
                    >
                        {isSaving ? (
                            <Loader2 size={18} className="animate-spin mr-2" />
                        ) : (
                            <Save size={18} className="mr-2" />
                        )}
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
}
