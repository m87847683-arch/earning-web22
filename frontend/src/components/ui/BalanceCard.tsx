'use client';

import { ReactNode, ElementType } from 'react';

interface BalanceCardProps {
    // Support both old and new prop names
    title?: string;
    label?: string;
    amount?: number;
    value?: string;
    subtitle?: string;
    trend?: string;
    icon?: ElementType;
    variant?: 'primary' | 'gold' | 'success' | 'default';
    color?: 'primary' | 'gold' | 'success' | 'default';
}

export default function BalanceCard({
    title,
    label,
    amount,
    value,
    subtitle,
    trend,
    icon: Icon,
    variant,
    color
}: BalanceCardProps) {
    // Use label or title
    const displayTitle = label || title || '';

    // Use value (string) or format amount (number)
    const displayValue = value || (amount !== undefined ? `${amount.toFixed(2)} Coins` : '0.00 Coins');

    // Use trend or subtitle
    const displaySubtitle = trend || subtitle;

    // Use color or variant
    const displayVariant = color || variant || 'default';

    const gradientClass = {
        primary: 'gradient-primary',
        gold: 'gradient-gold',
        success: 'gradient-success',
        default: 'bg-[var(--card-bg)]',
    }[displayVariant];

    const textClass = displayVariant === 'default' ? 'text-[var(--foreground)]' : 'text-white';

    return (
        <div className={`${gradientClass} rounded-2xl p-4 ${displayVariant === 'default' ? 'border border-[var(--card-border)]' : ''}`}>
            <div className="flex items-center justify-between mb-2">
                <span className={`text-sm ${displayVariant === 'default' ? 'text-[var(--muted)]' : 'text-white/80'}`}>
                    {displayTitle}
                </span>
                {Icon && (
                    <div className={`p-2 rounded-lg ${displayVariant === 'default' ? 'bg-[var(--primary)]/10' : 'bg-white/20'}`}>
                        <Icon size={18} className={displayVariant === 'default' ? 'text-[var(--primary)]' : 'text-white'} />
                    </div>
                )}
            </div>
            <div className={`text-2xl font-bold ${textClass}`}>
                {displayValue}
            </div>
            {displaySubtitle && (
                <div className={`text-xs mt-1 ${displayVariant === 'default' ? 'text-[var(--success)]' : 'text-white/70'}`}>
                    {displaySubtitle}
                </div>
            )}
        </div>
    );
}
