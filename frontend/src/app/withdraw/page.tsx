'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import BottomNav from '@/components/ui/BottomNav';
import { api } from '@/lib/api';
import {
    ArrowLeft, Wallet, Phone, Bitcoin,
    CreditCard, ChevronRight, Clock, CheckCircle,
    XCircle, AlertCircle, Loader2, Lock, Users, Share2
} from 'lucide-react';

interface WithdrawalInfo {
    balance: number;
    minWithdrawal: number;
    maxWithdrawal?: number;
    feePercent: number;
    feePercentage?: number;
    isVIP?: boolean;
    referralCount?: number;
    requiredReferrals?: number;
    canWithdraw?: boolean;
    methods: {
        id: string;
        name: string;
        icon: string;
        fields: string[];
    }[];
    paymentMethods?: {
        id: string;
        name: string;
        icon: string;
        fields: string[];
    }[];
}

interface Withdrawal {
    id: number;
    amount: number;
    fee: number;
    netAmount: number;
    paymentMethod: string;
    status: string;
    createdAt: string;
}

const methodIcons: Record<string, any> = {
    jazzcash: Phone,
    easypaisa: Phone,
    usdt_trc20: Bitcoin,
    binance_pay: CreditCard,
};

const statusIcons: Record<string, any> = {
    pending: Clock,
    approved: CheckCircle,
    processing: Loader2,
    completed: CheckCircle,
    rejected: XCircle,
};

const statusColors: Record<string, string> = {
    pending: 'text-amber-500 bg-amber-500/10',
    approved: 'text-blue-500 bg-blue-500/10',
    processing: 'text-blue-500 bg-blue-500/10',
    completed: 'text-green-500 bg-green-500/10',
    rejected: 'text-red-500 bg-red-500/10',
};

export default function WithdrawPage() {
    const router = useRouter();
    const { token, isLoading, isAuthenticated, refreshUser } = useAuth();
    const { showToast } = useToast();

    const [info, setInfo] = useState<WithdrawalInfo | null>(null);
    const [history, setHistory] = useState<Withdrawal[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [amount, setAmount] = useState('');
    const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
    const [accountNumber, setAccountNumber] = useState('');
    const [walletAddress, setWalletAddress] = useState('');
    const [binanceId, setBinanceId] = useState('');
    const [binanceEmail, setBinanceEmail] = useState('');

    const [calculatedFee, setCalculatedFee] = useState<{
        fee: number;
        netAmount: number;
    } | null>(null);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login?redirect=/withdraw');
            return;
        }

        if (token) {
            loadData();
        }
    }, [isLoading, isAuthenticated, token, router]);

    useEffect(() => {
        if (amount && parseFloat(amount) > 0 && token) {
            calculateFee();
        } else {
            setCalculatedFee(null);
        }
    }, [amount, token]);

    const loadData = async () => {
        try {
            const [infoData, historyData] = await Promise.all([
                api.getWithdrawalInfo(token!),
                api.getWithdrawalHistory(token!)
            ]);
            setInfo(infoData);
            setHistory(historyData.withdrawals);
        } catch (error) {
            console.error('Failed to load withdrawal data:', error);
        } finally {
            setIsLoadingData(false);
        }
    };

    const calculateFee = async () => {
        try {
            const result = await api.calculateWithdrawalFee(token!, parseFloat(amount));
            setCalculatedFee({
                fee: result.fee,
                netAmount: result.netAmount
            });
        } catch (error) {
            console.error('Failed to calculate fee:', error);
        }
    };

    const getPaymentDetails = () => {
        switch (selectedMethod) {
            case 'jazzcash':
            case 'easypaisa':
                return { accountNumber };
            case 'usdt_trc20':
                return { walletAddress };
            case 'binance_pay':
                return { binanceId, email: binanceEmail };
            default:
                return {};
        }
    };

    const handleSubmit = async () => {
        if (!amount || !selectedMethod) {
            showToast('Please fill in all required fields', 'error');
            return;
        }

        const requestAmount = parseFloat(amount);

        if (requestAmount < (info?.minWithdrawal || 0)) {
            showToast(`Minimum withdrawal is $${info?.minWithdrawal}`, 'error');
            return;
        }

        if (requestAmount > (info?.balance || 0)) {
            showToast('Insufficient balance', 'error');
            return;
        }

        const paymentDetails = getPaymentDetails();
        if (Object.values(paymentDetails).some(v => !v)) {
            showToast('Please fill in payment details', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            await api.requestWithdrawal(token!, requestAmount, selectedMethod, paymentDetails);
            showToast('Withdrawal request submitted!', 'success');

            // Reset form
            setAmount('');
            setSelectedMethod(null);
            setAccountNumber('');
            setWalletAddress('');
            setBinanceId('');
            setBinanceEmail('');

            // Refresh data
            await Promise.all([loadData(), refreshUser()]);
        } catch (error: any) {
            showToast(error.message || 'Failed to submit withdrawal', 'error');
        } finally {
            setIsSubmitting(false);
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
            <header className="sticky top-0 z-40 bg-[var(--background)]/80 backdrop-blur-lg border-b border-[var(--card-border)]">
                <div className="flex items-center gap-3 p-4">
                    <button onClick={() => router.back()} className="p-2 -ml-2">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-xl font-bold">Withdraw</h1>
                </div>
            </header>

            <main className="p-4 space-y-6">
                {/* Referral Lock */}
                {info && !info.canWithdraw && (
                    <div className="card bg-gradient-to-br from-orange-500/20 to-red-500/20 border-orange-500/30">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                                <Lock size={24} className="text-orange-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Withdrawal Locked</h3>
                                <p className="text-sm text-[var(--muted)]">Invite friends to unlock</p>
                            </div>
                        </div>

                        <div className="bg-[var(--card-bg)] rounded-lg p-4 mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm">Referral Progress</span>
                                <span className="font-bold text-orange-500">
                                    {info.referralCount || 0} / {info.requiredReferrals || 5}
                                </span>
                            </div>
                            <div className="w-full bg-[var(--card-border)] rounded-full h-3">
                                <div
                                    className="bg-gradient-to-r from-orange-500 to-green-500 h-3 rounded-full transition-all"
                                    style={{ width: `${Math.min(((info.referralCount || 0) / (info.requiredReferrals || 5)) * 100, 100)}%` }}
                                />
                            </div>
                            <p className="text-xs text-[var(--muted)] mt-2">
                                You need {(info.requiredReferrals || 5) - (info.referralCount || 0)} more referrals to withdraw
                            </p>
                        </div>

                        <button
                            onClick={() => router.push('/referrals')}
                            className="w-full btn-primary flex items-center justify-center gap-2"
                        >
                            <Share2 size={18} />
                            Invite Friends Now
                        </button>
                    </div>
                )}

                {/* Balance Info */}
                <div className="card gradient-success text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-white/70 text-sm">Available Balance</p>
                            <p className="text-3xl font-bold">{info?.balance.toFixed(0)} Coins</p>
                            <p className="text-sm font-medium text-white/80 mt-1">≈ ${( (info?.balance || 0) / (info?.coinExchangeRate || 1000) ).toFixed(2)}</p>
                        </div>
                        <Wallet size={40} className="text-white/30" />
                    </div>
                    <div className="flex gap-4 mt-3 text-sm">
                        <div>
                            <span className="text-white/70">Min:</span>
                            <span className="ml-1 font-medium">{info?.minWithdrawal} Coins</span>
                        </div>
                        <div>
                            <span className="text-white/70">Fee:</span>
                            <span className="ml-1 font-medium">{info?.feePercentage || info?.feePercent}%</span>
                            {info?.isVIP && (
                                <span className="ml-1 text-xs bg-white/20 px-1.5 py-0.5 rounded">VIP</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Amount Input */}
                <div>
                    <label className="block text-sm font-medium mb-2">Amount (Coins)</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-lg pointer-events-none z-10">🪙</span>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="input text-lg font-medium"
                            style={{ paddingLeft: '40px' }}
                            min={info?.minWithdrawal}
                            max={info?.balance}
                        />
                    </div>

                    {calculatedFee && (
                        <div className="flex flex-col mt-2 text-sm space-y-1">
                            <div className="flex justify-between">
                                <span className="text-[var(--muted)]">Fee: {calculatedFee.fee.toFixed(0)} Coins</span>
                                <span className="font-medium">You'll receive: {calculatedFee.netAmount.toFixed(0)} Coins</span>
                            </div>
                            <div className="flex justify-between">
                                <span></span>
                                <span className="font-medium text-[var(--success)]">≈ ${(calculatedFee.netAmount / (info?.coinExchangeRate || 1000)).toFixed(2)}</span>
                            </div>
                        </div>
                    )}

                    {/* Quick amount buttons */}
                    <div className="flex gap-2 mt-3">
                        {[100, 500, 1000, 5000].map((val) => (
                            <button
                                key={val}
                                onClick={() => setAmount(String(Math.min(val, info?.balance || val)))}
                                className="flex-1 py-2 text-sm font-medium rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--primary)]"
                                disabled={(info?.balance || 0) < val}
                            >
                                {val} Coins
                            </button>
                        ))}
                    </div>
                </div>

                {/* Payment Method */}
                <div>
                    <label className="block text-sm font-medium mb-2">Payment Method</label>
                    <div className="grid grid-cols-2 gap-2">
                        {(info?.paymentMethods || info?.methods)?.map((method) => {
                            const Icon = methodIcons[method.id] || CreditCard;
                            const isSelected = selectedMethod === method.id;

                            return (
                                <button
                                    key={method.id}
                                    onClick={() => setSelectedMethod(method.id)}
                                    className={`card flex items-center gap-2 p-3 transition-all ${isSelected
                                        ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/20'
                                        : ''
                                        }`}
                                >
                                    <Icon size={20} className={isSelected ? 'text-[var(--primary)]' : 'text-[var(--muted)]'} />
                                    <span className="text-sm font-medium">{method.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Payment Details */}
                {selectedMethod && (
                    <div className="space-y-3">
                        {(selectedMethod === 'jazzcash' || selectedMethod === 'easypaisa') && (
                            <div>
                                <label className="block text-sm font-medium mb-2">Account Number</label>
                                <input
                                    type="tel"
                                    value={accountNumber}
                                    onChange={(e) => setAccountNumber(e.target.value)}
                                    placeholder="03XX XXXXXXX"
                                    className="input"
                                />
                            </div>
                        )}

                        {selectedMethod === 'usdt_trc20' && (
                            <div>
                                <label className="block text-sm font-medium mb-2">TRC20 Wallet Address</label>
                                <input
                                    type="text"
                                    value={walletAddress}
                                    onChange={(e) => setWalletAddress(e.target.value)}
                                    placeholder="T..."
                                    className="input font-mono text-sm"
                                />
                            </div>
                        )}

                        {selectedMethod === 'binance_pay' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Binance Pay ID</label>
                                    <input
                                        type="text"
                                        value={binanceId}
                                        onChange={(e) => setBinanceId(e.target.value)}
                                        placeholder="Enter Binance Pay ID"
                                        className="input"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Binance Email</label>
                                    <input
                                        type="email"
                                        value={binanceEmail}
                                        onChange={(e) => setBinanceEmail(e.target.value)}
                                        placeholder="Enter Binance email"
                                        className="input"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Submit Button */}
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !amount || !selectedMethod || !info?.canWithdraw}
                    className="btn btn-primary w-full py-4"
                >
                    {isSubmitting ? (
                        <Loader2 size={20} className="animate-spin" />
                    ) : !info?.canWithdraw ? (
                        <>
                            <Lock size={18} className="mr-2" />
                            Unlock with 5 Referrals
                        </>
                    ) : (
                        'Request Withdrawal'
                    )}
                </button>

                {/* History */}
                <section>
                    <h2 className="text-lg font-semibold mb-3">Recent Withdrawals</h2>
                    {history.length === 0 ? (
                        <div className="text-center py-8 text-[var(--muted)]">
                            <Wallet size={48} className="mx-auto mb-3 opacity-50" />
                            <p>No withdrawals yet</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {history.slice(0, 5).map((withdrawal) => {
                                const StatusIcon = statusIcons[withdrawal.status] || Clock;
                                const statusColor = statusColors[withdrawal.status] || 'text-gray-500 bg-gray-500/10';
                                const MethodIcon = methodIcons[withdrawal.paymentMethod] || CreditCard;

                                return (
                                    <div key={withdrawal.id} className="card flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-[var(--card-border)]">
                                            <MethodIcon size={20} className="text-[var(--muted)]" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium">{withdrawal.netAmount.toFixed(0)} Coins</div>
                                            <div className="text-xs text-[var(--muted)]">
                                                {new Date(withdrawal.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                                            <StatusIcon size={12} className={withdrawal.status === 'processing' ? 'animate-spin' : ''} />
                                            {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </main>

            <BottomNav />
        </div>
    );
}
