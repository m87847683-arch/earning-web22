'use client';

import { useState, useEffect } from 'react';
import { Play, Link as LinkIcon, Heart, Gift, ClipboardList, Lock, Clock } from 'lucide-react';

interface TaskCardProps {
    id: number;
    title: string;
    description: string;
    reward: number;
    taskType: string;
    icon?: string;
    userCompletions: number;
    maxCompletions: number;
    isLocked: boolean;
    maxReached: boolean;
    unlockAt?: string;
    timeRemaining?: {
        hours: number;
        minutes: number;
        seconds: number;
    };
    onStart: (id: number) => Promise<string>;
    onComplete: (id: number, answer?: string, token?: string) => Promise<void>;
    isVIP?: boolean;
    vipBonus?: number;
    requiresAnswer?: boolean;
    taskLink?: string;
}

const iconMap: Record<string, any> = {
    'play-circle': Play,
    'link': LinkIcon,
    'twitter': Heart,
    'gift': Gift,
    'clipboard': ClipboardList,
};

export default function TaskCard({
    id,
    title,
    description,
    reward,
    taskType,
    icon,
    userCompletions,
    maxCompletions,
    isLocked,
    maxReached,
    unlockAt,
    timeRemaining: initialTimeRemaining,
    onStart,
    onComplete,
    isVIP,
    vipBonus = 20,
    requiresAnswer,
    taskLink,
}: TaskCardProps) {
    const [timeRemaining, setTimeRemaining] = useState(initialTimeRemaining);
    const [isCompleting, setIsCompleting] = useState(false);
    const [isPendingAnswer, setIsPendingAnswer] = useState(false);
    const [verificationToken, setVerificationToken] = useState<string | null>(null);
    const [waitTime, setWaitTime] = useState<number>(0);

    useEffect(() => {
        if (!isLocked || !unlockAt) return;

        const interval = setInterval(() => {
            const now = new Date();
            const unlock = new Date(unlockAt);
            const diff = unlock.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeRemaining(undefined);
                clearInterval(interval);
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeRemaining({ hours, minutes, seconds });
        }, 1000);

        return () => clearInterval(interval);
    }, [isLocked, unlockAt]);

    const IconComponent = iconMap[icon || 'clipboard'] || ClipboardList;
    const bonusReward = isVIP ? reward * (1 + vipBonus / 100) : reward;
    const isDisabled = isLocked || maxReached || isCompleting;

    const handleComplete = async () => {
        if (isDisabled) return;

        if (requiresAnswer) {
            if (!isPendingAnswer && taskLink) {
                window.open(taskLink, '_blank');
                setIsPendingAnswer(true);
                return;
            }
            setIsCompleting(true);
            try {
                await onComplete(id);
            } catch (e) {
                // Keep pending state if failed
            } finally {
                setIsCompleting(false);
            }
        } else {
            if (!verificationToken) {
                setIsCompleting(true);
                try {
                    const token = await onStart(id);
                    setVerificationToken(token);
                    setWaitTime(10);
                    if (taskLink) window.open(taskLink, '_blank');
                    
                    const timerId = setInterval(() => {
                        setWaitTime(prev => {
                            if (prev <= 1) {
                                clearInterval(timerId);
                                return 0;
                            }
                            return prev - 1;
                        });
                    }, 1000);
                } catch (e) {
                    // Start failed
                } finally {
                    setIsCompleting(false);
                }
            } else if (waitTime === 0) {
                setIsCompleting(true);
                try {
                    await onComplete(id, undefined, verificationToken);
                    setVerificationToken(null);
                } catch (e) {
                    // Complete failed
                } finally {
                    setIsCompleting(false);
                }
            }
        }
    };

    const formatTime = (time: typeof timeRemaining) => {
        if (!time) return '';
        return `${String(time.hours).padStart(2, '0')}:${String(time.minutes).padStart(2, '0')}:${String(time.seconds).padStart(2, '0')}`;
    };

    return (
        <div className={`card transition-all duration-200 ${isDisabled ? 'opacity-60' : ''}`}>
            <div className="flex items-start gap-3">
                <div className={`p-3 rounded-xl ${isDisabled ? 'bg-[var(--muted)]/10' : 'bg-[var(--primary)]/10'
                    }`}>
                    <IconComponent
                        size={24}
                        className={isDisabled ? 'text-[var(--muted)]' : 'text-[var(--primary)]'}
                    />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[var(--foreground)] truncate">{title}</h3>
                        {isVIP && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 font-medium">
                                +{vipBonus}%
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-[var(--muted)] mt-0.5 line-clamp-1">{description}</p>

                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-[var(--muted)]">
                            {userCompletions}/{maxCompletions} completed
                        </span>
                        <div className="flex-1 h-1.5 bg-[var(--card-border)] rounded-full overflow-hidden">
                            <div
                                className="h-full bg-[var(--primary)] rounded-full transition-all duration-300"
                                style={{ width: `${(userCompletions / maxCompletions) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="text-right flex flex-col items-end">
                    <div className="font-bold text-[var(--success)]">
                        {isVIP ? bonusReward.toFixed(2) : reward.toFixed(2)} Coins
                    </div>

                    {isLocked && timeRemaining ? (
                        <div className="flex items-center gap-1 mt-2 text-xs text-[var(--muted)]">
                            <Clock size={12} />
                            <span className="countdown">{formatTime(timeRemaining)}</span>
                        </div>
                    ) : maxReached ? (
                        <div className="flex items-center gap-1 mt-2 text-xs text-[var(--danger)]">
                            <Lock size={12} />
                            <span>Max reached</span>
                        </div>
                    ) : (
                        <button
                            onClick={handleComplete}
                            disabled={isDisabled || waitTime > 0}
                            className={`btn btn-primary mt-2 py-2 px-4 text-xs ${isCompleting ? 'opacity-50' : ''}`}
                        >
                            {isCompleting ? 'Loading...' : (
                                requiresAnswer
                                    ? (isPendingAnswer ? 'Submit Answer' : 'Complete')
                                    : (verificationToken ? (waitTime > 0 ? `Wait ${waitTime}s...` : 'Claim Reward') : 'Complete')
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
