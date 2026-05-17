'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import BottomNav from '@/components/ui/BottomNav';
import {
    ArrowLeft, ExternalLink, DollarSign, TrendingUp,
    Clock, Gift, Loader2, ChevronRight
} from 'lucide-react';

interface Offerwall {
    id: number;
    name: string;
    displayName: string;
    description: string;
    logoUrl: string;
    payoutPercent: number;
    status: string;
    userStats: {
        completions: number;
        totalEarned: number;
    };
}

interface Transaction {
    id: number;
    network: string;
    offerName: string;
    amount: number;
    status: string;
    createdAt: string;
}

interface EarningsSummary {
    totalOffers: number;
    totalEarned: number;
    creditedCount: number;
    pendingCount: number;
}

export default function OfferwallsPage() {
    const router = useRouter();
    const { user, token } = useAuth();
    const { showToast } = useToast();
    const [offerwalls, setOfferwalls] = useState<Offerwall[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [summary, setSummary] = useState<EarningsSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'offers' | 'history'>('offers');

    useEffect(() => {
        if (!token) {
            router.push('/login');
            return;
        }
        loadData();
    }, [token, router]);

    const loadData = async () => {
        try {
            const [offerwallsRes, earningsRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/offerwalls`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/offerwalls/my-earnings`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            if (offerwallsRes.ok) {
                const data = await offerwallsRes.json();
                setOfferwalls(data);
            }

            if (earningsRes.ok) {
                const data = await earningsRes.json();
                setTransactions(data.transactions);
                setSummary(data.summary);
            }
        } catch (error) {
            console.error('Error loading data:', error);
            showToast('Failed to load offerwalls', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const openOfferwall = async (network: string) => {
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/offerwalls/${network}/url`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!response.ok) throw new Error('Failed to get offerwall URL');

            const data = await response.json();
            window.open(data.url, '_blank');
        } catch (error) {
            showToast('Failed to open offerwall', 'error');
        }
    };

    const getNetworkIcon = (name: string) => {
        const icons: Record<string, string> = {
            adgate: '🎯',
            cpx: '📊',
            timewall: '⏰',
            offertoro: '🎁',
            lootably: '💎'
        };
        return icons[name.toLowerCase()] || '🎮';
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'credited': return 'text-green-500 bg-green-500/10';
            case 'pending': return 'text-amber-500 bg-amber-500/10';
            case 'rejected': return 'text-red-500 bg-red-500/10';
            default: return 'text-gray-500 bg-gray-500/10';
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin" size={32} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pb-24">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[var(--bg-primary)] border-b border-[var(--card-border)] px-4 py-3">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="p-2 hover:bg-[var(--card-border)] rounded-lg">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-lg font-bold">Offerwalls</h1>
                </div>
            </div>

            {/* Stats Summary */}
            {summary && (
                <div className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="card text-center">
                            <DollarSign className="mx-auto mb-1 text-green-500" size={24} />
                            <p className="text-2xl font-bold">{summary.totalEarned.toFixed(2)} Coins</p>
                            <p className="text-xs text-[var(--muted)]">Total Earned</p>
                        </div>
                        <div className="card text-center">
                            <TrendingUp className="mx-auto mb-1 text-blue-500" size={24} />
                            <p className="text-2xl font-bold">{summary.totalOffers}</p>
                            <p className="text-xs text-[var(--muted)]">Completed Offers</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="px-4 mb-4">
                <div className="flex bg-[var(--card-bg)] rounded-xl p-1">
                    <button
                        onClick={() => setActiveTab('offers')}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'offers'
                                ? 'bg-[var(--accent)] text-white'
                                : 'text-[var(--muted)]'
                            }`}
                    >
                        Offerwalls
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'history'
                                ? 'bg-[var(--accent)] text-white'
                                : 'text-[var(--muted)]'
                            }`}
                    >
                        History
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="px-4 space-y-3">
                {activeTab === 'offers' ? (
                    <>
                        <p className="text-sm text-[var(--muted)]">
                            Complete offers, surveys, and app installs to earn rewards instantly.
                        </p>

                        {offerwalls.length === 0 ? (
                            <div className="card text-center py-12">
                                <Gift size={48} className="mx-auto mb-3 opacity-50" />
                                <p className="text-[var(--muted)]">No offerwalls available</p>
                            </div>
                        ) : (
                            offerwalls.map((wall) => (
                                <div
                                    key={wall.id}
                                    onClick={() => openOfferwall(wall.name)}
                                    className="card cursor-pointer hover:border-[var(--accent)] transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl">
                                            {getNetworkIcon(wall.name)}
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold">{wall.displayName}</h3>
                                                <span className="px-2 py-0.5 bg-green-500/10 text-green-500 text-xs rounded-full">
                                                    {wall.payoutPercent}% payout
                                                </span>
                                            </div>
                                            <p className="text-sm text-[var(--muted)] line-clamp-1">
                                                {wall.description}
                                            </p>

                                            {wall.userStats.completions > 0 && (
                                                <p className="text-xs text-green-500 mt-1">
                                                    ✓ {wall.userStats.completions} completed • {wall.userStats.totalEarned.toFixed(2)} Coins earned
                                                </p>
                                            )}
                                        </div>

                                        <ChevronRight className="text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors" size={20} />
                                    </div>
                                </div>
                            ))
                        )}

                        <div className="card bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-blue-500/20">
                                    <Gift size={20} className="text-blue-500" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm">Pro Tips</h4>
                                    <ul className="text-xs text-[var(--muted)] mt-1 space-y-1">
                                        <li>• Complete offers fully to get credited</li>
                                        <li>• Surveys pay more than app installs</li>
                                        <li>• Use a new browser tab for each offer</li>
                                        <li>• Credits usually arrive within 24 hours</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {transactions.length === 0 ? (
                            <div className="card text-center py-12">
                                <Clock size={48} className="mx-auto mb-3 opacity-50" />
                                <p className="text-[var(--muted)]">No earnings history yet</p>
                                <p className="text-xs text-[var(--muted)] mt-1">
                                    Complete offers to see your earnings here
                                </p>
                            </div>
                        ) : (
                            transactions.map((tx) => (
                                <div key={tx.id} className="card">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-[var(--card-border)] flex items-center justify-center">
                                                {getNetworkIcon(tx.network)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">{tx.offerName}</p>
                                                <p className="text-xs text-[var(--muted)]">{tx.network}</p>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <p className="font-semibold text-green-500">+{tx.amount.toFixed(2)} Coins</p>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(tx.status)}`}>
                                                {tx.status}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-[var(--muted)] mt-2">
                                        {new Date(tx.createdAt).toLocaleString()}
                                    </p>
                                </div>
                            ))
                        )}
                    </>
                )}
            </div>

            <BottomNav />
        </div>
    );
}
