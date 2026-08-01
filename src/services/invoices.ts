import { supabase } from '../lib/supabase';

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface Invoice {
  id?: string;
  client_id: string;
  quote_id?: string | null;
  invoice_number: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  issue_date?: string;
  due_date: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
  created_at?: string;
  invoice_items?: InvoiceItem[];
  clients?: {
    company_name: string;
  };
}

export interface QuoteItem {
  id?: string;
  quote_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface Quote {
  id?: string;
  client_id: string;
  quote_number: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'invoiced';
  due_date?: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
  created_at?: string;
  quote_items?: QuoteItem[];
  clients?: {
    company_name: string;
  };
}

export interface Expense {
  id?: string;
  amount: number;
  category: string;
  description?: string;
  expense_date: string;
  logged_by?: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

const INVOICES_STORAGE_KEY = 'ajco_crm_invoices';
const QUOTES_STORAGE_KEY = 'ajco_crm_quotes';
const EXPENSES_STORAGE_KEY = 'ajco_crm_expenses';

function getLocalStore<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function setLocalStore<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Failed to write to local storage ${key}`, e);
  }
}

export const invoicesService = {
  async getInvoices(): Promise<Invoice[]> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, invoice_items(*), clients(company_name)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (!error && data && data.length > 0) {
        setLocalStore(INVOICES_STORAGE_KEY, data);
        return data as any;
      }
    } catch (err) {
      console.warn('Supabase getInvoices failed:', err);
    }
    return getLocalStore<Invoice>(INVOICES_STORAGE_KEY);
  },

  async createInvoice(invoice: Omit<Invoice, 'id' | 'created_at' | 'invoice_items' | 'clients'>, items: Omit<InvoiceItem, 'id' | 'invoice_id'>[]): Promise<Invoice> {
    const newInvoice: Invoice = {
      ...invoice,
      id: 'inv_' + Date.now(),
      created_at: new Date().toISOString(),
      invoice_items: items.map((it, idx) => ({ ...it, id: 'item_' + idx }))
    };

    try {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert(invoice)
        .select()
        .single();
      
      if (!invoiceError && invoiceData) {
        if (items.length > 0) {
          const itemRows = items.map(item => ({ ...item, invoice_id: invoiceData.id }));
          await supabase.from('invoice_items').insert(itemRows);
        }
        const local = getLocalStore<Invoice>(INVOICES_STORAGE_KEY);
        setLocalStore(INVOICES_STORAGE_KEY, [invoiceData, ...local]);
        return invoiceData;
      }
    } catch (err) {
      console.warn('Supabase createInvoice failed:', err);
    }

    const local = getLocalStore<Invoice>(INVOICES_STORAGE_KEY);
    setLocalStore(INVOICES_STORAGE_KEY, [newInvoice, ...local]);
    return newInvoice;
  },

  async updateInvoiceStatus(id: string, status: 'draft' | 'sent' | 'paid' | 'overdue'): Promise<Invoice> {
    try {
      const { data, error } = await supabase.from('invoices').update({ status }).eq('id', id).select().single();
      if (!error && data) return data;
    } catch (err) {}
    const local = getLocalStore<Invoice>(INVOICES_STORAGE_KEY);
    let updatedInv: Invoice = { client_id: '', invoice_number: '', subtotal: 0, tax: 0, discount: 0, total: 0, status, due_date: '' };
    const updated = local.map(i => {
      if (i.id === id) {
        updatedInv = { ...i, status };
        return updatedInv;
      }
      return i;
    });
    setLocalStore(INVOICES_STORAGE_KEY, updated);
    return updatedInv;
  },

  async softDeleteInvoice(id: string, userId: string): Promise<void> {
    try {
      await supabase.from('invoices').update({ deleted_at: new Date().toISOString(), deleted_by: userId }).eq('id', id);
    } catch (err) {}
    const local = getLocalStore<Invoice>(INVOICES_STORAGE_KEY).filter(i => i.id !== id);
    setLocalStore(INVOICES_STORAGE_KEY, local);
  },

  async getQuotes(): Promise<Quote[]> {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('*, quote_items(*), clients(company_name)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (!error && data && data.length > 0) return data as any;
    } catch (err) {}
    return getLocalStore<Quote>(QUOTES_STORAGE_KEY);
  },

  async createQuote(quote: Omit<Quote, 'id' | 'created_at' | 'quote_items' | 'clients'>, items: Omit<QuoteItem, 'id' | 'quote_id'>[]): Promise<Quote> {
    const newQuote: Quote = { ...quote, id: 'quote_' + Date.now(), created_at: new Date().toISOString() };
    try {
      const { data: quoteData, error } = await supabase.from('quotes').insert(quote).select().single();
      if (!error && quoteData) return quoteData;
    } catch (err) {}
    const local = getLocalStore<Quote>(QUOTES_STORAGE_KEY);
    setLocalStore(QUOTES_STORAGE_KEY, [newQuote, ...local]);
    return newQuote;
  },

  async updateQuoteStatus(id: string, status: 'draft' | 'sent' | 'accepted' | 'declined' | 'invoiced'): Promise<Quote> {
    try {
      const { data, error } = await supabase.from('quotes').update({ status }).eq('id', id).select().single();
      if (!error && data) return data;
    } catch (err) {}
    const local = getLocalStore<Quote>(QUOTES_STORAGE_KEY);
    let updatedQ: Quote = { client_id: '', quote_number: '', subtotal: 0, tax: 0, discount: 0, total: 0, status };
    const updated = local.map(q => {
      if (q.id === id) {
        updatedQ = { ...q, status };
        return updatedQ;
      }
      return q;
    });
    setLocalStore(QUOTES_STORAGE_KEY, updated);
    return updatedQ;
  },

  async softDeleteQuote(id: string, userId: string): Promise<void> {
    try {
      await supabase.from('quotes').update({ deleted_at: new Date().toISOString(), deleted_by: userId }).eq('id', id);
    } catch (err) {}
    const local = getLocalStore<Quote>(QUOTES_STORAGE_KEY).filter(q => q.id !== id);
    setLocalStore(QUOTES_STORAGE_KEY, local);
  },

  async getExpenses(): Promise<Expense[]> {
    try {
      const { data, error } = await supabase.from('expenses').select('*').is('deleted_at', null).order('expense_date', { ascending: false });
      if (!error && data) return data;
    } catch (err) {}
    return getLocalStore<Expense>(EXPENSES_STORAGE_KEY);
  },

  async addExpense(expense: Omit<Expense, 'id'>): Promise<Expense> {
    const newExp: Expense = { ...expense, id: 'exp_' + Date.now() };
    try {
      const { data, error } = await supabase.from('expenses').insert(expense).select().single();
      if (!error && data) return data;
    } catch (err) {}
    const local = getLocalStore<Expense>(EXPENSES_STORAGE_KEY);
    setLocalStore(EXPENSES_STORAGE_KEY, [newExp, ...local]);
    return newExp;
  },

  async softDeleteExpense(id: string, userId: string): Promise<void> {
    try {
      await supabase.from('expenses').update({ deleted_at: new Date().toISOString(), deleted_by: userId }).eq('id', id);
    } catch (err) {}
    const local = getLocalStore<Expense>(EXPENSES_STORAGE_KEY).filter(e => e.id !== id);
    setLocalStore(EXPENSES_STORAGE_KEY, local);
  }
};
