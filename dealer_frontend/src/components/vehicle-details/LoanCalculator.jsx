import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const LoanCalculator = ({ defaultPrice, vehicleTitle, vehicleId }) => {
  const [price, setPrice] = useState(defaultPrice || 10000);
  const [downPayment, setDownPayment] = useState(1000);
  const [rate, setRate] = useState(5); // Interest rate %
  const [term, setTerm] = useState(12); // Months
  const [monthlyPayment, setMonthlyPayment] = useState(0);

  // Calculate whenever inputs change
  useEffect(() => {
    const principal = price - downPayment;
    const monthlyRate = rate / 100 / 12;
    
    if (principal <= 0) {
      setMonthlyPayment(0);
      return;
    }

    if (rate === 0) {
      setMonthlyPayment(principal / term);
    } else {
      // Amortization Formula
      const payment = (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -term));
      setMonthlyPayment(payment);
    }
  }, [price, downPayment, rate, term]);

  return (
    <div id="calculator" className="scroll-mt-24 rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
      <h3 className="mb-6 text-xl font-bold text-gray-900">Auto Loan Calculator</h3>
      <p className="mb-6 text-sm text-gray-500">Use our calculator to estimate your monthly car payments.</p>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs font-bold text-gray-900">Total Price</label>
          <div className="relative">
             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
             <input 
                type="number" 
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 py-3 pl-8 pr-4 text-sm focus:border-brand-600 focus:outline-none"
             />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold text-gray-900">Interest Rate (%)</label>
          <input 
            type="number" 
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-200 py-3 px-4 text-sm focus:border-brand-600 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold text-gray-900">Down Payment</label>
          <div className="relative">
             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
             <input 
                type="number" 
                value={downPayment}
                onChange={(e) => setDownPayment(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 py-3 pl-8 pr-4 text-sm focus:border-brand-600 focus:outline-none"
             />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold text-gray-900">Duration (Months)</label>
          <select 
            value={term}
            onChange={(e) => setTerm(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-200 py-3 px-4 text-sm focus:border-brand-600 focus:outline-none"
          >
            <option value="12">12 Months</option>
            <option value="24">24 Months</option>
            <option value="36">36 Months</option>
            <option value="48">48 Months</option>
            <option value="60">60 Months</option>
          </select>
        </div>
      </div>

      <div className="mt-8">
        <p className="mb-1 text-sm font-bold text-gray-900">Monthly Payment</p>
        <p className="text-2xl font-bold text-brand-600">${monthlyPayment.toFixed(2)}</p>
      </div>

      <Link
        to="/financing"
        state={{ preselectedVehicleId: vehicleId }}
        className="mt-6 block w-full rounded-lg bg-brand-600 py-4 text-center font-bold text-white transition hover:bg-brand-700"
      >
        Apply for a Loan
      </Link>
    </div>
  );
};

export default LoanCalculator;