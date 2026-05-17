'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/context/ThemeContext';
import BottomNav from '@/components/ui/BottomNav';
import VIPBadge from '@/components/ui/VIPBadge';
import {
    User, Mail, Wallet, Settings, LogOut,
    ChevronRight, Moon, Sun, Bell, Shield,
    HelpCircle, FileText, Crown, History
} from 'lucide-react';

export default function ProfilePage() {
    const router = useRouter();
    const { user, isLoading, isAuthenticated, logout } = useAuth();
    const { showToast } = useToast();
    const { theme, setTheme, resolvedTheme } = useTheme();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [isLoading, isAuthenticated, router]);

    const toggleDarkMode = () => {
        setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    };

    const handleLogout = () => {
        logout();
        showToast('Logged out successfully', 'info');
        router.push('/login');
    };

    if (isLoading) {
        return (
            <div className="mobile-container flex items-center justify-center min-h-screen">
                <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
            </div>
        );
    }

    const menuItems = [
        {
            section: 'Account',
            items: [
                { icon: Wallet, label: 'Withdrawal History', href: '/withdraw', badge: null },
                { icon: History, label: 'Earning History', href: '/earnings', badge: null },
                { icon: Crown, label: 'VIP Status', href: '/vip', badge: user?.vip ? 'Active' : null },
            ]
        },
        {
            section: 'Settings',
            items: [
                { icon: Bell, label: 'Notifications', href: '/notifications', badge: null },
                { icon: Shield, label: 'Security', href: '/security', badge: null },
            ]
        },
        {
            section: 'Support',
            items: [
                { icon: HelpCircle, label: 'Help Center', href: '/help', badge: null },
                { icon: FileText, label: 'Terms & Privacy', href: '/terms', badge: null },
            ]
        }
    ];

    return (
        <div className="mobile-container">
            {/* Profile Header */}
            <header className="gradient-primary p-6 pb-8">
                <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center text-white text-3xl font-bold">
                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-white">{user?.username || 'User'}</h1>
                            {user?.vip && <VIPBadge name={user.vip.name} size="sm" />}
                        </div>
                        <p className="text-white/70 text-sm mt-0.5">{user?.email}</p>
                        <div className="flex items-center gap-3 mt-2">
                            <div className="flex items-center gap-1 text-white/80 text-sm">
                                <Wallet size={14} />
                                <span>{user?.balance.toFixed(2) || '0.00'} Coins</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="p-4 space-y-4 -mt-4">
                {/* Balance Card */}
                <div className="card bg-[var(--card-bg)] shadow-lg">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <div className="text-lg font-bold text-[var(--foreground)]">
                                {user?.balance.toFixed(2) || '0.00'} Coins
                            </div>
                            <div className="text-xs text-[var(--muted)]">Available</div>
                        </div>
                        <div>
                            <div className="text-lg font-bold text-[var(--foreground)]">
                                {user?.pendingBalance?.toFixed(2) || '0.00'} Coins
                            </div>
                            <div className="text-xs text-[var(--muted)]">Pending</div>
                        </div>
                        <div>
                            <div className="text-lg font-bold text-[var(--foreground)]">
                                {user?.totalEarned?.toFixed(2) || '0.00'} Coins
                            </div>
                            <div className="text-xs text-[var(--muted)]">Total</div>
                        </div>
                    </div>

                    <button
                        onClick={() => router.push('/withdraw')}
                        className="btn btn-success w-full mt-4"
                    >
                        <Wallet size={18} className="mr-2" />
                        Withdraw Funds
                    </button>
                </div>

                {/* Dark Mode Toggle */}
                <div className="card flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {resolvedTheme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                        <span className="font-medium">Dark Mode</span>
                    </div>
                    <button
                        onClick={toggleDarkMode}
                        className={`w-12 h-6 rounded-full transition-colors ${resolvedTheme === 'dark' ? 'bg-[var(--primary)]' : 'bg-[var(--card-border)]'
                            }`}
                    >
                        <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${resolvedTheme === 'dark' ? 'translate-x-6' : 'translate-x-0.5'
                            }`} />
                    </button>
                </div>

                {/* Menu Sections */}
                {menuItems.map((section) => (
                    <div key={section.section}>
                        <h3 className="text-sm font-medium text-[var(--muted)] mb-2 px-1">
                            {section.section}
                        </h3>
                        <div className="card space-y-1 p-2">
                            {section.items.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={item.label}
                                        onClick={() => router.push(item.href)}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--card-border)]/50 transition-colors"
                                    >
                                        <Icon size={20} className="text-[var(--muted)]" />
                                        <span className="flex-1 text-left">{item.label}</span>
                                        {item.badge && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                                                {item.badge}
                                            </span>
                                        )}
                                        <ChevronRight size={18} className="text-[var(--muted)]" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}

                {/* Logout Button */}
                <button
                    onClick={handleLogout}
                    className="w-full card flex items-center justify-center gap-2 text-red-500 hover:bg-red-500/10"
                >
                    <LogOut size={20} />
                    <span className="font-medium">Log Out</span>
                </button>

                {/* Version info */}
                <p className="text-center text-xs text-[var(--muted)] pt-4">
                    PrimeLoot v1.0.0
                </p>
            </main>

            <BottomNav />
        </div>
    );
}
