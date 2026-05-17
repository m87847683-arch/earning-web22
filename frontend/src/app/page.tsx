'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import BottomNav from '@/components/ui/BottomNav';
import BalanceCard from '@/components/ui/BalanceCard';
import VIPBadge from '@/components/ui/VIPBadge';
import { BalanceCardSkeleton } from '@/components/ui/Skeleton';
import { api } from '@/lib/api';
import {
  Wallet, TrendingUp, Clock, Bell, ChevronRight,
  Target, Users, Gift, Zap, Play, Shield, Star,
  DollarSign, ArrowRight, Sparkles, Check, Crown,
  Award, Headset, Globe
} from 'lucide-react';

interface DashboardData {
  balance: number;
  pendingBalance: number;
  totalEarned: number;
  todayEarned: number;
  isVIP: boolean;
  vip: {
    name: string;
    expiresAt: string;
    earningBonus: number;
    badgeColor: string;
  } | null;
  availableTasks: number;
  completedToday: number;
  referralCount: number;
  unreadNotifications: number;
}

// Animated Marquee Component
function LivePayoutsMarquee() {
  const payouts = [
    { name: 'Alex M.', amount: '$50.00', method: 'PayPal', time: '2m ago' },
    { name: 'Sarah K.', amount: '$15.50', method: 'Crypto', time: '5m ago' },
    { name: 'John D.', amount: '$100.00', method: 'Bank', time: '12m ago' },
    { name: 'Emma W.', amount: '$25.00', method: 'PayPal', time: '15m ago' },
    { name: 'Michael R.', amount: '$10.00', method: 'Crypto', time: '18m ago' },
  ];

  return (
    <div className="w-full overflow-hidden py-4 bg-white/5 backdrop-blur-sm border-y border-white/10 my-8 flex">
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
        {[...payouts, ...payouts].map((p, i) => (
          <div key={i} className="flex items-center gap-3 px-6 shrink-0">
            <div className="w-8 h-8 rounded-full gradient-success flex items-center justify-center text-white text-xs font-bold">
              {p.name.charAt(0)}
            </div>
            <div>
              <div className="text-sm font-semibold text-white whitespace-nowrap">
                {p.name} cashed out <span className="text-[var(--success)]">{p.amount}</span>
              </div>
              <div className="text-xs text-white/50">{p.method} • {p.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Horizontal Testimonial Component
function TestimonialCarousel({ testimonials }: { testimonials: { name: string; amount: string; text: string }[] }) {
  return (
    <section className="px-4 py-8 overflow-hidden">
      <h3 className="text-2xl font-bold text-center mb-6">
        What Users Say
      </h3>

      <div className="w-full overflow-hidden relative">
        <div className="flex w-max animate-marquee gap-4 pb-8 hover:[animation-play-state:paused] px-2">
          {[...testimonials, ...testimonials].map((t, i) => (
            <div key={i} className="w-[85vw] max-w-[350px] shrink-0">
              <div className="p-6 rounded-3xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 h-full flex flex-col relative overflow-hidden group hover:border-white/20 transition-all">
                {/* Background accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)]/10 rounded-full blur-[50px] -mr-16 -mt-16 transition-opacity group-hover:bg-[var(--primary)]/20" />

                {/* Quote Icon */}
                <div className="text-5xl text-[var(--primary)]/40 font-serif leading-none mb-2">"</div>

                {/* Testimonial Text */}
                <p className="text-[15px] text-white/80 font-medium mb-6 leading-relaxed flex-1 relative z-10">{t.text}</p>

                {/* User Info */}
                <div className="flex items-center gap-3 mt-auto pt-4 border-t border-white/10 relative z-10">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-lg shadow-[var(--primary)]/30">
                    {t.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-white truncate">{t.name}</div>
                    <div className="text-xs text-[var(--success)] font-medium">Earned {t.amount}</div>
                  </div>
                  <div className="flex text-amber-500 gap-0.5 shrink-0">
                    {[1, 2, 3, 4, 5].map(s => <Star key={s} size={12} fill="currentColor" />)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Landing Page Component for non-authenticated users
function LandingPage() {
  const router = useRouter();
  const [liveCounter, setLiveCounter] = useState(2547892);

  // Animate the live counter
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveCounter(prev => prev + Math.floor(Math.random() * 5) + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: Play,
      title: 'Watch & Earn',
      description: 'Watch short ads and videos to earn instant rewards',
      color: 'from-blue-500 to-cyan-500',
      amount: '$0.10 - $0.50'
    },
    {
      icon: Target,
      title: 'Complete Tasks',
      description: 'Simple tasks that take minutes but pay well',
      color: 'from-purple-500 to-pink-500',
      amount: '$0.50 - $5.00'
    },
    {
      icon: Users,
      title: 'Refer Friends',
      description: 'Earn 10% of what your friends earn - forever!',
      color: 'from-orange-500 to-red-500',
      amount: 'Lifetime'
    },
    {
      icon: Shield,
      title: 'Secure Payments',
      description: 'Fast withdrawals to PayPal, Crypto & more',
      color: 'from-green-500 to-emerald-500',
      amount: '24h'
    }
  ];

  const stats = [
    { value: '$2.5M+', label: 'Paid to Users', icon: Wallet },
    { value: '500K+', label: 'Active Users', icon: Globe },
    { value: '4.8★', label: 'User Rating', icon: Award },
    { value: '24/7', label: 'Support', icon: Headset }
  ];

  const testimonials = [
    { name: 'Alex M.', amount: '$1,250', text: "Best earning app I've ever used! Withdrew to PayPal in minutes." },
    { name: 'Sarah K.', amount: '$890', text: 'Love the VIP benefits. Earning 50% more every day!' },
    { name: 'Mike R.', amount: '$2,100', text: 'Referred 20 friends and now earning passively. Amazing!' }
  ];

  const paymentMethods = ['💳 PayPal', '₿ Bitcoin', '📱 JazzCash', '💎 USDT'];

  return (
    <div className="min-h-screen bg-[var(--background)] overflow-x-hidden">
      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--background)]/60 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between px-4 py-3 max-w-6xl mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg border border-white/10 bg-white/5 p-1">
              <img src="/logo.png" alt="PrimeLoot Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">
              PrimeLoot
            </span>
          </div>

          {/* Auth Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
            >
              Login
            </button>
            <button
              onClick={() => router.push('/register')}
              className="px-5 py-2.5 text-sm font-semibold bg-gradient-to-r from-[var(--primary)] to-purple-600 text-white rounded-xl hover:opacity-90 transition-all shadow-lg shadow-[var(--primary)]/25"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 overflow-hidden">
        {/* Animated background gradient orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 -left-20 w-96 h-96 bg-[var(--primary)]/40 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute top-40 -right-20 w-96 h-96 bg-purple-500/30 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-pink-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
        </div>

        <div className="relative z-10 px-6 py-16 text-center max-w-4xl mx-auto">
          {/* Live earnings badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--success)]/10 border border-[var(--success)]/30 text-[var(--success)] text-sm mb-6 animate-pulse">
            <div className="w-2 h-2 rounded-full bg-[var(--success)] animate-ping" />
            <span className="font-medium">${liveCounter.toLocaleString()} earned by users</span>
          </div>

          {/* Hero Text */}
          <h1 className="text-5xl md:text-6xl font-black mb-6 leading-[1.1]">
            <span className="text-white">Turn Your</span>
            <br />
            <span className="bg-gradient-to-r from-[var(--primary)] via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Time Into Money
            </span>
          </h1>

          <p className="text-white/60 text-lg md:text-xl mb-8 max-w-xl mx-auto leading-relaxed">
            Complete simple tasks, watch videos, and earn <span className="text-white font-semibold">real money</span>.
            Withdraw anytime to PayPal, Crypto, or Mobile Money.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <button
              onClick={() => router.push('/register')}
              className="group relative px-8 py-4 rounded-2xl text-lg font-bold overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary)] via-purple-500 to-pink-500 group-hover:opacity-90 transition-opacity" />
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary)] via-purple-500 to-pink-500 blur-xl opacity-50 group-hover:opacity-70 transition-opacity" />
              <span className="relative flex items-center justify-center gap-2 text-white">
                <Sparkles size={20} />
                Start Earning Free
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
            <button
              onClick={() => router.push('/login')}
              className="px-8 py-4 rounded-2xl text-lg font-semibold bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all backdrop-blur-sm"
            >
              I Have an Account
            </button>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-4 text-sm text-white/50">
            <span className="flex items-center gap-1">
              <Check size={16} className="text-[var(--success)]" />
              No credit card required
            </span>
            <span className="flex items-center gap-1">
              <Check size={16} className="text-[var(--success)]" />
              Start earning in 2 min
            </span>
            <span className="flex items-center gap-1">
              <Check size={16} className="text-[var(--success)]" />
              100% Free to join
            </span>
          </div>
        </div>

        {/* Floating payment methods */}
        <div className="relative z-10 px-2 sm:px-4 pb-8 w-full max-w-full">
          <div className="flex justify-center items-center gap-1.5 sm:gap-3 flex-nowrap w-full">
            {paymentMethods.map((method, i) => (
              <span
                key={i}
                className="px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white/5 border border-white/10 text-[10px] sm:text-sm font-medium text-white/80 backdrop-blur-sm whitespace-nowrap shadow-lg shadow-black/20"
              >
                {method}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Animated Marquee Section */}
      <LivePayoutsMarquee />

      {/* Stats Section - Compact Dashboard Style */}
      <section className="px-4 py-8 relative">
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {stats.map((stat, i) => (
              <div 
                key={i} 
                className="group p-3 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-3 sm:gap-4 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300"
              >
                {/* Soft Icon Container */}
                <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 group-hover:bg-[var(--primary)]/20">
                  <stat.icon className="text-[var(--primary)] w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />
                </div>

                {/* Text Content */}
                <div className="flex flex-col min-w-0 flex-1 justify-center">
                  <div className="text-[17px] sm:text-xl font-bold text-white tracking-tight leading-none mb-1 whitespace-nowrap">
                    {stat.value}
                  </div>
                  <div className="text-[8.5px] sm:text-[10px] font-bold text-white/40 uppercase tracking-widest leading-tight group-hover:text-white/60 transition-colors">
                    {stat.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-3 text-white">
            How It Works
          </h2>
          <p className="text-center text-white/50 mb-10 max-w-md mx-auto">
            Simple ways to earn money online, no experience required
          </p>

          <div className="w-full overflow-hidden relative">
            <div className="flex w-max animate-marquee gap-4 pb-8 hover:[animation-play-state:paused] px-2">
              {[...features, ...features].map((feature, i) => (
                <div
                  key={i}
                  className="w-[85vw] max-w-[320px] shrink-0 group p-6 rounded-3xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 hover:border-white/20 transition-all cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-[50px] -mr-16 -mt-16 transition-opacity group-hover:bg-white/10" />
                  
                  <div className="flex flex-col gap-4 h-full relative z-10">
                    <div className="flex items-start justify-between mb-2">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg shadow-black/20`}>
                        <feature.icon className="text-white" size={28} />
                      </div>
                      <span className="text-[11px] font-bold text-[var(--success)] bg-[var(--success)]/10 px-3 py-1.5 rounded-full uppercase tracking-wider">
                        {feature.amount}
                      </span>
                    </div>
                    <div className="flex-1 flex flex-col">
                      <h3 className="font-bold text-xl text-white mb-2">{feature.title}</h3>
                      <p className="text-sm text-white/60 leading-relaxed mt-auto">{feature.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* VIP Section - Premium Design */}
      <section className="px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="relative p-8 rounded-3xl bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-orange-500/20 border border-amber-500/30 overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/20 rounded-full blur-[100px]" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-orange-500/20 rounded-full blur-[100px]" />

            <div className="relative z-10">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1 text-center md:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-500 text-sm mb-4">
                    <Crown size={16} />
                    <span className="font-semibold">VIP MEMBERSHIP</span>
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-3">Earn 50% More</h3>
                  <p className="text-white/60 mb-6">
                    Unlock unlimited tasks, priority support, and exclusive high-paying offers.
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {['Unlimited tasks', '+50% earnings', 'Priority support', 'Exclusive offers'].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-white/80">
                        <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center">
                          <Check size={12} className="text-amber-500" />
                        </div>
                        {item}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => router.push('/register')}
                    className="w-full md:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-lg hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/25"
                  >
                    Start Free Trial →
                  </button>
                </div>
                <div className="hidden md:block">
                  <div className="w-48 h-48 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                    <Crown size={80} className="text-amber-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials - Auto Rotating Carousel */}
      <TestimonialCarousel testimonials={testimonials} />

      {/* Final CTA */}
      <section className="px-4 pt-16 pb-8 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="text-6xl mb-6">🚀</div>
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Start Earning?
          </h3>
          <p className="text-white/50 text-lg mb-8">
            Join 500,000+ users already earning with PrimeLoot
          </p>
          <button
            onClick={() => router.push('/register')}
            className="px-12 py-5 rounded-2xl text-xl font-bold bg-gradient-to-r from-[var(--primary)] via-purple-500 to-pink-500 text-white hover:opacity-90 transition-opacity shadow-2xl shadow-[var(--primary)]/30 hover:scale-105 transform"
          >
            Create Free Account
          </button>
          <p className="text-sm text-white/40 mt-6">
            No credit card required • Instant setup • 100% free
          </p>
        </div>
      </section>

      {/* Sleek Minimal Footer */}
      <footer className="relative border-t border-white/5 bg-[#05050a] pt-12 pb-8 overflow-hidden">
        {/* Soft bottom glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80vw] h-[300px] bg-[var(--primary)]/5 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-4xl mx-auto px-6 relative z-10 flex flex-col items-center text-center">
          
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-purple-600 flex items-center justify-center shadow-lg shadow-[var(--primary)]/20">
              <Zap className="text-white w-5 h-5" />
            </div>
            <span className="font-black text-2xl text-white tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-purple-400">GPT</span>Earn
            </span>
          </div>

          {/* Minimal Links */}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 mb-10">
            <a href="#" className="text-sm font-bold text-white/40 hover:text-white transition-colors">How it Works</a>
            <a href="#" className="text-sm font-bold text-white/40 hover:text-white transition-colors">Offerwalls</a>
            <a href="#" className="text-sm font-bold text-white/40 hover:text-white transition-colors">Terms</a>
            <a href="#" className="text-sm font-bold text-white/40 hover:text-white transition-colors">Privacy</a>
            <a href="#" className="text-sm font-bold text-white/40 hover:text-white transition-colors">Support</a>
          </div>

          {/* Divider */}
          <div className="w-24 h-[2px] bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8" />

          {/* Socials & Copyright */}
          <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-6">
            <p className="text-[10px] sm:text-xs text-white/30 font-black tracking-[0.2em] uppercase">
              © {new Date().getFullYear()} PrimeLoot.
            </p>
            <div className="flex items-center gap-5 text-white/30">
              <a href="#" className="hover:text-[var(--primary)] hover:scale-110 transition-all"><Globe size={18} /></a>
              <a href="#" className="hover:text-[var(--primary)] hover:scale-110 transition-all"><Shield size={18} /></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Dashboard Component for authenticated users
function Dashboard() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (token) {
      loadDashboard();
    }
  }, [token]);

  const loadDashboard = async () => {
    try {
      const data = await api.getDashboard(token!);
      setDashboard(data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const quickActions = [
    { icon: Target, label: 'Tasks', count: dashboard?.availableTasks || 0, href: '/earn', color: 'gradient-primary' },
    { icon: Users, label: 'Referrals', count: dashboard?.referralCount || 0, href: '/referrals', color: 'gradient-success' },
    { icon: Crown, label: 'VIP', count: dashboard?.isVIP ? '✓' : '→', href: '/vip', color: 'gradient-gold' },
    { icon: Wallet, label: 'Withdraw', count: null, href: '/withdraw', color: 'gradient-danger' },
  ];

  return (
    <div className="mobile-container">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--background)]/80 backdrop-blur-lg border-b border-[var(--card-border)]">
        <div className="flex items-center justify-between p-4">
          <div>
            <p className="text-sm text-[var(--muted)]">Welcome back,</p>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{user?.username || 'User'}</h1>
              {dashboard?.isVIP && <VIPBadge name={dashboard.vip?.name} size="sm" />}
            </div>
          </div>
          <button
            onClick={() => router.push('/notifications')}
            className="relative p-2 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)]"
          >
            <Bell size={20} />
            {dashboard?.unreadNotifications ? (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {dashboard.unreadNotifications > 9 ? '9+' : dashboard.unreadNotifications}
              </span>
            ) : null}
          </button>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Balance Cards */}
        <section>
          {isLoadingData ? (
            <div className="grid grid-cols-2 gap-3">
              <BalanceCardSkeleton />
              <BalanceCardSkeleton />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <BalanceCard
                icon={Wallet}
                label="Balance"
                value={`${(dashboard?.balance ?? 0).toFixed(2)} Coins`}
                trend={dashboard?.todayEarned ? `+${dashboard.todayEarned.toFixed(2)} Coins today` : undefined}
                color="primary"
              />
              <BalanceCard
                icon={TrendingUp}
                label="Total Earned"
                value={`${(dashboard?.totalEarned ?? 0).toFixed(2)} Coins`}
                color="success"
              />
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
          <div className="grid grid-cols-4 gap-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => router.push(action.href)}
                className="card p-3 text-center hover:scale-105 transition-transform"
              >
                <div className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center mx-auto mb-2`}>
                  <action.icon size={20} className="text-white" />
                </div>
                <div className="text-xs font-medium">{action.label}</div>
                {action.count !== null && (
                  <div className="text-[10px] text-[var(--muted)]">{action.count}</div>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Today's Progress */}
        <section className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Today's Progress</h2>
            <span className="text-xs text-[var(--muted)]">{dashboard?.completedToday || 0} tasks</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="h-2 bg-[var(--card-border)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((dashboard?.completedToday || 0) / 6 * 100, 100)}%` }}
                />
              </div>
            </div>
            <span className="text-sm font-semibold text-[var(--primary)]">
              {dashboard?.todayEarned?.toFixed(2) || '0.00'} Coins
            </span>
          </div>
        </section>

        {/* Start Earning CTA */}
        <button
          onClick={() => router.push('/earn')}
          className="w-full card gradient-primary text-white p-4 flex items-center justify-between hover:scale-[1.02] transition-transform"
        >
          <div className="flex items-center gap-3">
            <Zap size={24} />
            <div className="text-left">
              <div className="font-semibold">Start Earning</div>
              <div className="text-xs text-white/70">{dashboard?.availableTasks || 0} tasks available</div>
            </div>
          </div>
          <ChevronRight size={24} />
        </button>

        {/* VIP Promo (if not VIP) */}
        {!dashboard?.isVIP && (
          <button
            onClick={() => router.push('/vip')}
            className="w-full card bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/30 p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Crown className="text-amber-500" size={24} />
              <div className="text-left">
                <div className="font-semibold">Upgrade to VIP</div>
                <div className="text-xs text-[var(--muted)]">Earn 50% more on every task</div>
              </div>
            </div>
            <ChevronRight className="text-amber-500" size={24} />
          </button>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

export default function HomePage() {
  const { isLoading, isAuthenticated } = useAuth();

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="mobile-container flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  // Show landing page for non-authenticated users
  if (!isAuthenticated) {
    return <LandingPage />;
  }

  // Show dashboard for authenticated users
  return <Dashboard />;
}
