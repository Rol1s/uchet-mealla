import React from 'react';
import { Banknote } from 'lucide-react';
import FinancePageCore from '../components/FinancePageCore';

const FinanceCash: React.FC = () => (
  <FinancePageCore
    paymentMethod="cash"
    title="Финансы (наличные)"
    icon={<Banknote className="text-green-600" />}
  />
);

export default FinanceCash;
