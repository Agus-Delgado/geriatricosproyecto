import React, { useState, useEffect } from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { financeApi } from '../../api/finance';
import type { FinanceTransactionCreate, FinanceCategory } from '../../types/finance';

interface FinanceTransactionFormProps {
  facilityId: string;
  onSubmit: (data: FinanceTransactionCreate) => Promise<void>;
  onCancel: () => void;
}

export const FinanceTransactionForm: React.FC<FinanceTransactionFormProps> = ({
  facilityId,
  onSubmit,
  onCancel,
}) => {
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [formData, setFormData] = useState({
    category_id: '',
    type: 'EXPENSE',
    amount: '',
    currency: 'ARS',
    payment_method: 'CASH',
    occurred_on: new Date().toISOString().split('T')[0],
    description: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    loadCategories();
  }, [formData.type]);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const data = await financeApi.listCategories(formData.type);
      setCategories(data);
      if (data.length > 0 && !formData.category_id) {
        setFormData({ ...formData, category_id: data[0].id });
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.category_id) {
      newErrors.category_id = 'La categoría es requerida';
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'El monto debe ser mayor a 0';
    }
    if (!formData.occurred_on) {
      newErrors.occurred_on = 'La fecha es requerida';
    } else {
      // Validar que la fecha no sea muy futura (máximo 1 año)
      const occurredDate = new Date(formData.occurred_on);
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 1);
      if (occurredDate > maxDate) {
        newErrors.occurred_on = 'La fecha no puede ser más de un año en el futuro';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});
    try {
      await onSubmit({
        facility_id: facilityId,
        category_id: formData.category_id,
        type: formData.type,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        payment_method: formData.payment_method,
        occurred_on: formData.occurred_on,
        description: formData.description || undefined,
      });
    } catch (error: any) {
      // Manejar errores de validación del backend
      if (error?.detail) {
        setErrors({ submit: error.detail });
      } else {
        setErrors({ submit: 'Error al crear la transacción' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label="Tipo *"
        value={formData.type}
        onChange={(e) => {
          setFormData({ ...formData, type: e.target.value, category_id: '' });
        }}
        options={[
          { value: 'EXPENSE', label: 'Gasto' },
          { value: 'INCOME', label: 'Ingreso' },
        ]}
        disabled={loading}
      />

      <Select
        label="Categoría *"
        value={formData.category_id}
        onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
        options={categories.map((cat) => ({
          value: cat.id,
          label: cat.name,
        }))}
        error={errors.category_id}
        disabled={loading || loadingCategories}
        placeholder="Cargando categorías..."
      />

      <Input
        label="Monto *"
        type="number"
        step="0.01"
        min="0"
        value={formData.amount}
        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
        error={errors.amount}
        disabled={loading}
      />

      <Select
        label="Moneda"
        value={formData.currency}
        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
        options={[
          { value: 'ARS', label: 'ARS - Peso Argentino' },
          { value: 'USD', label: 'USD - Dólar' },
        ]}
        disabled={loading}
      />

      <Select
        label="Método de Pago"
        value={formData.payment_method}
        onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
        options={[
          { value: 'CASH', label: 'Efectivo' },
          { value: 'TRANSFER', label: 'Transferencia' },
          { value: 'CARD', label: 'Tarjeta' },
          { value: 'CHECK', label: 'Cheque' },
        ]}
        disabled={loading}
      />

      <Input
        label="Fecha *"
        type="date"
        value={formData.occurred_on}
        onChange={(e) => setFormData({ ...formData, occurred_on: e.target.value })}
        error={errors.occurred_on}
        disabled={loading}
      />

      <div>
        <label className="label">Descripción</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="input-field"
          rows={3}
          disabled={loading}
        />
      </div>

      {errors.submit && (
        <div className="text-sm text-red-600">{errors.submit}</div>
      )}

      <div className="flex space-x-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} fullWidth disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" fullWidth disabled={loading}>
          {loading ? 'Guardando...' : 'Crear Transacción'}
        </Button>
      </div>
    </form>
  );
};
