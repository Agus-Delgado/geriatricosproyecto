import React, { useState, useEffect } from 'react';
import { useFacility } from '../contexts/FacilityContext';
import { financeApi } from '../api/finance';
import { BottomNav } from '../components/layout/BottomNav';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Modal } from '../components/ui/Modal';
import { FinanceTransactionForm } from '../components/forms/FinanceTransactionForm';
import type { FinanceSummary, FinanceTransaction } from '../types/finance';
import type { ApiError } from '../api/client';

export const FinancePage: React.FC = () => {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState(
    new Date().toISOString().slice(0, 7) // YYYY-MM format
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { facility } = useFacility();

  useEffect(() => {
    if (facility) {
      loadData();
    }
  }, [facility, month]);

  const loadData = async () => {
    if (!facility) return;

    try {
      setLoading(true);
      setError(null);

      const [summaryData, transactionsData] = await Promise.all([
        financeApi.getSummary(facility.id, month),
        financeApi.listTransactions(facility.id, {
          from_date: `${month}-01`,
          to_date: `${month}-31`,
        }),
      ]);

      setSummary(summaryData);
      setTransactions(
        transactionsData.sort(
          (a, b) =>
            new Date(b.occurred_on).getTime() - new Date(a.occurred_on).getTime()
        )
      );
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al cargar datos financieros');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransaction = async (data: any) => {
    try {
      await financeApi.createTransaction(data);
      setShowCreateModal(false);
      loadData();
    } catch (err) {
      const apiError = err as ApiError;
      throw new Error(apiError.detail || 'Error al crear transacción');
    }
  };

  const formatCurrency = (amount: number, currency: string = 'ARS') => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="px-4 py-4 space-y-4">
        <Input
          label="Mes"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />

        {error && (
          <ErrorMessage message={error} onDismiss={() => setError(null)} />
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {summary && (
              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-4">Resumen del Mes</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Ingresos:</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(summary.total_income)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Gastos:</span>
                    <span className="font-semibold text-red-600">
                      {formatCurrency(summary.total_expenses)}
                    </span>
                  </div>
                  <div className="border-t border-gray-200 pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-900">Balance:</span>
                      <span
                        className={`font-bold text-lg ${
                          summary.balance >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {formatCurrency(summary.balance)}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 mt-2">
                    {summary.transaction_count} transacciones
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Transacciones</h3>
              <Button onClick={() => setShowCreateModal(true)}>
                Nueva Transacción
              </Button>
            </div>

            {transactions.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No hay transacciones registradas para este mes
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="card">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold text-gray-900">
                            {transaction.category_name}
                          </h4>
                          <span
                            className={`px-2 py-1 text-xs rounded ${
                              transaction.type === 'INCOME'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {transaction.type === 'INCOME' ? 'Ingreso' : 'Gasto'}
                          </span>
                        </div>
                        {transaction.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {transaction.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(transaction.occurred_on)} •{' '}
                          {transaction.payment_method}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-semibold ${
                            transaction.type === 'INCOME'
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {transaction.type === 'INCOME' ? '+' : '-'}
                          {formatCurrency(transaction.amount, transaction.currency)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {facility && (
        <div className="fixed bottom-24 right-4 z-30">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary-600 text-white rounded-full p-4 shadow-lg hover:bg-primary-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      )}

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nueva Transacción"
        size="lg"
      >
        {facility && (
          <FinanceTransactionForm
            facilityId={facility.id}
            onSubmit={handleCreateTransaction}
            onCancel={() => setShowCreateModal(false)}
          />
        )}
      </Modal>

      <BottomNav />
    </div>
  );
};
