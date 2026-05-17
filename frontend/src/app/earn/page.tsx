'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import BottomNav from '@/components/ui/BottomNav';
import TaskCard from '@/components/ui/TaskCard';
import { TaskCardSkeleton } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import {
    Play, Link as LinkIcon, Heart, Gift, ClipboardList,
    Flame, ArrowLeft, Filter, Lock, Clock, Crown
} from 'lucide-react';

interface Task {
    id: number;
    title: string;
    description: string;
    taskLink: string;
    reward: number;
    maxCompletions: number;
    cooldownHours: number;
    taskType: string;
    icon: string;
    userCompletions: number;
    isLocked: boolean;
    maxReached: boolean;
    unlockAt?: string;
    timeRemaining?: {
        hours: number;
        minutes: number;
        seconds: number;
    };
    requiresAnswer: boolean;
}

interface DailyLimits {
    isVIP: boolean;
    unlimited: boolean;
    tasksCompleted: number;
    taskLimit: number;
    offersCompleted: number;
    offerLimit: number;
    isLocked: boolean;
    cooldownUntil: string | null;
    timeRemaining: { hours: number; minutes: number; seconds: number } | null;
    cooldownHours: number;
}

const taskTypes = [
    { id: 'all', label: 'All', icon: ClipboardList },
    { id: 'watch_ads', label: 'Ads', icon: Play },
    { id: 'videos', label: 'Videos', icon: Play },
    { id: 'short_links', label: 'Links', icon: LinkIcon },
    { id: 'social_tasks', label: 'Social', icon: Heart },
    { id: 'daily_bonus', label: 'Daily', icon: Gift },
    { id: 'offerwalls', label: 'Offers', icon: Flame },
];

export default function EarnPage() {
    const router = useRouter();
    const { token, isLoading, isAuthenticated, user, refreshUser } = useAuth();
    const { showToast } = useToast();

    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoadingTasks, setIsLoadingTasks] = useState(true);
    const [selectedType, setSelectedType] = useState('all');
    const [dailyLimits, setDailyLimits] = useState<DailyLimits | null>(null);
    const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
    const [submitModal, setSubmitModal] = useState<{ isOpen: boolean; taskId: number; taskTitle: string } | null>(null);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login?redirect=/earn');
            return;
        }

        if (token) {
            loadTasks();
            loadDailyLimits();
        }
    }, [isLoading, isAuthenticated, token, selectedType, router]);

    // Countdown timer
    useEffect(() => {
        if (!dailyLimits?.isLocked || !dailyLimits?.cooldownUntil) return;

        const interval = setInterval(() => {
            const now = new Date();
            const cooldownTime = new Date(dailyLimits.cooldownUntil!);
            const diff = cooldownTime.getTime() - now.getTime();

            if (diff <= 0) {
                setDailyLimits(prev => prev ? { ...prev, isLocked: false } : null);
                loadTasks();
                loadDailyLimits();
                clearInterval(interval);
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setCountdown({ hours, minutes, seconds });
        }, 1000);

        return () => clearInterval(interval);
    }, [dailyLimits?.isLocked, dailyLimits?.cooldownUntil]);

    const loadTasks = async () => {
        setIsLoadingTasks(true);
        try {
            const type = selectedType === 'all' ? undefined : selectedType;
            const data = await api.getTasks(token!, type);
            setTasks(data);
        } catch (error) {
            console.error('Failed to load tasks:', error);
            showToast('Failed to load tasks', 'error');
        } finally {
            setIsLoadingTasks(false);
        }
    };

    const loadDailyLimits = async () => {
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/user/daily-limits`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (response.ok) {
                const data = await response.json();
                setDailyLimits(data);
                if (data.timeRemaining) {
                    setCountdown(data.timeRemaining);
                }
            }
        } catch (error) {
            console.error('Failed to load daily limits:', error);
        }
    };

    const handleStartTask = async (taskId: number) => {
        const { token: vToken } = await api.startTask(token!, taskId.toString());
        return vToken;
    };

    const handleCompleteTask = async (taskId: number, answer?: string, verificationToken?: string) => {
        try {
            const task = tasks.find(t => t.id === taskId);
            if (!task) return;

            // Verify answer if required
            if (task.requiresAnswer && !answer) {
                setSubmitModal({
                    isOpen: true,
                    taskId: task.id,
                    taskTitle: task.title
                });
                return;
            }

            // Complete the task
            await processTaskCompletion(taskId, answer, verificationToken);

        } catch (error: any) {
            if (error.message?.includes('limit')) {
                loadDailyLimits(); // Refresh limits on limit error
            }
            showToast(error.message || 'Failed to complete task', 'error');
            throw error; // Rethrow so TaskCard knows
        }
    };

    const processTaskCompletion = async (taskId: number, answer?: string, verificationToken?: string) => {
        try {
            const result = await api.completeTask(token!, taskId.toString(), answer, verificationToken);

            showToast(
                `${result.isVIP ? '👑 ' : ''}You earned ${result.reward.toFixed(2)} Coins!${result.bonus > 0 ? ` (+${result.bonus.toFixed(2)} Coins VIP bonus)` : ''}`,
                'success'
            );

            setSubmitModal(null);
            await Promise.all([loadTasks(), refreshUser(), loadDailyLimits()]);
        } catch (error: any) {
            showToast(error.message || 'Failed to complete task', 'error');
        }
    };

    if (isLoading) {
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
                <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.back()} className="p-2 -ml-2">
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-xl font-bold">Earn Money</h1>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-[var(--muted)]">Balance</div>
                        <div className="font-bold text-[var(--success)]">{user?.balance.toFixed(2) || '0.00'} Coins</div>
                    </div>
                </div>

                {/* Task Type Filters */}
                <div className="px-4 pb-3 overflow-x-auto scrollbar-hide">
                    <div className="flex gap-2 min-w-max">
                        {taskTypes.map((type) => {
                            const Icon = type.icon;
                            const isActive = selectedType === type.id;

                            return (
                                <button
                                    key={type.id}
                                    onClick={() => setSelectedType(type.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${isActive
                                        ? 'bg-[var(--primary)] text-white'
                                        : 'bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--foreground)]'
                                        }`}
                                >
                                    <Icon size={14} />
                                    {type.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </header>

            <main className="p-4 space-y-3">
                {/* Daily Limit Progress */}
                {dailyLimits && !dailyLimits.unlimited && (
                    <div className="card bg-gradient-to-r from-[var(--card-bg)] to-[var(--primary)]/5 border border-[var(--card-border)]">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Daily Progress</span>
                            <span className="text-xs text-[var(--muted)]">
                                {dailyLimits.tasksCompleted}/{dailyLimits.taskLimit} tasks
                            </span>
                        </div>
                        <div className="h-2 bg-[var(--card-border)] rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] rounded-full transition-all duration-500"
                                style={{ width: `${Math.min((dailyLimits.tasksCompleted / dailyLimits.taskLimit) * 100, 100)}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Countdown Timer when Locked */}
                {dailyLimits?.isLocked && (
                    <div className="card bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-red-500/20 border-2 border-amber-500/30 overflow-hidden relative">
                        {/* Animated background */}
                        <div className="absolute inset-0 overflow-hidden">
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
                            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                        </div>

                        <div className="relative z-10 text-center py-4">
                            <div className="flex items-center justify-center gap-2 mb-3">
                                <Lock className="text-amber-500" size={24} />
                                <h3 className="font-bold text-lg">Daily Limit Reached!</h3>
                            </div>

                            <p className="text-sm text-[var(--muted)] mb-4">
                                Tasks will unlock in:
                            </p>

                            {/* Clock Animation */}
                            <div className="flex items-center justify-center gap-3 mb-4">
                                {/* Hours */}
                                <div className="bg-[var(--card-bg)] rounded-xl p-3 min-w-[70px] shadow-lg border border-[var(--card-border)]">
                                    <div className="text-3xl font-bold font-mono text-amber-500">
                                        {String(countdown.hours).padStart(2, '0')}
                                    </div>
                                    <div className="text-xs text-[var(--muted)] mt-1">Hours</div>
                                </div>

                                <div className="text-2xl font-bold text-amber-500 animate-pulse">:</div>

                                {/* Minutes */}
                                <div className="bg-[var(--card-bg)] rounded-xl p-3 min-w-[70px] shadow-lg border border-[var(--card-border)]">
                                    <div className="text-3xl font-bold font-mono text-orange-500">
                                        {String(countdown.minutes).padStart(2, '0')}
                                    </div>
                                    <div className="text-xs text-[var(--muted)] mt-1">Minutes</div>
                                </div>

                                <div className="text-2xl font-bold text-orange-500 animate-pulse">:</div>

                                {/* Seconds */}
                                <div className="bg-[var(--card-bg)] rounded-xl p-3 min-w-[70px] shadow-lg border border-[var(--card-border)]">
                                    <div className="text-3xl font-bold font-mono text-red-500">
                                        {String(countdown.seconds).padStart(2, '0')}
                                    </div>
                                    <div className="text-xs text-[var(--muted)] mt-1">Seconds</div>
                                </div>
                            </div>

                            {/* VIP Upgrade Prompt */}
                            <button
                                onClick={() => router.push('/vip')}
                                className="btn gradient-gold text-white font-semibold px-6 py-2 rounded-full inline-flex items-center gap-2 hover:scale-105 transition-transform"
                            >
                                <Crown size={18} />
                                Upgrade to VIP for Unlimited Tasks
                            </button>
                        </div>
                    </div>
                )}

                {/* VIP Banner */}
                {dailyLimits?.unlimited && (
                    <div className="card bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/30">
                        <div className="flex items-center gap-3">
                            <Crown className="text-amber-500" size={24} />
                            <div>
                                <div className="font-semibold text-amber-500">VIP Active</div>
                                <div className="text-xs text-[var(--muted)]">Unlimited daily tasks</div>
                            </div>
                        </div>
                    </div>
                )}

                {isLoadingTasks ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <TaskCardSkeleton key={i} />
                    ))
                ) : tasks.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-4xl mb-4">📭</div>
                        <h3 className="font-semibold mb-2">No tasks available</h3>
                        <p className="text-sm text-[var(--muted)]">
                            Check back later for new earning opportunities
                        </p>
                    </div>
                ) : (
                    tasks.map((task) => (
                        <TaskCard
                            key={task.id}
                            {...task}
                            isLocked={task.isLocked || (dailyLimits?.isLocked ?? false)}
                            onStart={handleStartTask}
                            onComplete={handleCompleteTask}
                            isVIP={!!user?.vip}
                            vipBonus={user?.vip?.earningBonus}
                        />
                    ))
                )}
            </main>

            <BottomNav />

            {/* Submit Answer Modal */}
            {submitModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[var(--card-bg)] rounded-2xl p-6 w-full max-w-sm border border-[var(--card-border)] shadow-xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold mb-2">Verify Completion</h3>
                        <p className="text-sm text-[var(--muted)] mb-4">
                            Enter the code or answer from <b>{submitModal.taskTitle}</b> to claim your reward.
                        </p>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            const answer = formData.get('answer') as string;
                            if (answer?.trim()) {
                                processTaskCompletion(submitModal.taskId, answer.trim());
                            }
                        }}>
                            <input
                                name="answer"
                                className="input w-full mb-4"
                                placeholder="Type answer here..."
                                autoFocus
                                required
                            />
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setSubmitModal(null)}
                                    className="btn btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary flex-1">
                                    Verify & Earn
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
