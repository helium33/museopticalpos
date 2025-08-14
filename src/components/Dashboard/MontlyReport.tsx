import React from 'react';
import { BarChart3, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { DashboardStats } from '../../types/transaction';
import { formatCurrency, getMonthName } from '../../lib/utils';
import StatsCard from './StatsCard';

interface MonthlyReportProps {
  stats: DashboardStats;
}

const MonthlyReport: React.FC<MonthlyReportProps> = ({ stats }) => {
  const sortedMonths = Object.keys(stats.monthlyStats).sort().reverse();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Monthly Reports</h2>
      </div>

      {sortedMonths.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No monthly data available</h3>
          <p className="text-gray-500">Add some transactions to see monthly reports</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedMonths.map((monthKey) => {
            const monthData = stats.monthlyStats[monthKey];
            const monthName = getMonthName(monthKey);
            
            return (
              <div key={monthKey} className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{monthName}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <StatsCard
                    title="Monthly Income"
                    value={formatCurrency(monthData.income)}
                    icon={TrendingUp}
                    color="green"
                  />
                  <StatsCard
                    title="Monthly Expenses"
                    value={formatCurrency(monthData.expenses)}
                    icon={TrendingDown}
                    color="red"
                  />
                  <StatsCard
                    title="Monthly Balance"
                    value={formatCurrency(monthData.balance)}
                    icon={BarChart3}
                    color={monthData.balance >= 0 ? 'green' : 'red'}
                  />
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Income vs Expenses</span>
                    <span>{((monthData.income / (monthData.income + monthData.expenses)) * 100).toFixed(1)}% income</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-green-500 h-3 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${(monthData.income / (monthData.income + monthData.expenses)) * 100}%` 
                      }}
                    />
                  </div>
                </div>

                {/* Savings Rate */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Savings Rate</span>
                    <span className={`text-sm font-bold ${
                      monthData.balance >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {monthData.income > 0 ? ((monthData.balance / monthData.income) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MonthlyReport;