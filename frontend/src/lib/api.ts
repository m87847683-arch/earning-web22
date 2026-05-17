const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface FetchOptions extends RequestInit {
    token?: string;
}

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

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private async request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
        const { token, ...fetchOptions } = options;

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        };

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...fetchOptions,
            headers,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Something went wrong');
        }

        return data;
    }

    // Auth endpoints
    async register(email: string, username: string, password: string, referralCode?: string, deviceId?: string) {
        return this.request<{ token?: string; user?: any; message: string; requiresVerification?: boolean }>('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, username, password, referralCode, deviceId }),
        });
    }

    async login(email: string, password: string) {
        return this.request<{ token: string; user: any }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
    }

    async verifyEmail(email: string, token: string) {
        return this.request('/auth/verify-email', {
            method: 'POST',
            body: JSON.stringify({ email, token }),
        });
    }

    async forgotPassword(email: string) {
        return this.request('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
    }

    async resetPassword(token: string, password: string) {
        return this.request('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, password }),
        });
    }

    // User endpoints
    async getProfile(token: string) {
        return this.request<any>('/user/profile', { token });
    }

    async getDashboard(token: string) {
        return this.request<DashboardData>('/user/dashboard', { token });
    }

    async updateProfile(token: string, data: { username: string }) {
        return this.request('/user/profile', {
            method: 'PUT',
            token,
            body: JSON.stringify(data),
        });
    }

    // Task endpoints
    async getTasks(token: string, type?: string) {
        const query = type ? `?type=${type}` : '';
        return this.request<any[]>(`/tasks${query}`, { token });
    }

    async getTask(token: string, id: string) {
        return this.request<any>(`/tasks/${id}`, { token });
    }

    async startTask(token: string, id: string) {
        return this.request<{ token: string }>(`/tasks/${id}/start`, {
            method: 'POST',
            token,
        });
    }

    async completeTask(token: string, id: string, answer?: string, verificationToken?: string) {
        return this.request<{ reward: number; bonus: number; isVIP: boolean }>(`/tasks/${id}/complete`, {
            method: 'POST',
            token,
            body: JSON.stringify({ answer, token: verificationToken }),
        });
    }

    async getTaskStatus(token: string, id: string) {
        return this.request<any>(`/tasks/${id}/status`, { token });
    }

    // VIP endpoints
    async getVIPPlans() {
        return this.request<any[]>('/vip/plans');
    }

    async getVIPStatus(token: string) {
        return this.request<any>('/vip/status', { token });
    }

    async subscribeVIP(token: string, planId: number, paymentMethod: string, paymentReference?: string) {
        return this.request<any>('/vip/subscribe', {
            method: 'POST',
            token,
            body: JSON.stringify({ planId, paymentMethod, paymentReference }),
        });
    }

    // Referral endpoints
    async getReferralLink(token: string) {
        return this.request<{ referralCode: string; referralLink: string }>('/referrals/link', { token });
    }

    async getReferralStats(token: string) {
        return this.request<{ totalReferrals: number; activeReferrals: number; totalEarned: number; pendingEarnings: number }>('/referrals/stats', { token });
    }

    async getReferralList(token: string, page = 1) {
        return this.request<{ referrals: any[]; pagination: any }>(`/referrals/list?page=${page}`, { token });
    }

    // Withdrawal endpoints
    async getWithdrawalInfo(token: string) {
        return this.request<{ balance: number; minWithdrawal: number; maxWithdrawal: number; feePercent: number; methods: any[]; coinExchangeRate: number }>('/withdrawals/info', { token });
    }

    async calculateWithdrawalFee(token: string, amount: number) {
        return this.request<{ amount: number; fee: number; feePercent: number; netAmount: number }>('/withdrawals/calculate', {
            method: 'POST',
            token,
            body: JSON.stringify({ amount }),
        });
    }

    async requestWithdrawal(token: string, amount: number, paymentMethod: string, paymentDetails: any) {
        return this.request<any>('/withdrawals/request', {
            method: 'POST',
            token,
            body: JSON.stringify({ amount, paymentMethod, paymentDetails }),
        });
    }

    async getWithdrawalHistory(token: string, page = 1) {
        return this.request<any>(`/withdrawals/history?page=${page}`, { token });
    }

    async cancelWithdrawal(token: string, id: string) {
        return this.request(`/withdrawals/${id}/cancel`, {
            method: 'POST',
            token,
        });
    }

    // Notification endpoints
    async getNotifications(token: string, page = 1) {
        return this.request<{ notifications: any[]; pagination: any }>(`/notifications?page=${page}`, { token });
    }

    async markNotificationRead(token: string, id: string) {
        return this.request(`/notifications/${id}/read`, {
            method: 'POST',
            token,
        });
    }

    async markAllNotificationsRead(token: string) {
        return this.request('/notifications/read-all', {
            method: 'POST',
            token,
        });
    }
}

export const api = new ApiClient(API_URL);
