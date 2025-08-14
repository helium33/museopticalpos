export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: 'daily-cash' | 'monthly-cash' | 'daily-kapy' | 'monthly-kapy';
  description: string;
  amount: number;
  paymentMode: string;
  date: string;
  location?: 'win' | 'pwint' | 'yangon';
  reference?: string;
  notes?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardStats {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  dailyCash: number;
  monthlyCash: number;
  dailyKapy: number;
  monthlyKapy: number;
  monthlyStats: Record<string, {
    income: number;
    expenses: number;
    balance: number;
  }>;
}

export interface VocData {
  vocNumber: string;
  location: 'win' | 'pwint' | 'yangon';
  category: 'kkt' | 'other';
  quantity: number;
  price: number;
  hasError: boolean;
  errorType?: 'wrong_output' | 'machine_error' | 'quality_issue';
  errorRate?: number;
  errorDescription?: string;
}