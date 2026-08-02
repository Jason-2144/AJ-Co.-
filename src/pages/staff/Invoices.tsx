import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Plus, 
  Search, 
  Trash2, 
  X, 
  Calendar,
  FileText,
  DollarSign,
  Briefcase,
  Printer,
  ChevronRight,
  TrendingUp,
  Percent
} from 'lucide-react';
import { invoicesService, Invoice, InvoiceItem, Quote, QuoteItem } from '../../services/invoices';
import { clientsService, Client } from '../../services/clients';
import { usersService, CompanySettings } from '../../services/users';

export default function Invoices() {
  const { profile, hasPermission } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'invoices' | 'quotes'>('invoices');

  // Selected Billing Item for Print/PDF
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showAddInvoice, setShowAddInvoice] = useState(false);
  const [showAddQuote, setShowAddQuote] = useState(false);

  // Form states - Invoice/Quote
  const [clientId, setClientId] = useState('');
  const [billingNumber, setBillingNumber] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  
  // Normalized Items List Form State
  const [itemsList, setItemsList] = useState<Omit<InvoiceItem, 'id' | 'invoice_id'>[]>([
    { description: '', quantity: 1, unit_price: 0, amount: 0 }
  ]);

  useEffect(() => {
    loadBillingData();
  }, []);

  async function loadBillingData() {
    try {
      setLoading(true);
      const [invList, qList, cList, settings] = await Promise.all([
        invoicesService.getInvoices(),
        invoicesService.getQuotes(),
        clientsService.getClients(),
        usersService.getCompanySettings()
      ]);
      setInvoices(invList);
      setQuotes(qList);
      setClients(cList);
      setCompanySettings(settings);
      
      if (settings) {
        setTaxRate(Number(settings.tax_rate) || 0);
      }
    } catch (err) {
      console.error('Error loading Billing dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleAddItemRow = () => {
    setItemsList([...itemsList, { description: '', quantity: 1, unit_price: 0, amount: 0 }]);
  };

  const handleRemoveItemRow = (idx: number) => {
    setItemsList(itemsList.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: string, val: any) => {
    const nextList = [...itemsList];
    const item = nextList[idx] as any;
    item[field] = val;
    item.amount = Number(item.quantity) * Number(item.unit_price);
    setItemsList(nextList);
  };

  const calculateTotals = () => {
    const subtotal = itemsList.reduce((sum, item) => sum + item.amount, 0);
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax - discountAmount;
    return { subtotal, tax, total };
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;
    const { subtotal, tax, total } = calculateTotals();

    try {
      const newInvoice = await invoicesService.createInvoice({
        client_id: clientId,
        invoice_number: billingNumber,
        subtotal,
        tax,
        discount: discountAmount,
        total,
        status: 'draft',
        due_date: dueDate
      }, itemsList);

      // Write log
      await usersService.writeAuditLog({
        user_id: profile?.id || null,
        action: `created invoice #${billingNumber}`,
        module: 'Billing',
        new_value: newInvoice
      });

      setShowAddInvoice(false);
      resetBillingForm();
      loadBillingData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;
    const { subtotal, tax, total } = calculateTotals();

    try {
      const newQuote = await invoicesService.createQuote({
        client_id: clientId,
        quote_number: billingNumber,
        subtotal,
        tax,
        discount: discountAmount,
        total,
        status: 'draft',
        due_date: dueDate
      }, itemsList);

      // Write log
      await usersService.writeAuditLog({
        user_id: profile?.id || null,
        action: `created quote #${billingNumber}`,
        module: 'Billing',
        new_value: newQuote
      });

      setShowAddQuote(false);
      resetBillingForm();
      loadBillingData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = async (invoiceId: string, status: any) => {
    try {
      await invoicesService.updateInvoice(invoiceId, { status });
      setInvoices(invoices.map(i => i.id === invoiceId ? { ...i, status } : i));
    } catch (err) {
      console.error(err);
    }
  };

  const handleConvertQuote = async (quoteId: string, quoteNumber: string) => {
    if (!window.confirm(`Convert quote #${quoteNumber} into a paid invoice?`)) return;
    try {
      const invNum = `INV-${quoteNumber.replace('QT-', '')}`;
      const due = new Date();
      due.setDate(due.getDate() + 30); // 30 days due date default
      
      const newInvoice = await invoicesService.convertQuoteToInvoice(
        quoteId,
        invNum,
        due.toISOString().split('T')[0]
      );

      // Write log
      await usersService.writeAuditLog({
        user_id: profile?.id || null,
        action: `converted quote #${quoteNumber} into invoice #${invNum}`,
        module: 'Billing',
        new_value: newInvoice
      });

      loadBillingData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteInvoice = async (id: string, num: string) => {
    if (!window.confirm(`Are you sure you want to delete invoice #${num}?`)) return;
    try {
      await invoicesService.softDeleteInvoice(id, profile?.id || 'owner');
      
      // Write log
      await usersService.writeAuditLog({
        user_id: profile?.id || null,
        action: `archived invoice #${num}`,
        module: 'Billing'
      });

      setInvoices(invoices.filter(i => i.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const resetBillingForm = () => {
    setClientId('');
    setBillingNumber('');
    setDueDate('');
    setDiscountAmount(0);
    setItemsList([{ description: '', quantity: 1, unit_price: 0, amount: 0 }]);
  };

  const handleTriggerPrint = () => {
    window.print();
  };

  const filteredInvoices = invoices.filter(i => 
    i.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (i.clients?.company_name && i.clients.company_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredQuotes = quotes.filter(q => 
    q.quote_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (q.clients?.company_name && q.clients.company_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If view billing permission is denied
  if (!hasPermission('view:billing')) {
    return (
      <div className="text-center py-20 text-gray-500 text-sm bg-[#121212] border border-white/5 rounded-2xl">
        <Briefcase className="w-8 h-8 text-gray-600 mx-auto mb-3" />
        <span>Access Denied: You do not have permissions to view billing dashboards.</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:bg-white print:text-black print:min-h-screen">
      {/* Printable template view matching exact Tax Invoice photo layout */}
      <div className="hidden print:block space-y-6">
        {selectedInvoice && (
          <div className="border-2 border-black p-8 font-sans text-black bg-white space-y-4 max-w-3xl mx-auto">
            {/* Top Header */}
            <div className="flex justify-between items-start border-b-2 border-black pb-4">
              <div>
                <h1 className="font-bold text-2xl text-black">{companySettings?.company_name || 'AJ & Co. Pvt Ltd.'}</h1>
                <p className="text-xs font-mono mt-1">GSTIN : {companySettings?.gst_number || '29AAAAA0000A1Z5'}</p>
                <p className="text-xs mt-0.5">Office :- {companySettings?.address || 'Bangalore, Karnataka, India'}</p>
                <p className="text-xs mt-0.5">Email ID :- team.ajandco@gmail.com</p>
              </div>
              <div className="text-right">
                <h2 className="font-bold text-xl text-black uppercase tracking-wider">Tax Invoice</h2>
              </div>
            </div>

            {/* Client & Invoice Metadata Bordered Box */}
            <div className="border border-black grid grid-cols-12 divide-x divide-black text-xs">
              <div className="col-span-7 p-3 space-y-1">
                <p><strong>Client Name :-</strong> {selectedInvoice.clients?.company_name}</p>
                <p><strong>Address 1 :-</strong> Corporate Office</p>
                <p><strong>Address 2 :-</strong> India</p>
                <p><strong>GSTIN No :-</strong> Unregistered</p>
              </div>
              <div className="col-span-5 p-3 space-y-2">
                <p><strong>Invoice No :-</strong> {selectedInvoice.invoice_number}</p>
                <p><strong>Invoice Date :-</strong> {selectedInvoice.issue_date || new Date().toISOString().split('T')[0]}</p>
              </div>
            </div>

            {/* Main Line Items Grid */}
            <div className="border border-black overflow-hidden">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-black font-bold bg-gray-100 divide-x divide-black">
                    <th className="p-2 w-12 text-center">Sr No</th>
                    <th className="p-2">Description of Goods / Services</th>
                    <th className="p-2 w-24 text-center">HSN Code</th>
                    <th className="p-2 w-14 text-center">Qty</th>
                    <th className="p-2 w-24 text-right">Rate</th>
                    <th className="p-2 w-28 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black font-medium">
                  {selectedInvoice.invoice_items?.map((item, idx) => (
                    <tr key={idx} className="divide-x divide-black">
                      <td className="p-2 text-center">{idx + 1}</td>
                      <td className="p-2 font-semibold">{item.description}</td>
                      <td className="p-2 text-center">998313</td>
                      <td className="p-2 text-center">{item.quantity}</td>
                      <td className="p-2 text-right">₹{Number(item.unit_price).toFixed(2)}</td>
                      <td className="p-2 text-right font-bold">₹{Number(item.amount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* GST Tax & Total Breakdown Box */}
            <div className="border border-black grid grid-cols-12 divide-x divide-black text-xs">
              <div className="col-span-7 grid grid-cols-4 divide-x divide-black text-center border-r border-black">
                <div className="p-2 bg-gray-100 font-bold border-b border-black">GST</div>
                <div className="p-2 bg-gray-100 font-bold border-b border-black">IGST</div>
                <div className="p-2 bg-gray-100 font-bold border-b border-black">CGST</div>
                <div className="p-2 bg-gray-100 font-bold border-b border-black">SGST</div>

                <div className="p-2 font-semibold">{taxRate}%</div>
                <div className="p-2 font-semibold">{taxRate}%</div>
                <div className="p-2 font-semibold">{(taxRate / 2)}%</div>
                <div className="p-2 font-semibold">{(taxRate / 2)}%</div>
              </div>
              <div className="col-span-5 divide-y divide-black font-semibold">
                <div className="flex justify-between p-2">
                  <span>CGST Amount:</span>
                  <span>₹{(Number(selectedInvoice.tax) / 2).toFixed(2)}</span>
                </div>
                <div className="flex justify-between p-2">
                  <span>SGST Amount:</span>
                  <span>₹{(Number(selectedInvoice.tax) / 2).toFixed(2)}</span>
                </div>
                <div className="flex justify-between p-2">
                  <span>IGST Amount:</span>
                  <span>₹0.00</span>
                </div>
                <div className="flex justify-between p-2 font-bold bg-gray-100 text-sm">
                  <span>Total Amt:</span>
                  <span>₹{Number(selectedInvoice.total).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Bank Details & Authorized Signatory Box */}
            <div className="border border-black grid grid-cols-12 divide-x divide-black text-xs">
              <div className="col-span-8 p-3 space-y-1">
                <p className="font-bold border-b border-gray-300 pb-1 text-center">Bank Details</p>
                <p><strong>Bank Name:</strong> HDFC Bank</p>
                <p><strong>Branch Name:</strong> Bangalore Main Branch</p>
                <p><strong>Bank Account No:</strong> 50200084920194</p>
                <p><strong>Bank IFSC Code:</strong> HDFC0001234</p>
              </div>
              <div className="col-span-4 p-3 flex flex-col justify-between items-center text-center">
                <span className="font-bold text-gray-500 text-[10px]">AJ & Co. Pvt Ltd.</span>
                <div className="h-10 flex items-center justify-center font-serif font-bold text-base italic text-gray-800">
                  AJ & Co.
                </div>
                <span className="font-bold text-xs border-t border-black pt-1 w-full">Auth. Signatory</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Screen Display Container */}
      <div className="space-y-6 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center font-serif text-xl font-bold text-white tracking-tighter">
              AJ
            </div>
            <div>
              <h2 className="font-syne font-bold text-2xl text-white">Billing & Financial Ledger</h2>
              <p className="text-gray-500 text-sm mt-1">Manage project quotes, estimates, and invoices pipeline (INR ₹).</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddQuote(true)}
              className="border border-white/5 hover:bg-white/[0.02] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              Add Quote
            </button>
            <button
              onClick={() => setShowAddInvoice(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2.5 rounded-xl font-semibold transition-colors flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" /> Create Invoice
            </button>
          </div>
        </div>

        {/* Subtabs switches */}
        <div className="flex border-b border-white/5 pb-2 gap-4 text-sm font-medium">
          <button
            onClick={() => setActiveSubTab('invoices')}
            className={`pb-2 focus:outline-none transition-colors ${activeSubTab === 'invoices' ? 'border-b-2 border-emerald-500 text-emerald-400' : 'text-gray-500 hover:text-white'}`}
          >
            Invoices List
          </button>
          <button
            onClick={() => setActiveSubTab('quotes')}
            className={`pb-2 focus:outline-none transition-colors ${activeSubTab === 'quotes' ? 'border-b-2 border-emerald-500 text-emerald-400' : 'text-gray-500 hover:text-white'}`}
          >
            Quotes List
          </button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#121212] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none"
            placeholder={activeSubTab === 'invoices' ? "Search invoices..." : "Search quotes..."}
          />
        </div>

        {/* Active view renderer */}
        {activeSubTab === 'invoices' ? (
          <div className="bg-[#121212] border border-white/5 p-6 rounded-2xl space-y-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-gray-500 font-mono uppercase text-xs">
                    <th className="pb-3">Invoice Number</th>
                    <th className="pb-3">Client</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Total Due</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-white/[0.01] transition-colors cursor-pointer" onClick={() => setSelectedInvoice(inv)}>
                      <td className="py-4 font-mono font-semibold text-white">{inv.invoice_number}</td>
                      <td className="py-4 text-gray-300">{inv.clients?.company_name}</td>
                      <td className="py-4 text-xs font-mono uppercase">
                        <select
                          value={inv.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleUpdateStatus(inv.id!, e.target.value as any)}
                          className={`bg-[#1A1A1A] border border-white/5 text-xs rounded-lg py-1 px-2 focus:outline-none ${
                            inv.status === 'paid' ? 'text-emerald-400' :
                            inv.status === 'overdue' ? 'text-red-400' : 'text-gray-400'
                          }`}
                        >
                          <option value="draft">Draft</option>
                          <option value="sent">Sent</option>
                          <option value="paid">Paid</option>
                          <option value="overdue">Overdue</option>
                        </select>
                      </td>
                      <td className="py-4 font-semibold text-white">₹{Number(inv.total).toLocaleString()}</td>
                      <td className="py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => { setSelectedInvoice(inv); setTimeout(handleTriggerPrint, 200); }}
                            className="p-2 text-gray-500 hover:text-emerald-400 rounded-lg"
                            title="Export PDF / Print"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteInvoice(inv.id!, inv.invoice_number)}
                            className="p-2 text-gray-500 hover:text-red-400 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-[#121212] border border-white/5 p-6 rounded-2xl space-y-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-gray-500 font-mono uppercase text-xs">
                    <th className="pb-3">Quote Number</th>
                    <th className="pb-3">Client</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Total Estimate</th>
                    <th className="pb-3 text-right">Convert</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredQuotes.map((quote) => (
                    <tr key={quote.id} className="hover:bg-white/[0.01]">
                      <td className="py-4 font-mono font-semibold text-white">{quote.quote_number}</td>
                      <td className="py-4 text-gray-300">{quote.clients?.company_name}</td>
                      <td className="py-4 text-xs font-mono uppercase tracking-wider">
                        <span className={`px-2 py-0.5 rounded-full ${
                          quote.status === 'invoiced' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'
                        }`}>
                          {quote.status}
                        </span>
                      </td>
                      <td className="py-4 font-semibold text-white">₹{Number(quote.total).toLocaleString()}</td>
                      <td className="py-4 text-right">
                        {quote.status !== 'invoiced' && (
                          <button
                            onClick={() => handleConvertQuote(quote.id!, quote.quote_number)}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                          >
                            Convert <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Invoice Modal */}
      {showAddInvoice && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-white/5 p-8 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative space-y-6">
            <h3 className="font-syne font-bold text-xl text-white">Create Invoice Record</h3>
            
            <form onSubmit={handleCreateInvoice} className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono tracking-widest text-gray-400 uppercase mb-2">Corporate Client</label>
                  <select
                    required
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 px-4 text-sm focus:outline-none"
                  >
                    <option value="">Select client...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.company_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono tracking-widest text-gray-400 uppercase mb-2">Invoice Number</label>
                  <input
                    type="text"
                    required
                    value={billingNumber}
                    onChange={(e) => setBillingNumber(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 px-4 text-sm focus:outline-none"
                    placeholder="INV-0001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono tracking-widest text-gray-400 uppercase mb-2">Due Date</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 px-4 text-sm focus:outline-none"
                  />
                </div>
              </div>

              {/* Invoice Items Inputs */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono tracking-widest text-gray-400 uppercase">Invoice Line Items</span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-emerald-400 hover:text-emerald-300 text-xs font-semibold"
                  >
                    + Add Item Row
                  </button>
                </div>

                <div className="space-y-3">
                  {itemsList.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-6">
                        <input
                          type="text"
                          required
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          className="w-full bg-[#1A1A1A] border border-white/5 text-white rounded-xl py-2.5 px-3 text-xs focus:outline-none"
                          placeholder="Item description..."
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          required
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                          className="w-full bg-[#1A1A1A] border border-white/5 text-white rounded-xl py-2.5 px-3 text-xs text-center focus:outline-none"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          required
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(idx, 'unit_price', Number(e.target.value))}
                          className="w-full bg-[#1A1A1A] border border-white/5 text-white rounded-xl py-2.5 px-3 text-xs text-right focus:outline-none"
                        />
                      </div>
                      <div className="col-span-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">${item.amount.toFixed(2)}</span>
                        {itemsList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="text-red-400 hover:text-red-300 transition-colors p-1"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tax & Discounts totals details */}
              <div className="border-t border-white/5 pt-6 grid grid-cols-2 gap-6 items-start">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-mono tracking-widest text-gray-500 uppercase mb-2">Discount Amount ($)</label>
                    <input
                      type="number"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(Number(e.target.value))}
                      className="bg-[#1A1A1A] border border-white/5 text-white rounded-xl py-2.5 px-4 text-xs focus:outline-none w-32"
                    />
                  </div>
                </div>

                <div className="bg-[#1A1A1A] p-4 rounded-xl border border-white/5 space-y-2 text-xs text-gray-400">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="text-white">${calculateTotals().subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST / Tax ({taxRate}%):</span>
                    <span className="text-white">${calculateTotals().tax.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-red-400">
                      <span>Discount:</span>
                      <span>-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-white/5 pt-2 text-sm font-bold text-white">
                    <span>Grand Total:</span>
                    <span className="text-emerald-400">${calculateTotals().total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-8">
                <button
                  type="button"
                  onClick={() => setShowAddInvoice(false)}
                  className="border border-white/5 hover:bg-white/[0.02] text-white px-5 py-2.5 rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-400 text-black px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  Save Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Quote Modal */}
      {showAddQuote && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-white/5 p-8 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative space-y-6">
            <h3 className="font-syne font-bold text-xl text-white">Create Quote Record</h3>
            
            <form onSubmit={handleCreateQuote} className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono tracking-widest text-gray-400 uppercase mb-2">Corporate Client</label>
                  <select
                    required
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 px-4 text-sm focus:outline-none"
                  >
                    <option value="">Select client...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.company_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono tracking-widest text-gray-400 uppercase mb-2">Quote Number</label>
                  <input
                    type="text"
                    required
                    value={billingNumber}
                    onChange={(e) => setBillingNumber(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 px-4 text-sm focus:outline-none"
                    placeholder="QT-0001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono tracking-widest text-gray-400 uppercase mb-2">Due Date</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-white/5 focus:border-emerald-500/30 text-white rounded-xl py-3 px-4 text-sm focus:outline-none"
                  />
                </div>
              </div>

              {/* Quote Items Inputs */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-mono tracking-widest text-gray-400 uppercase">Quote Line Items</span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-emerald-400 hover:text-emerald-300 text-xs font-semibold"
                  >
                    + Add Item Row
                  </button>
                </div>

                <div className="space-y-3">
                  {itemsList.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-6">
                        <input
                          type="text"
                          required
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          className="w-full bg-[#1A1A1A] border border-white/5 text-white rounded-xl py-2.5 px-3 text-xs focus:outline-none"
                          placeholder="Item description..."
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          required
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                          className="w-full bg-[#1A1A1A] border border-white/5 text-white rounded-xl py-2.5 px-3 text-xs text-center focus:outline-none"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          required
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(idx, 'unit_price', Number(e.target.value))}
                          className="w-full bg-[#1A1A1A] border border-white/5 text-white rounded-xl py-2.5 px-3 text-xs text-right focus:outline-none"
                        />
                      </div>
                      <div className="col-span-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">${item.amount.toFixed(2)}</span>
                        {itemsList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="text-red-400 hover:text-red-300 transition-colors p-1"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tax totals details */}
              <div className="border-t border-white/5 pt-6 grid grid-cols-2 gap-6 items-start">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-mono tracking-widest text-gray-500 uppercase mb-2">Discount Amount ($)</label>
                    <input
                      type="number"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(Number(e.target.value))}
                      className="bg-[#1A1A1A] border border-white/5 text-white rounded-xl py-2.5 px-4 text-xs focus:outline-none w-32"
                    />
                  </div>
                </div>

                <div className="bg-[#1A1A1A] p-4 rounded-xl border border-white/5 space-y-2 text-xs text-gray-400">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="text-white">${calculateTotals().subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST / Tax ({taxRate}%):</span>
                    <span className="text-white">${calculateTotals().tax.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-red-400">
                      <span>Discount:</span>
                      <span>-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-white/5 pt-2 text-sm font-bold text-white">
                    <span>Total Estimate:</span>
                    <span className="text-emerald-400">${calculateTotals().total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-8">
                <button
                  type="button"
                  onClick={() => setShowAddQuote(false)}
                  className="border border-white/5 hover:bg-white/[0.02] text-white px-5 py-2.5 rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-400 text-black px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  Save Quote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* On-screen Preview & Print Modal for Tax Invoice */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-[#121212] border border-white/10 p-6 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl relative space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="font-syne font-bold text-lg text-white">Tax Invoice Preview #{selectedInvoice.invoice_number}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTriggerPrint}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-emerald-500/10"
                >
                  <Printer className="w-4 h-4" /> Download PDF / Print
                </button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="p-1.5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Render Exact Tax Invoice Box */}
            <div className="border-2 border-black p-6 font-sans text-black bg-white space-y-4 rounded-lg shadow-inner">
              {/* Header */}
              <div className="flex justify-between items-start border-b-2 border-black pb-4">
                <div>
                  <h1 className="font-bold text-xl text-black">{companySettings?.company_name || 'AJ & Co. Pvt Ltd.'}</h1>
                  <p className="text-[11px] font-mono mt-0.5">GSTIN : {companySettings?.gst_number || '29AAAAA0000A1Z5'}</p>
                  <p className="text-[11px] mt-0.5">Office :- {companySettings?.address || 'Bangalore, Karnataka, India'}</p>
                  <p className="text-[11px] mt-0.5">Email ID :- team.ajandco@gmail.com</p>
                </div>
                <div className="text-right">
                  <h2 className="font-bold text-lg text-black uppercase tracking-wider">Tax Invoice</h2>
                </div>
              </div>

              {/* Client & Invoice Metadata Box */}
              <div className="border border-black grid grid-cols-12 divide-x divide-black text-[11px]">
                <div className="col-span-7 p-2.5 space-y-0.5">
                  <p><strong>Client Name :-</strong> {selectedInvoice.clients?.company_name}</p>
                  <p><strong>Address 1 :-</strong> Corporate Office</p>
                  <p><strong>Address 2 :-</strong> India</p>
                  <p><strong>GSTIN No :-</strong> Unregistered</p>
                </div>
                <div className="col-span-5 p-2.5 space-y-1">
                  <p><strong>Invoice No :-</strong> {selectedInvoice.invoice_number}</p>
                  <p><strong>Invoice Date :-</strong> {selectedInvoice.issue_date || new Date().toISOString().split('T')[0]}</p>
                </div>
              </div>

              {/* Items Grid */}
              <div className="border border-black overflow-hidden">
                <table className="w-full text-[11px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-black font-bold bg-gray-100 divide-x divide-black">
                      <th className="p-1.5 w-10 text-center">Sr No</th>
                      <th className="p-1.5">Description of Goods / Services</th>
                      <th className="p-1.5 w-20 text-center">HSN Code</th>
                      <th className="p-1.5 w-12 text-center">Qty</th>
                      <th className="p-1.5 w-20 text-right">Rate</th>
                      <th className="p-1.5 w-24 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black font-medium">
                    {selectedInvoice.invoice_items?.map((item, idx) => (
                      <tr key={idx} className="divide-x divide-black">
                        <td className="p-1.5 text-center">{idx + 1}</td>
                        <td className="p-1.5 font-semibold">{item.description}</td>
                        <td className="p-1.5 text-center">998313</td>
                        <td className="p-1.5 text-center">{item.quantity}</td>
                        <td className="p-1.5 text-right">₹{Number(item.unit_price).toFixed(2)}</td>
                        <td className="p-1.5 text-right font-bold">₹{Number(item.amount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* GST Breakdown Box */}
              <div className="border border-black grid grid-cols-12 divide-x divide-black text-[11px]">
                <div className="col-span-7 grid grid-cols-4 divide-x divide-black text-center border-r border-black">
                  <div className="p-1.5 bg-gray-100 font-bold border-b border-black">GST</div>
                  <div className="p-1.5 bg-gray-100 font-bold border-b border-black">IGST</div>
                  <div className="p-1.5 bg-gray-100 font-bold border-b border-black">CGST</div>
                  <div className="p-1.5 bg-gray-100 font-bold border-b border-black">SGST</div>

                  <div className="p-1.5 font-semibold">{taxRate}%</div>
                  <div className="p-1.5 font-semibold">{taxRate}%</div>
                  <div className="p-1.5 font-semibold">{(taxRate / 2)}%</div>
                  <div className="p-1.5 font-semibold">{(taxRate / 2)}%</div>
                </div>
                <div className="col-span-5 divide-y divide-black font-semibold">
                  <div className="flex justify-between p-1.5">
                    <span>CGST Amount:</span>
                    <span>₹{(Number(selectedInvoice.tax) / 2).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between p-1.5">
                    <span>SGST Amount:</span>
                    <span>₹{(Number(selectedInvoice.tax) / 2).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between p-1.5">
                    <span>IGST Amount:</span>
                    <span>₹0.00</span>
                  </div>
                  <div className="flex justify-between p-1.5 font-bold bg-gray-100 text-xs">
                    <span>Total Amt:</span>
                    <span>₹{Number(selectedInvoice.total).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Bank Details & Auth Signatory */}
              <div className="border border-black grid grid-cols-12 divide-x divide-black text-[11px]">
                <div className="col-span-8 p-2.5 space-y-0.5">
                  <p className="font-bold border-b border-gray-300 pb-0.5 text-center">Bank Details</p>
                  <p><strong>Bank Name:</strong> HDFC Bank</p>
                  <p><strong>Branch Name:</strong> Bangalore Main Branch</p>
                  <p><strong>Bank Account No:</strong> 50200084920194</p>
                  <p><strong>Bank IFSC Code:</strong> HDFC0001234</p>
                </div>
                <div className="col-span-4 p-2.5 flex flex-col justify-between items-center text-center">
                  <span className="font-bold text-gray-500 text-[9px]">AJ & Co. Pvt Ltd.</span>
                  <div className="h-8 flex items-center justify-center font-serif font-bold text-sm italic text-gray-800">
                    AJ & Co.
                  </div>
                  <span className="font-bold text-[10px] border-t border-black pt-0.5 w-full">Auth. Signatory</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
