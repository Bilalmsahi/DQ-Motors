import { useState, useMemo } from 'react';

const LoanCalculatorSection = () => {
  const [totalPrice, setTotalPrice] = useState(10000);
  const [downPayment, setDownPayment] = useState(3000);
  const [interestRate, setInterestRate] = useState(5);
  const [amortizationPeriod, setAmortizationPeriod] = useState(36);

  // Calculate monthly payment
  const monthlyPayment = useMemo(() => {
    const principal = totalPrice - downPayment;
    if (principal <= 0) return 0;
    
    const monthlyRate = interestRate / 100 / 12;
    if (monthlyRate === 0) {
      return principal / amortizationPeriod;
    }
    
    const payment =
      (principal * monthlyRate * Math.pow(1 + monthlyRate, amortizationPeriod)) /
      (Math.pow(1 + monthlyRate, amortizationPeriod) - 1);
    
    return payment;
  }, [totalPrice, downPayment, interestRate, amortizationPeriod]);

  return (
    <section className="relative py-16 md:py-20 overflow-hidden rounded-3xl my-6 shadow-lg">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?q=80&w=2070&auto=format&fit=crop"
          alt="Car Background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-transparent"></div>
      </div>

      <div className="px-4 sm:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Calculator Form */}
          <div className="w-full lg:w-1/2 max-w-xl">
            <div className="bg-white rounded-3xl p-8 shadow-2xl ring-1 ring-gray-100">
              <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-2">
                Auto Loan Calculator
              </h2>
              <p className="text-gray-500 mb-8">
                Use our calculator to estimate your monthly car payments.
              </p>

              {/* Total Price */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Total Price
                </label>
                <input
                  type="number"
                  value={totalPrice}
                  onChange={(e) => setTotalPrice(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-700 focus:border-brand-600 focus:outline-none"
                />
              </div>

              {/* Down Payment & Amortization */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Down payment
                  </label>
                  <input
                    type="number"
                    value={downPayment}
                    onChange={(e) => setDownPayment(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-700 focus:border-brand-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Amortization Period (months)
                  </label>
                  <select
                    value={amortizationPeriod}
                    onChange={(e) => setAmortizationPeriod(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-700 focus:border-brand-600 focus:outline-none"
                  >
                    <option value={12}>12 months</option>
                    <option value={24}>24 months</option>
                    <option value={36}>36 months</option>
                    <option value={48}>48 months</option>
                    <option value={60}>60 months</option>
                    <option value={72}>72 months</option>
                  </select>
                </div>
              </div>

              {/* Interest Rate */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Interest rate
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-700 focus:border-brand-600 focus:outline-none"
                />
              </div>

              {/* Results */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Down payment amount</span>
                  <span className="font-semibold text-gray-900">
                    ${downPayment.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Monthly payment</span>
                  <span className="font-medium text-brand-600 text-lg">
                    ${monthlyPayment.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Apply Button */}
              <button className="w-full rounded-lg bg-brand-600 py-4 font-semibold text-white transition hover:bg-brand-700 font-metro">
                Apply for a loan
              </button>
            </div>
          </div>

          {/* Right side - empty for the background image to show */}
          <div className="hidden lg:block lg:w-1/2"></div>
        </div>
      </div>
    </section>
  );
};

export default LoanCalculatorSection;

