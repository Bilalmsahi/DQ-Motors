import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Car,
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  Upload,
  Plus,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  Receipt,
  Calculator,
  ExternalLink,
  Trash2,
  Edit3,
  ChevronDown,
  Eye,
  Sparkles
} from 'lucide-react';
import api from '../../services/api';
import FilePreviewModal from '../../components/common/FilePreviewModal';
import { useConfig } from '../../context/ConfigContext';

// Expense category configuration
const CATEGORY_CONFIG = {
  PURCHASE_PRICE: { label: 'Purchase Price', color: 'bg-blue-100 text-blue-700', icon: '💰' },
  TAX: { label: 'Tax & Registration', color: 'bg-purple-100 text-purple-700', icon: '📋' },
  REPAIR: { label: 'Repair & Maintenance', color: 'bg-red-100 text-red-700', icon: '🔧' },
  TRANSPORT: { label: 'Transport/Shipping', color: 'bg-amber-100 text-amber-700', icon: '🚚' },
  INSPECTION: { label: 'Inspection', color: 'bg-green-100 text-green-700', icon: '🔍' },
  DETAIL: { label: 'Detailing', color: 'bg-cyan-100 text-cyan-700', icon: '✨' },
  OTHER: { label: 'Other', color: 'bg-gray-100 text-gray-700', icon: '📦' },
};

const AdminFinancials = () => {
  const { config } = useConfig();
  const defaultTaxRate = Number(config?.default_purchase_tax_rate ?? 5);
  const invoiceOcrEnabled = config?.enable_invoice_ocr !== false;

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef(null);

  // All Vehicles (initial list)
  const [allVehicles, setAllVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  // Selected Vehicle State
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [financialData, setFinancialData] = useState(null);
  const [loadingFinancials, setLoadingFinancials] = useState(false);

  // Expense Form State
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: 'REPAIR',
    amount: '',
    vendor_name: '',
    description: '',
    invoice_file: null,
    vendor: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [vendors, setVendors] = useState([]);

  // Price editing
  const [editingPrice, setEditingPrice] = useState(false);
  const [newPrice, setNewPrice] = useState('');

  // Purchase price section
  const [purchaseForm, setPurchaseForm] = useState({
    amount: '',
    invoice_file: null,
    vendor_name: '',
    apply_tax: true,
    tax_rate: String(defaultTaxRate),
    tax_amount: '',
  });
  const [purchaseSubmitting, setPurchaseSubmitting] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(false);
  const [scanningInvoice, setScanningInvoice] = useState(false);
  const [invoiceSuggestions, setInvoiceSuggestions] = useState(null);

  // File preview state
  const [previewFile, setPreviewFile] = useState(null);

  // Tax suggestion state
  const [showTaxSuggestion, setShowTaxSuggestion] = useState(false);
  const [suggestedTax, setSuggestedTax] = useState({ amount: '', rate: defaultTaxRate });

  const resetPurchaseForm = () => {
    setPurchaseForm({
      amount: '',
      invoice_file: null,
      vendor_name: '',
      apply_tax: true,
      tax_rate: String(defaultTaxRate),
      tax_amount: '',
    });
    setInvoiceSuggestions(null);
  };

  // Load all vehicles on mount (newest-first so recently acquired show up top)
  useEffect(() => {
    const fetchAllVehicles = async () => {
      setLoadingVehicles(true);
      try {
        const data = await api.get('/inventory/vehicles/?ordering=-created_at&page_size=500');
        setAllVehicles(data.results || data || []);
      } catch (err) {
        console.error('Failed to load vehicles:', err);
      } finally {
        setLoadingVehicles(false);
      }
    };
    fetchAllVehicles();
  }, []);

  // Search for vehicles
  useEffect(() => {
    const searchVehicles = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const data = await api.get(`/inventory/vehicles/?search=${encodeURIComponent(searchQuery)}&page_size=50`);
        setSearchResults(data.results || data || []);
      } catch (err) {
        console.error('Search failed:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchVehicles, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  // Load financial data for selected vehicle
  const loadFinancialData = async (vehicleId) => {
    setLoadingFinancials(true);
    setError(null);
    try {
      const data = await api.get(`/financials/vehicle/${vehicleId}/summary/`);
      setFinancialData(data);
    } catch (err) {
      setError('Failed to load financial data');
      console.error(err);
    } finally {
      setLoadingFinancials(false);
    }
  };

  // Fetch active vendors for dropdown
  const fetchVendors = async () => {
    try {
      const data = await api.get('/financials/vendors/active/');
      setVendors(data);
    } catch (err) {
      console.error('Failed to fetch vendors:', err);
    }
  };

  // Load vendors on component mount
  useEffect(() => {
    fetchVendors();
  }, []);

  // Select a vehicle
  const handleSelectVehicle = (vehicle) => {
    setSelectedVehicle(vehicle);
    setSearchQuery('');
    setSearchResults([]);
    setNewPrice(vehicle.price);
    resetPurchaseForm();
    loadFinancialData(vehicle.id);
  };

  const calculateTaxAmount = (amount, rate) => {
    const parsedAmount = parseFloat(amount);
    const parsedRate = parseFloat(rate);
    if (!parsedAmount || Number.isNaN(parsedAmount) || Number.isNaN(parsedRate)) return '';
    return (parsedAmount * parsedRate / 100).toFixed(2);
  };

  const handlePurchaseAmountChange = (value) => {
    setPurchaseForm((form) => ({
      ...form,
      amount: value,
      tax_amount: form.apply_tax ? calculateTaxAmount(value, form.tax_rate) : form.tax_amount,
    }));
  };

  const handlePurchaseTaxRateChange = (value) => {
    setPurchaseForm((form) => ({
      ...form,
      tax_rate: value,
      tax_amount: form.apply_tax ? calculateTaxAmount(form.amount, value) : form.tax_amount,
    }));
  };

  const handleScanPurchaseInvoice = async () => {
    if (!selectedVehicle || !purchaseForm.invoice_file) return;

    setScanningInvoice(true);
    setError(null);
    setInvoiceSuggestions(null);

    try {
      const fd = new FormData();
      fd.append('vehicle', selectedVehicle.id);
      fd.append('invoice_file', purchaseForm.invoice_file);
      fd.append('context', 'purchase');

      const result = await api.upload('/financials/invoices/extract/', fd);
      const suggestions = result?.suggestions || {};
      setInvoiceSuggestions(suggestions);

      setPurchaseForm((form) => {
        const suggestedAmount = suggestions.purchase_price ?? suggestions.total_amount ?? form.amount;
        const suggestedTax = suggestions.tax_amount ?? form.tax_amount;
        return {
          ...form,
          amount: suggestedAmount ? String(suggestedAmount) : form.amount,
          vendor_name: suggestions.vendor_name || form.vendor_name,
          tax_amount: suggestedTax ? String(suggestedTax) : form.tax_amount,
          apply_tax: suggestedTax ? true : form.apply_tax,
        };
      });
    } catch (err) {
      setError('Invoice scan failed: ' + err.message);
    } finally {
      setScanningInvoice(false);
    }
  };

  // Save / update the purchase price expense
  const handleSavePurchasePrice = async () => {
    if (!selectedVehicle || !purchaseForm.amount || parseFloat(purchaseForm.amount) <= 0) return;
    setPurchaseSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('amount', purchaseForm.amount);
      fd.append('vendor_name', purchaseForm.vendor_name);
      fd.append('apply_tax', purchaseForm.apply_tax ? 'true' : 'false');
      fd.append('tax_rate', purchaseForm.tax_rate || defaultTaxRate);
      if (purchaseForm.tax_amount) fd.append('tax_amount', purchaseForm.tax_amount);
      if (purchaseForm.invoice_file) fd.append('invoice_file', purchaseForm.invoice_file);

      const updatedSummary = await api.upload(`/financials/vehicle/${selectedVehicle.id}/purchase/`, fd);

      resetPurchaseForm();
      setEditingPurchase(false);
      setFinancialData(updatedSummary);
      setSuccess('Purchase price saved!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to save purchase price: ' + err.message);
    } finally {
      setPurchaseSubmitting(false);
    }
  };

  // Smart Tax Calculation: When Purchase Price amount changes, suggest tax
  const handleAmountChange = (value) => {
    setExpenseForm({ ...expenseForm, amount: value });
    
    // If category is Purchase Price and amount is valid, show tax suggestion
    if (expenseForm.category === 'PURCHASE_PRICE' && value && parseFloat(value) > 0) {
      const taxAmount = (parseFloat(value) * defaultTaxRate / 100).toFixed(2);
      setSuggestedTax({ amount: taxAmount, rate: defaultTaxRate });
      setShowTaxSuggestion(true);
    } else {
      setShowTaxSuggestion(false);
    }
  };

  // Handle category change
  const handleCategoryChange = (category) => {
    setExpenseForm({ ...expenseForm, category });
    
    // Reset tax suggestion if changing away from Purchase Price
    if (category !== 'PURCHASE_PRICE') {
      setShowTaxSuggestion(false);
    } else if (expenseForm.amount && parseFloat(expenseForm.amount) > 0) {
      // Show tax suggestion if switching to Purchase Price with existing amount
      const taxAmount = (parseFloat(expenseForm.amount) * defaultTaxRate / 100).toFixed(2);
      setSuggestedTax({ amount: taxAmount, rate: defaultTaxRate });
      setShowTaxSuggestion(true);
    }
  };

  // Add tax expense after purchase price is logged
  const handleAddTaxExpense = async () => {
    if (!selectedVehicle || !suggestedTax.amount) return;

    try {
      const formData = new FormData();
      formData.append('vehicle', selectedVehicle.id);
      formData.append('category', 'TAX');
      formData.append('amount', suggestedTax.amount);
      formData.append('vendor_name', 'Tax & Registration');
      formData.append('description', `${suggestedTax.rate}% tax on purchase price`);

      await api.upload('/financials/expenses/', formData);
      
      setSuccess('Tax expense added!');
      setShowTaxSuggestion(false);
      loadFinancialData(selectedVehicle.id);
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to add tax expense');
    }
  };

  // Submit expense
  const handleSubmitExpense = async (e) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    setSubmitting(true);
    setError(null);

    // Check if we should prompt for tax after this
    const shouldPromptTax = expenseForm.category === 'PURCHASE_PRICE' && showTaxSuggestion;
    const currentTaxSuggestion = { ...suggestedTax };

    try {
      const formData = new FormData();
      formData.append('vehicle', selectedVehicle.id);
      formData.append('category', expenseForm.category);
      formData.append('amount', expenseForm.amount);
      
      // Use vendor FK if selected, otherwise use vendor_name text
      if (expenseForm.vendor && expenseForm.vendor !== 'other') {
        formData.append('vendor', expenseForm.vendor);
      } else if (expenseForm.vendor_name) {
        formData.append('vendor_name', expenseForm.vendor_name);
      }
      
      formData.append('description', expenseForm.description);
      
      if (expenseForm.invoice_file) {
        formData.append('invoice_file', expenseForm.invoice_file);
      }

      await api.upload('/financials/expenses/', formData);
      
      // Instantly update the financial data in the UI for real-time profit tracking
      if (financialData) {
        const newAmount = parseFloat(expenseForm.amount);
        const basisPrice = Number(financialData.profit_basis_price || financialData.selling_price || 0);
        const newTotalCost = Number(financialData.total_cost || 0) + newAmount;
        const newProfitMargin = basisPrice - newTotalCost;
        const newProfitPercentage = basisPrice ? (newProfitMargin / basisPrice * 100) : 0;
        
        // Update local state immediately for instant UI feedback
        setFinancialData(prev => ({
          ...prev,
          total_cost: newTotalCost,
          profit_margin: newProfitMargin,
          profit_percentage: newProfitPercentage.toFixed(2),
          expense_count: prev.expense_count + 1,
        }));
      }
      
      setSuccess('Expense logged successfully!');
      setExpenseForm({
        category: 'REPAIR',
        amount: '',
        vendor_name: '',
        description: '',
        invoice_file: null,
        vendor: '',
      });
      setShowExpenseForm(false);
      setShowTaxSuggestion(false);
      
      // Reload financial data from server (for complete accuracy)
      loadFinancialData(selectedVehicle.id);

      // If this was a purchase price, prompt to add tax
      if (shouldPromptTax) {
        setTimeout(() => {
          const addTax = window.confirm(
            `Would you like to add a ${currentTaxSuggestion.rate}% tax expense of $${currentTaxSuggestion.amount}?`
          );
          if (addTax) {
            setSuggestedTax(currentTaxSuggestion);
            handleAddTaxExpense();
          }
        }, 500);
      }
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to log expense: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete expense
  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;

    // Find the expense to get its amount for instant UI update
    const expenseToDelete = financialData?.expenses?.find(e => e.id === expenseId);

    try {
      await api.delete(`/financials/expenses/${expenseId}/`);
      
      // Instantly update the financial data in the UI
      if (financialData && expenseToDelete) {
        const deletedAmount = parseFloat(expenseToDelete.amount);
        const basisPrice = Number(financialData.profit_basis_price || financialData.selling_price || 0);
        const newTotalCost = Number(financialData.total_cost || 0) - deletedAmount;
        const newProfitMargin = basisPrice - newTotalCost;
        const newProfitPercentage = basisPrice ? (newProfitMargin / basisPrice * 100) : 0;
        
        setFinancialData(prev => ({
          ...prev,
          total_cost: newTotalCost,
          profit_margin: newProfitMargin,
          profit_percentage: newProfitPercentage.toFixed(2),
          expense_count: prev.expense_count - 1,
          expenses: prev.expenses.filter(e => e.id !== expenseId),
        }));
      }
      
      // Also reload from server for accuracy
      loadFinancialData(selectedVehicle.id);
      setSuccess('Expense deleted!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to delete expense');
    }
  };

  // Update selling price
  const handleUpdatePrice = async () => {
    if (!selectedVehicle || !newPrice) return;

    const updatedPrice = parseFloat(newPrice);

    try {
      await api.patch(`/inventory/vehicles/${selectedVehicle.slug}/`, {
        price: updatedPrice
      });
      setSelectedVehicle({ ...selectedVehicle, price: updatedPrice });
      setEditingPrice(false);
      
      // Instantly update profit in UI
      if (financialData) {
        const newProfitMargin = updatedPrice - Number(financialData.total_cost || 0);
        const newProfitPercentage = updatedPrice ? (newProfitMargin / updatedPrice * 100) : 0;
        
        setFinancialData(prev => ({
          ...prev,
          selling_price: updatedPrice,
          profit_basis_price: updatedPrice,
          profit_margin: newProfitMargin,
          profit_percentage: newProfitPercentage.toFixed(2),
        }));
      }
      
      // Also reload from server
      loadFinancialData(selectedVehicle.id);
      setSuccess('Selling price updated!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to update price');
    }
  };

  // Calculate progress percentage
  const costPercentage = useMemo(() => {
    if (!financialData) return 0;
    const basisPrice = Number(financialData.profit_basis_price || financialData.selling_price || 0);
    if (!basisPrice) return 0;
    const percentage = (Number(financialData.total_cost || 0) / basisPrice) * 100;
    return Math.min(percentage, 100);
  }, [financialData]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Vehicle Financials</h1>
        <p className="text-gray-500 mt-1">Track costs, expenses, and profit margins</p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700">
          <CheckCircle size={20} />
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertCircle size={20} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Section 1: Vehicle Selection */}
      {!selectedVehicle ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Select Vehicle</h2>
            {!loadingVehicles && (
              <span className="text-sm text-gray-400">
                {searchQuery.length >= 2 ? searchResults.length : allVehicles.length} vehicle{(searchQuery.length >= 2 ? searchResults.length : allVehicles.length) !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Search Bar */}
          <div ref={searchRef} className="relative mb-4">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search VIN, make, model, variant, or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-10 py-3 rounded-xl border-2 border-gray-200 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20 transition"
            />
            {isSearching ? (
              <Loader2 size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
            ) : searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Vehicle List */}
          {loadingVehicles ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="animate-spin text-brand-600" />
            </div>
          ) : (() => {
            const displayList = searchQuery.length >= 2 ? searchResults : allVehicles;
            if (displayList.length === 0) {
              return (
                <div className="text-center py-12">
                  <Car size={40} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-gray-500">
                    {searchQuery.length >= 2 ? 'No vehicles match your search' : 'No vehicles found'}
                  </p>
                </div>
              );
            }
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[480px] overflow-y-auto pr-1">
                {displayList.map((vehicle) => {
                  const statusColors = {
                    AVAILABLE: 'bg-green-100 text-green-700',
                    SOLD: 'bg-gray-100 text-gray-500',
                    ACQUIRED: 'bg-blue-100 text-blue-700',
                    IN_PREP: 'bg-amber-100 text-amber-700',
                    RESERVED: 'bg-purple-100 text-purple-700',
                  };
                  const statusClass = statusColors[vehicle.status] || 'bg-gray-100 text-gray-500';
                  return (
                    <button
                      key={vehicle.id}
                      onClick={() => handleSelectVehicle(vehicle)}
                      className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-brand-600 hover:bg-brand-50 transition text-left group"
                    >
                      <div className="w-16 h-12 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                        {vehicle.primary_image ? (
                          <img src={vehicle.primary_image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Car size={20} className="text-gray-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate text-sm group-hover:text-brand-600 transition">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </p>
                        <p className="text-xs text-gray-400 truncate">VIN: {vehicle.vin || '—'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${statusClass}`}>
                            {vehicle.status}
                          </span>
                          <span className="text-xs font-bold text-brand-600">{formatCurrency(vehicle.price)}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })()}
        </div>
      ) : (
        /* Selected Vehicle Banner */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
          <div className="w-16 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
            {selectedVehicle.primary_image ? (
              <img src={selectedVehicle.primary_image} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Car size={20} className="text-gray-300" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">
              {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
            </p>
            <p className="text-sm text-gray-500">VIN: {selectedVehicle.vin}</p>
          </div>
          <button
            onClick={() => {
              setSelectedVehicle(null);
              setFinancialData(null);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={14} />
            Change
          </button>
        </div>
      )}

      {/* Section 1b: Purchase Price — shown as soon as a vehicle is selected */}
      {selectedVehicle && !loadingFinancials && (() => {
        const purchaseExpense = financialData?.expenses?.find(e => e.category === 'PURCHASE_PRICE');
        const isSet = !!purchaseExpense;

        return (
          <div className={`rounded-2xl border shadow-sm p-5 ${isSet ? 'bg-white border-gray-100' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isSet ? 'bg-blue-100' : 'bg-amber-100'}`}>
                  <Receipt size={20} className={isSet ? 'text-blue-600' : 'text-amber-600'} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Purchase Price</p>
                  <p className="text-xs text-gray-500">Dealer cost — used in profit/loss calculation</p>
                </div>
              </div>

              {isSet && !editingPurchase && (
                <div className="flex items-center gap-4">
                  <p className="text-2xl font-bold text-slate-800">{formatCurrency(purchaseExpense.amount)}</p>
                  <div className="flex items-center gap-2">
                    {purchaseExpense.invoice_url && (
                      <button
                        onClick={() => setPreviewFile({ url: purchaseExpense.invoice_url, name: 'Purchase Invoice' })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition-colors"
                      >
                        <Eye size={14} /> View Invoice
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setPurchaseForm({
                          amount: String(purchaseExpense.amount),
                          invoice_file: null,
                          vendor_name: purchaseExpense.vendor_name || '',
                          apply_tax: Number(financialData?.tax_amount || 0) > 0,
                          tax_rate: String(defaultTaxRate),
                          tax_amount: financialData?.tax_amount ? String(financialData.tax_amount) : '',
                        });
                        setInvoiceSuggestions(null);
                        setEditingPurchase(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition-colors"
                    >
                      <Edit3 size={14} /> Edit
                    </button>
                  </div>
                </div>
              )}

              {!isSet && !editingPurchase && (
                <button
                  onClick={() => {
                    resetPurchaseForm();
                    setEditingPurchase(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors"
                >
                  <Plus size={16} /> Record Purchase Price
                </button>
              )}
            </div>

            {/* Inline form */}
            {editingPurchase && (
              <div className="mt-5 pt-5 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Amount ($) *</label>
                  <div className="relative">
                    <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 12500.00"
                      value={purchaseForm.amount}
                      onChange={e => handlePurchaseAmountChange(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20 text-sm"
                    />
                  </div>
                </div>

                {/* Vendor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seller / Vendor</label>
                  <input
                    type="text"
                    placeholder="Auction, seller, or vendor name"
                    value={purchaseForm.vendor_name}
                    onChange={e => setPurchaseForm(f => ({ ...f, vendor_name: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20 text-sm"
                  />
                </div>

                {/* Invoice upload */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Invoice (PDF / Image)</label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <label className={`flex min-w-0 flex-1 items-center gap-3 px-4 py-2.5 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                      purchaseForm.invoice_file
                        ? 'border-brand-600 bg-brand-50 text-brand-700'
                        : 'border-gray-300 text-gray-500 hover:border-brand-600 hover:bg-brand-50'
                    }`}>
                      <Upload size={18} className="shrink-0" />
                      <span className="text-sm truncate">
                        {purchaseForm.invoice_file ? purchaseForm.invoice_file.name : 'Click to upload invoice'}
                      </span>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={e => {
                          setPurchaseForm(f => ({ ...f, invoice_file: e.target.files[0] || null }));
                          setInvoiceSuggestions(null);
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleScanPurchaseInvoice}
                      disabled={!invoiceOcrEnabled || !purchaseForm.invoice_file || scanningInvoice}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-slate-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {scanningInvoice ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                      {scanningInvoice ? 'Scanning...' : 'Scan Invoice'}
                    </button>
                  </div>
                </div>

                {/* Tax */}
                <div className="sm:col-span-2 rounded-xl border border-gray-200 bg-white p-4">
                  <label className="flex items-center gap-3 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={purchaseForm.apply_tax}
                      onChange={e => {
                        const checked = e.target.checked;
                        setPurchaseForm(f => ({
                          ...f,
                          apply_tax: checked,
                          tax_amount: checked ? calculateTaxAmount(f.amount, f.tax_rate) : f.tax_amount,
                        }));
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-600"
                    />
                    Add purchase tax
                  </label>
                  {purchaseForm.apply_tax && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Tax Rate (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={purchaseForm.tax_rate}
                          onChange={e => handlePurchaseTaxRateChange(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-brand-600 focus:outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Tax Amount ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={purchaseForm.tax_amount}
                          onChange={e => setPurchaseForm(f => ({ ...f, tax_amount: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-brand-600 focus:outline-none text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {invoiceSuggestions && (
                  <div className="sm:col-span-2 rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-blue-800">Invoice suggestions applied</p>
                      <span className="text-xs font-medium text-blue-600">
                        {Math.round((invoiceSuggestions.confidence || 0) * 100)}% confidence
                      </span>
                    </div>
                    {invoiceSuggestions.warnings?.length > 0 && (
                      <ul className="mt-2 list-disc pl-5 text-xs text-blue-700">
                        {invoiceSuggestions.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="sm:col-span-2 flex justify-end gap-3">
                  <button
                    onClick={() => { setEditingPurchase(false); resetPurchaseForm(); }}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePurchasePrice}
                    disabled={purchaseSubmitting || !purchaseForm.amount}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50"
                  >
                    {purchaseSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                    {purchaseSubmitting ? 'Saving…' : 'Save Purchase Price'}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Section 2: Financial Dashboard */}
      {loadingFinancials ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-2xl border border-gray-100">
          <Loader2 size={32} className="animate-spin text-brand-600" />
        </div>
      ) : financialData && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column: Summary Card (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main Summary Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{financialData.vehicle_title}</h3>
                  <p className="text-sm text-gray-500">VIN: {financialData.vehicle_vin}</p>
                </div>
                <Calculator size={24} className="text-brand-600" />
              </div>

              {/* Big Numbers */}
              <div className="space-y-4">
                {/* Selling Price */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-500">{financialData.profit_basis_label || 'Selling Price'}</span>
                    {!financialData.sold_price && (
                      <button
                        onClick={() => setEditingPrice(!editingPrice)}
                        className="text-xs text-brand-600 hover:underline flex items-center gap-1"
                      >
                        <Edit3 size={12} />
                        Edit
                      </button>
                    )}
                  </div>
                  {editingPrice ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-gray-400">$</span>
                      <input
                        type="number"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        className="flex-1 text-2xl font-bold text-gray-900 bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-brand-600"
                      />
                      <button
                        onClick={handleUpdatePrice}
                        className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                      >
                        <CheckCircle size={16} />
                      </button>
                      <button
                        onClick={() => setEditingPrice(false)}
                        className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <p className="text-3xl font-bold text-gray-900">
                      {formatCurrency(financialData.profit_basis_price || financialData.selling_price)}
                    </p>
                  )}
                </div>

                {/* Total Cost */}
                <div className="p-4 bg-red-50 rounded-xl">
                  <span className="text-sm text-red-600">Total Cost of Ownership</span>
                  <p className="text-3xl font-bold text-red-700">
                    {formatCurrency(financialData.total_cost_of_ownership || financialData.total_cost)}
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-red-700/80">
                    <span>Buy {formatCurrency(financialData.purchase_price)}</span>
                    <span>Tax {formatCurrency(financialData.tax_amount)}</span>
                    <span>Costs {formatCurrency(financialData.additional_costs_total)}</span>
                  </div>
                </div>

                {/* Net Profit */}
                <div className={`p-4 rounded-xl ${financialData.profit_margin >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {financialData.profit_margin >= 0 ? (
                      <TrendingUp size={16} className="text-green-600" />
                    ) : (
                      <TrendingDown size={16} className="text-red-600" />
                    )}
                    <span className={`text-sm ${financialData.profit_margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      Net Profit
                    </span>
                  </div>
                  <p className={`text-3xl font-bold ${financialData.profit_margin >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatCurrency(financialData.profit_margin)}
                  </p>
                  <p className={`text-sm mt-1 ${financialData.profit_margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {financialData.profit_percentage}% margin
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-500">Cost vs Price</span>
                  <span className="font-medium text-gray-700">{costPercentage.toFixed(1)}%</span>
                </div>
                <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      costPercentage > 90 ? 'bg-red-500' : 
                      costPercentage > 70 ? 'bg-amber-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${costPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>$0</span>
                  <span>{formatCurrency(financialData.profit_basis_price || financialData.selling_price)}</span>
                </div>
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h4 className="font-semibold text-gray-900 mb-4">Cost Breakdown</h4>
              <div className="space-y-3">
                {Object.entries(financialData.cost_breakdown).map(([category, data]) => {
                  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.OTHER;
                  const percentage = (data.amount / financialData.total_cost * 100).toFixed(1);
                  return (
                    <div key={category} className="flex items-center gap-3">
                      <span className="text-lg">{config.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">{data.label}</span>
                          <span className="text-sm font-bold text-gray-900">{formatCurrency(data.amount)}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                          <div 
                            className="h-full bg-brand-600 rounded-full" 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 w-12 text-right">{percentage}%</span>
                    </div>
                  );
                })}
                
                {Object.keys(financialData.cost_breakdown).length === 0 && (
                  <p className="text-center text-gray-400 py-4">No expenses recorded yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Expense Log (3 cols) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Add Expense Button/Form */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">Add Expense</h4>
                <button
                  onClick={() => setShowExpenseForm(!showExpenseForm)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition ${
                    showExpenseForm 
                      ? 'bg-gray-100 text-gray-600' 
                      : 'bg-brand-600 text-white hover:bg-brand-700'
                  }`}
                >
                  {showExpenseForm ? <X size={18} /> : <Plus size={18} />}
                  {showExpenseForm ? 'Cancel' : 'Add Expense'}
                </button>
              </div>

              {showExpenseForm && (
                <form onSubmit={handleSubmitExpense} className="space-y-4 border-t border-gray-100 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Category */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <div className="relative">
                        <select
                          value={expenseForm.category}
                          onChange={(e) => handleCategoryChange(e.target.value)}
                          className="w-full appearance-none px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20 bg-white"
                        >
                          {Object.entries(CATEGORY_CONFIG)
                            .filter(([key]) => key !== 'PURCHASE_PRICE')
                            .map(([key, config]) => (
                            <option key={key} value={key}>{config.icon} {config.label}</option>
                          ))}
                        </select>
                        <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                      <div className="relative">
                        <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="0.00"
                          value={expenseForm.amount}
                          onChange={(e) => handleAmountChange(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Smart Tax Suggestion - Shows when entering Purchase Price */}
                  {showTaxSuggestion && expenseForm.category === 'PURCHASE_PRICE' && (
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">📋</span>
                        <div className="flex-1">
                          <p className="font-medium text-purple-800">Tax Suggestion</p>
                          <p className="text-sm text-purple-600 mt-1">
                            Based on {suggestedTax.rate}% tax rate, estimated tax would be:
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-purple-200">
                              <DollarSign size={16} className="text-purple-500" />
                              <input
                                type="number"
                                step="0.01"
                                value={suggestedTax.amount}
                                onChange={(e) => setSuggestedTax({ ...suggestedTax, amount: e.target.value })}
                                className="w-24 font-bold text-purple-800 bg-transparent focus:outline-none"
                              />
                            </div>
                            <select
                              value={suggestedTax.rate}
                              onChange={(e) => {
                                const newRate = parseFloat(e.target.value);
                                const newAmount = (parseFloat(expenseForm.amount) * newRate / 100).toFixed(2);
                                setSuggestedTax({ rate: newRate, amount: newAmount });
                              }}
                              className="px-3 py-2 rounded-lg border border-purple-200 bg-white text-purple-800 focus:outline-none"
                            >
                              <option value="5">5%</option>
                              <option value="7">7%</option>
                              <option value="8">8%</option>
                              <option value="10">10%</option>
                            </select>
                          </div>
                          <p className="text-xs text-purple-500 mt-2">
                            You'll be prompted to add this tax after logging the purchase price.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Vendor */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                    <select
                      value={expenseForm.vendor}
                      onChange={(e) => {
                        setExpenseForm({ 
                          ...expenseForm, 
                          vendor: e.target.value,
                          vendor_name: e.target.value === 'other' ? '' : ''
                        });
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                    >
                      <option value="">Select a vendor...</option>
                      {vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.name} ({vendor.service_category_display || vendor.service_category})
                        </option>
                      ))}
                      <option value="other">+ Add new vendor (type below)</option>
                    </select>
                    
                    {/* Show text input if "other" is selected */}
                    {expenseForm.vendor === 'other' && (
                      <input
                        type="text"
                        placeholder="Enter new vendor name..."
                        value={expenseForm.vendor_name}
                        onChange={(e) => setExpenseForm({ ...expenseForm, vendor_name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20 mt-2"
                      />
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input
                      type="text"
                      placeholder="e.g., Brake pads replacement"
                      value={expenseForm.description}
                      onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
                    />
                  </div>

                  {/* Invoice Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Upload Invoice (PDF/Image)</label>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.gif"
                        onChange={(e) => setExpenseForm({ ...expenseForm, invoice_file: e.target.files[0] })}
                        className="w-full px-4 py-3 rounded-xl border border-dashed border-gray-300 focus:border-brand-600 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-600 hover:file:bg-brand-100"
                      />
                    </div>
                    {expenseForm.invoice_file && (
                      <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                        <CheckCircle size={14} />
                        {expenseForm.invoice_file.name}
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting || !expenseForm.amount}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Receipt size={18} />
                    )}
                    Log Cost
                  </button>
                </form>
              )}
            </div>

            {/* Expense Log */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">Expense Log</h4>
                <span className="text-sm text-gray-500">{financialData.expense_count} entries</span>
              </div>

              {financialData.expenses.length === 0 ? (
                <div className="text-center py-12">
                  <Receipt size={48} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-gray-500">No expenses recorded yet</p>
                  <p className="text-sm text-gray-400 mt-1">Add your first expense above</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {financialData.expenses.map((expense) => {
                    const config = CATEGORY_CONFIG[expense.category] || CATEGORY_CONFIG.OTHER;
                    return (
                      <div 
                        key={expense.id} 
                        className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition"
                      >
                        <span className="text-2xl">{config.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.color}`}>
                              {config.label}
                            </span>
                            <span className="text-xs text-gray-400">{expense.date}</span>
                          </div>
                          <p className="text-sm text-gray-600 truncate mt-1">
                            {expense.vendor_display || expense.description || 'No description'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">{formatCurrency(expense.amount)}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {expense.invoice_url && (
                              <button
                                onClick={() => setPreviewFile({
                                  url: expense.invoice_url,
                                  name: `Invoice - ${config.label}`,
                                })}
                                className="text-xs text-brand-600 hover:underline flex items-center gap-1"
                              >
                                <Eye size={12} />
                                Invoice
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="p-1 text-gray-400 hover:text-red-500 transition"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
          fileUrl={previewFile.url}
          fileName={previewFile.name}
          mimeType=""
        />
      )}
    </div>
  );
};

export default AdminFinancials;
