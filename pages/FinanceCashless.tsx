import React from 'react';
import { CreditCard } from 'lucide-react';
import FinancePageCore from '../components/FinancePageCore';

const FinanceCashless: React.FC = () => (
  <FinancePageCore
    paymentMethod="cashless"
    title="Финансы (безнал)"
    icon={<CreditCard className="text-blue-600" />}
  />
);

export default FinanceCashless;
