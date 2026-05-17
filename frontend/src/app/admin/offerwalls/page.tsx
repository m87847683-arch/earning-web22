'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import {
    Gift, Settings, BarChart2, DollarSign,
    CheckCircle, XCircle, Loader2, Copy, Save, Eye,
    EyeOff, ExternalLink, Shield, Plus, Edit2, AlertTriangle, TrendingUp, Clock, X
} from 'lucide-react';

interface OfferwallNetwork {
    id: number;
    name: string;
    displayName: string;
    description: string;
    logoUrl: string;
    secretKey: string;
    payoutPercent: number;
    hashMethod: string;
    ipWhitelist: string | null;
    offerwallUrl: string;
    status: string;
    stats: {
        totalEarnings: number;
        totalConversions: number;
        userPayouts: number;
        adminEarnings: number;
        transactionCount: number;
    };
}

interface OfferwallStats {
    overall: {
        totalTransactions: number;
        totalRevenue: number;
        totalPayouts: number;
        totalProfit: number;
        creditedCount: number;
        rejectedCount: number;
        duplicateCount: number;
        invalidSignatureCount: number;
    };
    byNetwork: Array<{
        network: string;
        transactions: number;
        revenue: number;
        profit: number;
    }>;
    today: {
        transactions: number;
        payouts: number;
        profit: number;
    };
}

interface Transaction {
    id: number;
    userId: number;
    username: string;
    email: string;
    network: string;
    transactionId: string;
    offerName: string;
    payout: number;
    creditedAmount: number;
    adminProfit: number;
    status: string;
    errorMessage: string | null;
    ipAddress: string;
    createdAt: string;
}

export default function AdminOfferwallsPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [networks, setNetworks] = useState<OfferwallNetwork[]>([]);
    const [stats, setStats] = useState<OfferwallStats | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'networks' | 'transactions' | 'analytics'>('networks');
    const [editingNetwork, setEditingNetwork] = useState<OfferwallNetwork | null>(null);
    const [transactionFilter, setTransactionFilter] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [newNetwork, setNewNetwork] = useState({
        name: '',
        displayName: '',
        description: '',
        logoUrl: '',
        secretKey: '',
        payoutPercent: 70,
        hashMethod: 'md5',
        ipWhitelist: '',
        offerwallUrl: '',
        status: 'active'
    });

    useEffect(() => {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            router.push('/admin');
            return;
        }
        loadData(token);
    }, [router]);

    const loadData = async (token: string) => {
        try {
            const [networksRes, statsRes, transactionsRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/offerwalls`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/offerwall-stats`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/offerwall-transactions?limit=100`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            if (networksRes.ok) setNetworks(await networksRes.json());
            if (statsRes.ok) setStats(await statsRes.json());
            if (transactionsRes.ok) {
                const data = await transactionsRes.json();
                setTransactions(data.transactions || []);
            }
        } catch (error) {
            console.error('Error loading data:', error);
            showToast('Failed to load offerwall data', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const updateNetwork = async (network: OfferwallNetwork) => {
        const token = localStorage.getItem('adminToken');
        if (!token) return;

        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/offerwalls/${network.id}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        displayName: network.displayName,
                        description: network.description,
                        payoutPercent: network.payoutPercent,
                        status: network.status,
                        ipWhitelist: network.ipWhitelist,
                        offerwallUrl: network.offerwallUrl,
                        secretKey: network.secretKey,
                        logoUrl: network.logoUrl,
                        hashMethod: network.hashMethod
                    })
                }
            );

            if (!response.ok) throw new Error('Failed to update');

            showToast('Network updated successfully', 'success');
            setEditingNetwork(null);
            loadData(token);
        } catch (error) {
            showToast('Failed to update network', 'error');
        }
    };
    
    const createNetwork = async () => {
        const token = localStorage.getItem('adminToken');
        if (!token) return;

        if (!newNetwork.name || !newNetwork.displayName || !newNetwork.secretKey) {
            showToast('Name, Display Name, and Secret Key are required', 'error');
            return;
        }

        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/offerwalls`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(newNetwork)
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create');
            }

            showToast('Network created successfully', 'success');
            setIsAdding(false);
            setNewNetwork({
                name: '',
                displayName: '',
                description: '',
                logoUrl: '',
                secretKey: '',
                payoutPercent: 70,
                hashMethod: 'md5',
                ipWhitelist: '',
                offerwallUrl: '',
                status: 'active'
            });
            loadData(token);
        } catch (error: any) {
            showToast(error.message || 'Failed to create network', 'error');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'credited': return 'text-green-500 bg-green-500/10';
            case 'pending': return 'text-amber-500 bg-amber-500/10';
            case 'rejected':
            case 'invalid_signature':
            case 'user_not_found': return 'text-red-500 bg-red-500/10';
            case 'duplicate': return 'text-orange-500 bg-orange-500/10';
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
        <div className="pb-8">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[var(--bg-primary)] border-b border-[var(--card-border)] px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <Gift className="text-purple-500" size={24} />
                    <h1 className="text-lg font-bold">Offerwall Management</h1>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="flex items-center gap-1 text-xs py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
                >
                    <Plus size={14} /> Add Network
                </button>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="card text-center">
                        <DollarSign className="mx-auto mb-1 text-green-500" size={20} />
                        <p className="text-xl font-bold">${stats.overall.totalRevenue.toFixed(2)}</p>
                        <p className="text-xs text-[var(--muted)]">Total Revenue</p>
                    </div>
                    <div className="card text-center">
                        <TrendingUp className="mx-auto mb-1 text-blue-500" size={20} />
                        <p className="text-xl font-bold">${stats.overall.totalProfit.toFixed(2)}</p>
                        <p className="text-xs text-[var(--muted)]">Admin Profit</p>
                    </div>
                    <div className="card text-center">
                        <CheckCircle className="mx-auto mb-1 text-emerald-500" size={20} />
                        <p className="text-xl font-bold">{stats.overall.creditedCount}</p>
                        <p className="text-xs text-[var(--muted)]">Credited</p>
                    </div>
                    <div className="card text-center">
                        <AlertTriangle className="mx-auto mb-1 text-red-500" size={20} />
                        <p className="text-xl font-bold">{stats.overall.rejectedCount + stats.overall.invalidSignatureCount}</p>
                        <p className="text-xs text-[var(--muted)]">Rejected</p>
                    </div>
                </div>
            )}

            {/* Today's Stats */}
            {stats && (
                <div className="px-4 mb-4">
                    <div className="card bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-[var(--muted)]">Today's Performance</p>
                                <p className="text-lg font-bold">
                                    {stats.today.transactions} conversions • ${stats.today.profit.toFixed(2)} profit
                                </p>
                            </div>
                            <BarChart2 className="text-purple-500" size={24} />
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="px-4 mb-4">
                <div className="flex bg-[var(--card-bg)] rounded-xl p-1 overflow-x-auto">
                    {['networks', 'transactions', 'analytics'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as typeof activeTab)}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab
                                    ? 'bg-[var(--accent)] text-white'
                                    : 'text-[var(--muted)]'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="px-4 space-y-3">
                {activeTab === 'networks' && (
                    <>
                        {isAdding && (
                            <div className="card border-purple-500/30 bg-purple-500/5 space-y-3">
                                <div className="flex justify-between items-center border-b border-[var(--card-border)] pb-2">
                                    <h3 className="font-semibold text-purple-400">Add New Offerwall Network</h3>
                                    <button 
                                        onClick={() => setIsAdding(false)}
                                        className="text-[var(--muted)] hover:text-white"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-[var(--muted)]">Unique Name Key (e.g. cpx, offertoro)</label>
                                        <input
                                            type="text"
                                            value={newNetwork.name}
                                            onChange={(e) => setNewNetwork({...newNetwork, name: e.target.value})}
                                            className="input w-full mt-1"
                                            placeholder="cpx"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-[var(--muted)]">Display Name</label>
                                        <input
                                            type="text"
                                            value={newNetwork.displayName}
                                            onChange={(e) => setNewNetwork({...newNetwork, displayName: e.target.value})}
                                            className="input w-full mt-1"
                                            placeholder="CPX Research"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-[var(--muted)]">Description</label>
                                    <input
                                        type="text"
                                        value={newNetwork.description}
                                        onChange={(e) => setNewNetwork({...newNetwork, description: e.target.value})}
                                        className="input w-full mt-1"
                                        placeholder="Complete paid surveys and market research"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-[var(--muted)]">Secret Key / Hash Salt</label>
                                        <input
                                            type="text"
                                            value={newNetwork.secretKey}
                                            onChange={(e) => setNewNetwork({...newNetwork, secretKey: e.target.value})}
                                            className="input w-full mt-1"
                                            placeholder="Wj3UbM6TLdo0r3eFHUs..."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-[var(--muted)]">Payout Percent (%)</label>
                                        <input
                                            type="number"
                                            value={newNetwork.payoutPercent}
                                            onChange={(e) => setNewNetwork({...newNetwork, payoutPercent: parseFloat(e.target.value) || 70})}
                                            className="input w-full mt-1"
                                            placeholder="70"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-[var(--muted)]">Offerwall Embed/Iframe URL</label>
                                    <input
                                        type="text"
                                        value={newNetwork.offerwallUrl}
                                        onChange={(e) => setNewNetwork({...newNetwork, offerwallUrl: e.target.value})}
                                        className="input w-full mt-1"
                                        placeholder="https://offers.cpx-research.com/index.php?app_id=...&ext_user_id={ext_user_id}&secure_hash={secure_hash}"
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-xs text-[var(--muted)]">Logo Icon (Emoji or URL)</label>
                                        <input
                                            type="text"
                                            value={newNetwork.logoUrl}
                                            onChange={(e) => setNewNetwork({...newNetwork, logoUrl: e.target.value})}
                                            className="input w-full mt-1"
                                            placeholder="📊"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-[var(--muted)]">Hash Method</label>
                                        <select
                                            value={newNetwork.hashMethod}
                                            onChange={(e) => setNewNetwork({...newNetwork, hashMethod: e.target.value})}
                                            className="input w-full mt-1"
                                        >
                                            <option value="md5">MD5</option>
                                            <option value="sha256">SHA256</option>
                                            <option value="none">None</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-[var(--muted)]">Status</label>
                                        <select
                                            value={newNetwork.status}
                                            onChange={(e) => setNewNetwork({...newNetwork, status: e.target.value})}
                                            className="input w-full mt-1"
                                        >
                                            <option value="active">Active</option>
                                            <option value="testing">Testing</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-[var(--muted)]">IP Whitelist (comma-separated, optional)</label>
                                    <input
                                        type="text"
                                        value={newNetwork.ipWhitelist}
                                        onChange={(e) => setNewNetwork({...newNetwork, ipWhitelist: e.target.value})}
                                        className="input w-full mt-1"
                                        placeholder="Leave empty unless required"
                                    />
                                </div>
                                <div className="flex gap-2 justify-end pt-2">
                                    <button
                                        onClick={() => setIsAdding(false)}
                                        className="py-2 px-4 rounded-lg bg-[var(--card-border)] hover:bg-[var(--card-bg)] text-sm font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={createNetwork}
                                        className="py-2 px-4 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors"
                                    >
                                        Save Network
                                    </button>
                                </div>
                            </div>
                        )}
                        {networks.map((network) => (
                            <div key={network.id} className="card">
                                {editingNetwork?.id === network.id ? (
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <h3 className="font-semibold">{network.displayName}</h3>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => updateNetwork(editingNetwork)}
                                                    className="p-2 bg-green-500 text-white rounded-lg"
                                                >
                                                    <Save size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setEditingNetwork(null)}
                                                    className="p-2 bg-red-500 text-white rounded-lg"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs text-[var(--muted)]">Payout %</label>
                                                <input
                                                    type="number"
                                                    value={editingNetwork.payoutPercent}
                                                    onChange={(e) => setEditingNetwork({
                                                        ...editingNetwork,
                                                        payoutPercent: parseFloat(e.target.value)
                                                    })}
                                                    className="input w-full mt-1"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-[var(--muted)]">Status</label>
                                                <select
                                                    value={editingNetwork.status}
                                                    onChange={(e) => setEditingNetwork({
                                                        ...editingNetwork,
                                                        status: e.target.value
                                                    })}
                                                    className="input w-full mt-1"
                                                >
                                                    <option value="active">Active</option>
                                                    <option value="inactive">Inactive</option>
                                                    <option value="testing">Testing</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs text-[var(--muted)]">Secret Key / Salt</label>
                                                <input
                                                    type="text"
                                                    value={editingNetwork.secretKey || ''}
                                                    onChange={(e) => setEditingNetwork({
                                                        ...editingNetwork,
                                                        secretKey: e.target.value
                                                    })}
                                                    className="input w-full mt-1"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-[var(--muted)]">Logo / Icon</label>
                                                <input
                                                    type="text"
                                                    value={editingNetwork.logoUrl || ''}
                                                    onChange={(e) => setEditingNetwork({
                                                        ...editingNetwork,
                                                        logoUrl: e.target.value
                                                    })}
                                                    className="input w-full mt-1"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs text-[var(--muted)]">Offerwall Embed URL</label>
                                            <input
                                                type="text"
                                                value={editingNetwork.offerwallUrl || ''}
                                                onChange={(e) => setEditingNetwork({
                                                    ...editingNetwork,
                                                    offerwallUrl: e.target.value
                                                })}
                                                className="input w-full mt-1"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-xs text-[var(--muted)]">IP Whitelist (comma-separated)</label>
                                            <input
                                                type="text"
                                                value={editingNetwork.ipWhitelist || ''}
                                                onChange={(e) => setEditingNetwork({
                                                    ...editingNetwork,
                                                    ipWhitelist: e.target.value
                                                })}
                                                className="input w-full mt-1"
                                                placeholder="1.2.3.4, 5.6.7.8"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-start gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xl">
                                            🎯
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold">{network.displayName}</h3>
                                                <span className={`px-2 py-0.5 text-xs rounded-full ${network.status === 'active' ? 'bg-green-500/10 text-green-500' :
                                                        network.status === 'testing' ? 'bg-amber-500/10 text-amber-500' :
                                                            'bg-red-500/10 text-red-500'
                                                    }`}>
                                                    {network.status}
                                                </span>
                                            </div>

                                            <p className="text-sm text-[var(--muted)]">
                                                {network.payoutPercent}% payout • {network.stats.totalConversions} conversions
                                            </p>

                                            <div className="flex gap-4 mt-2 text-xs">
                                                <span className="text-green-500">
                                                    Revenue: ${network.stats.totalEarnings.toFixed(2)}
                                                </span>
                                                <span className="text-blue-500">
                                                    Profit: ${network.stats.adminEarnings.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setEditingNetwork(network)}
                                            className="p-2 hover:bg-[var(--card-border)] rounded-lg"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}

                        <div className="card bg-blue-500/10 border-blue-500/20">
                            <h4 className="font-semibold text-sm mb-2">Postback URLs</h4>
                            <p className="text-xs text-[var(--muted)] mb-2">
                                Configure these URLs in your offerwall dashboard:
                            </p>
                            {networks.map((n) => (
                                <div key={n.id} className="text-xs bg-[var(--bg-primary)] p-2 rounded mb-1 font-mono break-all">
                                    <strong>{n.displayName}:</strong><br />
                                    {typeof window !== 'undefined'
                                        ? `${window.location.origin.replace(':3000', ':5000')}/postback/${n.name}`
                                        : `/postback/${n.name}`}
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {activeTab === 'transactions' && (
                    <>
                        <div className="flex gap-2 mb-3">
                            <select
                                value={transactionFilter}
                                onChange={(e) => setTransactionFilter(e.target.value)}
                                className="input flex-1"
                            >
                                <option value="">All Statuses</option>
                                <option value="credited">Credited</option>
                                <option value="rejected">Rejected</option>
                                <option value="invalid_signature">Invalid Signature</option>
                                <option value="duplicate">Duplicate</option>
                            </select>
                        </div>

                        {transactions
                            .filter(t => !transactionFilter || t.status === transactionFilter)
                            .map((tx) => (
                                <div key={tx.id} className="card">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-medium text-sm">{tx.username || `User #${tx.userId}`}</p>
                                            <p className="text-xs text-[var(--muted)]">{tx.network}</p>
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(tx.status)}`}>
                                            {tx.status}
                                        </span>
                                    </div>

                                    <div className="mt-2 flex justify-between items-end">
                                        <div>
                                            <p className="text-xs text-[var(--muted)]">
                                                {tx.offerName || 'Offer completed'}
                                            </p>
                                            <p className="text-xs text-[var(--muted)]">
                                                TxID: {tx.transactionId.substring(0, 20)}...
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-green-500">${tx.payout.toFixed(2)}</p>
                                            <p className="text-xs text-[var(--muted)]">
                                                User: ${tx.creditedAmount.toFixed(2)} | Admin: ${tx.adminProfit.toFixed(2)}
                                            </p>
                                        </div>
                                    </div>

                                    {tx.errorMessage && (
                                        <p className="text-xs text-red-500 mt-2">
                                            Error: {tx.errorMessage}
                                        </p>
                                    )}

                                    <p className="text-xs text-[var(--muted)] mt-2">
                                        {new Date(tx.createdAt).toLocaleString()} • IP: {tx.ipAddress}
                                    </p>
                                </div>
                            ))}
                    </>
                )}

                {activeTab === 'analytics' && stats && (
                    <>
                        <div className="card">
                            <h3 className="font-semibold mb-3">Revenue by Network</h3>
                            {stats.byNetwork.length === 0 ? (
                                <p className="text-sm text-[var(--muted)]">No data yet</p>
                            ) : (
                                stats.byNetwork.map((network, i) => (
                                    <div key={i} className="flex justify-between items-center py-2 border-b border-[var(--card-border)] last:border-0">
                                        <span className="text-sm">{network.network}</span>
                                        <div className="text-right">
                                            <span className="font-semibold">${network.revenue.toFixed(2)}</span>
                                            <span className="text-xs text-[var(--muted)] ml-2">
                                                ({network.transactions} txns)
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="card">
                            <h3 className="font-semibold mb-3">Transaction Breakdown</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm text-green-500">Credited</span>
                                    <span className="font-medium">{stats.overall.creditedCount}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-red-500">Rejected</span>
                                    <span className="font-medium">{stats.overall.rejectedCount}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-orange-500">Duplicates</span>
                                    <span className="font-medium">{stats.overall.duplicateCount}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-red-500">Invalid Signatures</span>
                                    <span className="font-medium">{stats.overall.invalidSignatureCount}</span>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
