import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Quote } from '../types';
import { formatCurrency, formatPercent, cn } from '../lib/utils';
import { useStore } from '../contexts/StoreContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { TrendingUp, DollarSign, PieChart, Clock, Users, ArrowRight } from 'lucide-react';

export function Dashboard() {
  const { activeStore } = useStore();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeStore) {
      setLoading(false);
      setQuotes([]);
      return;
    }

    const q = query(
      collection(db, 'quotes'), 
      where('storeId', '==', activeStore.id),
      orderBy('date', 'desc'), 
      limit(100)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quote));
      setQuotes(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'quotes');
      setLoading(false);
    });
    return () => unsubscribe();
  }, [activeStore]);

  const totalRevenue = quotes.reduce((acc, q) => acc + (q.totalAmount || 0), 0);
  const totalProfit = quotes.reduce((acc, q) => acc + (q.totalProfit || 0), 0);
  const avgMargin = quotes.length > 0 ? quotes.reduce((acc, q) => acc + (q.avgMargin || 0), 0) / quotes.length : 0;

  // Group by product for chart
  const productStats = quotes.reduce((acc: any, q) => {
    (q.items || []).forEach(item => {
      if (!acc[item.productName]) acc[item.productName] = 0;
      acc[item.productName] += item.quantity;
    });
    return acc;
  }, {});

  const chartData = Object.entries(productStats)
    .map(([name, value]) => ({ name, value }))
    .sort((a: any, b: any) => b.value - a.value)
    .slice(0, 5);

  const COLORS = ['#171717', '#404040', '#737373', '#a3a3a3', '#d4d4d4'];

  const stats = [
    { label: 'Faturamento Estimado', value: formatCurrency(totalRevenue), icon: DollarSign, color: 'text-neutral-900' },
    { label: 'Lucro Total', value: formatCurrency(totalProfit), icon: TrendingUp, color: 'text-green-600' },
    { label: 'Margem Média', value: formatPercent(avgMargin), icon: PieChart, color: 'text-blue-600' },
    { label: 'Total de Orçamentos', value: quotes.length, icon: Clock, color: 'text-neutral-500' },
  ];

  if (loading) return <div className="animate-pulse space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-neutral-200 rounded-2xl" />)}
    </div>
    <div className="h-96 bg-neutral-200 rounded-2xl" />
  </div>;

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Dashboard</h1>
        <p className="text-neutral-500 mt-1">Visão geral do desempenho do seu ateliê.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-500">{stat.label}</span>
              <stat.icon className={cn("w-5 h-5", stat.color)} />
            </div>
            <span className="text-2xl font-bold text-neutral-900">{stat.value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-2xl border border-neutral-200 shadow-sm">
          <h2 className="text-lg font-bold mb-6">Produtos Mais Orçados</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f5f5f5" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: '#f5f5f5' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold">Últimos Orçamentos</h2>
            <button className="text-xs font-bold text-neutral-400 hover:text-neutral-900 flex items-center gap-1 transition-colors">
              Ver todos <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-4">
            {quotes.slice(0, 5).map((quote) => (
              <div key={quote.id} className="flex items-center justify-between p-4 rounded-xl border border-neutral-100 hover:bg-neutral-50 transition-colors">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-neutral-900">
                      {quote.items?.[0]?.productName || 'Vários itens'}
                      {quote.items?.length > 1 && ` (+${quote.items.length - 1})`}
                    </span>
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                      quote.status === 'Aprovado' ? "bg-green-100 text-green-700" :
                      quote.status === 'Em produção' ? "bg-blue-100 text-blue-700" :
                      quote.status === 'Finalizado' ? "bg-neutral-100 text-neutral-700" :
                      "bg-yellow-100 text-yellow-700"
                    )}>
                      {quote.status || 'Pendente'}
                    </span>
                  </div>
                  <span className="text-xs text-neutral-500">{quote.clientName} • {new Date(quote.date).toLocaleDateString()}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-neutral-900">{formatCurrency(quote.totalAmount)}</span>
                  <div className="text-[10px] text-neutral-400">{quote.items?.reduce((acc, i) => acc + i.quantity, 0)} itens</div>
                </div>
              </div>
            ))}
            {quotes.length === 0 && (
              <div className="text-center py-10 text-neutral-400 italic">Nenhum orçamento encontrado.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
