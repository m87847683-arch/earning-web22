'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import BottomNav from '@/components/ui/BottomNav';
import { api } from '@/lib/api';
import {
    Copy, Share2, Users, DollarSign,
    TrendingUp, ChevronRight, ArrowLeft, Gift
} from 'lucide-react';

interface ReferralStats {
    totalReferrals: number;
    activeReferrals: number;
    totalEarned: number;
    pendingEarnings: number;
    totalCommission?: number;
    monthlyCommission?: number;
}

interface Referral {
    id: number;
    username: string;
    email: string;
    joinedAt: string;
    isActive: boolean;
    commissionEarned: number;
}

export default function ReferralsPage() {
    const router = useRouter();
    const { token, isLoading, isAuthenticated, user } = useAuth();
    const { showToast } = useToast();

    const [referralLink, setReferralLink] = useState('');
    const [referralCode, setReferralCode] = useState('');
    const [stats, setStats] = useState<ReferralStats | null>(null);
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login?redirect=/referrals');
            return;
        }

        if (token) {
            loadData();
        }
    }, [isLoading, isAuthenticated, token, router]);

    const loadData = async () => {
        try {
            const [linkData, statsData, listData] = await Promise.all([
                api.getReferralLink(token!),
                api.getReferralStats(token!),
                api.getReferralList(token!)
            ]);

            setReferralLink(linkData.referralLink);
            setReferralCode(linkData.referralCode);
            setStats(statsData);
            setReferrals(listData.referrals);
        } catch (error) {
            console.error('Failed to load referral data:', error);
        } finally {
            setIsLoadingData(false);
        }
    };

    const copyLink = () => {
        navigator.clipboard.writeText(referralLink);
        showToast('Referral link copied!', 'success');
    };

    const shareLink = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Join PrimeLoot',
                    text: 'Earn money by completing simple tasks! Use my referral link:',
                    url: referralLink
                });
            } catch (error) {
                copyLink();
            }
        } else {
            copyLink();
        }
    };

    if (isLoading || isLoadingData) {
        return (
            <div className="mobile-container flex items-center justify-center min-h-screen">
                <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="mobile-container">
            {/* Header */}
            <header className="relative overflow-hidden">
                <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-6 pb-16">
                    <button
                        onClick={() => router.back()}
                        className="absolute top-4 left-4 p-2 bg-white/20 rounded-xl"
                    >
                        <ArrowLeft size={20} className="text-white" />
                    </button>

                    <div className="text-center pt-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4">
                            <Gift size={32} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white">Invite Friends</h1>
                        <p className="text-white/80 mt-1">Earn 10% lifetime commission</p>
                    </div>
                </div>

                <div className="h-8 bg-[var(--background)] rounded-t-3xl -mt-6 relative z-10" />
            </header>

            <main className="px-4 pb-4 -mt-2 space-y-6">
                {/* Referral Link Card */}
                <div className="card">
                    <h3 className="font-semibold mb-3">Your Referral Link</h3>
                    <div className="flex gap-2">
                        <div className="flex-1 p-3 bg-[var(--background)] rounded-xl text-sm truncate border border-[var(--card-border)]">
                            {referralLink}
                        </div>
                        <button
                            onClick={copyLink}
                            className="btn btn-secondary p-3"
                        >
                            <Copy size={18} />
                        </button>
                        <button
                            onClick={shareLink}
                            className="btn btn-primary p-3"
                        >
                            <Share2 size={18} />
                        </button>
                    </div>

                    <div className="mt-3 flex items-center justify-center gap-2 p-2 bg-[var(--primary)]/10 rounded-xl">
                        <span className="text-sm text-[var(--muted)]">Your code:</span>
                        <span className="font-bold text-[var(--primary)]">{referralCode}</span>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="card text-center">
                        <div className="p-2 mx-auto w-fit rounded-xl bg-purple-500/10 mb-2">
                            <Users size={20} className="text-purple-500" />
                        </div>
                        <div className="text-2xl font-bold">{stats?.totalReferrals || 0}</div>
                        <div className="text-xs text-[var(--muted)]">Total Referrals</div>
                    </div>
                    <div className="card text-center">
                        <div className="p-2 mx-auto w-fit rounded-xl bg-green-500/10 mb-2">
                            <TrendingUp size={20} className="text-green-500" />
                        </div>
                        <div className="text-2xl font-bold">{stats?.activeReferrals || 0}</div>
                        <div className="text-xs text-[var(--muted)]">Active</div>
                    </div>
                    <div className="card text-center">
                        <div className="p-2 mx-auto w-fit rounded-xl bg-amber-500/10 mb-2">
                            <DollarSign size={20} className="text-amber-500" />
                        </div>
                        <div className="text-2xl font-bold">{(stats?.totalCommission ?? stats?.totalEarned ?? 0).toFixed(2)} Coins</div>
                        <div className="text-xs text-[var(--muted)]">Total Earned</div>
                    </div>
                    <div className="card text-center">
                        <div className="p-2 mx-auto w-fit rounded-xl bg-blue-500/10 mb-2">
                            <DollarSign size={20} className="text-blue-500" />
                        </div>
                        <div className="text-2xl font-bold">{(stats?.monthlyCommission ?? stats?.pendingEarnings ?? 0).toFixed(2)} Coins</div>
                        <div className="text-xs text-[var(--muted)]">This Month</div>
                    </div>
                </div>

                {/* How It Works */}
                <div className="card bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
                    <h3 className="font-semibold mb-3">How It Works</h3>
                    <div className="space-y-3">
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                                1
                            </div>
                            <div>
                                <div className="font-medium">Share your link</div>
                                <div className="text-sm text-[var(--muted)]">Send your referral link to friends</div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                                2
                            </div>
                            <div>
                                <div className="font-medium">They sign up</div>
                                <div className="text-sm text-[var(--muted)]">Your friends create an account</div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                                3
                            </div>
                            <div>
                                <div className="font-medium">Earn forever</div>
                                <div className="text-sm text-[var(--muted)]">Get 10% of all their earnings</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Referral List */}
                <section>
                    <h2 className="text-lg font-semibold mb-3">Your Referrals</h2>
                    {referrals.length === 0 ? (
                        <div className="text-center py-8 text-[var(--muted)]">
                            <Users size={48} className="mx-auto mb-3 opacity-50" />
                            <p>No referrals yet</p>
                            <p className="text-sm">Share your link to get started</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {referrals.map((referral) => (
                                <div key={referral.id} className="card flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${referral.isActive ? 'bg-green-500' : 'bg-gray-400'
                                        }`}>
                                        {referral.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium">{referral.username}</div>
                                        <div className="text-xs text-[var(--muted)]">{referral.email}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-[var(--success)]">
                                            {referral.commissionEarned.toFixed(2)} Coins
                                        </div>
                                        <div className={`text-xs ${referral.isActive ? 'text-green-500' : 'text-[var(--muted)]'}`}>
                                            {referral.isActive ? 'Active' : 'Inactive'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>

            <BottomNav />
        </div>
    );
}
