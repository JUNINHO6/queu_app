import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, Users, Clock, BarChart3 } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Analytics = () => {
  const { queueId } = useParams();
  const navigate = useNavigate();
  const [queue, setQueue] = useState(null);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  useEffect(() => {
    fetchData();
  }, [queueId]);

  const fetchData = async () => {
    try {
      const [queueRes, statsRes, historyRes] = await Promise.all([
        axios.get(`${API}/queues/${queueId}`, getAuthHeaders()),
        axios.get(`${API}/queues/${queueId}/stats`, getAuthHeaders()),
        axios.get(`${API}/queues/${queueId}/history?limit=100`, getAuthHeaders())
      ]);
      setQueue(queueRes.data);
      setStats(statsRes.data);
      setHistory(historyRes.data);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const prepareStatusData = () => {
    if (!history.length) return [];
    
    const statusCount = {
      waiting: history.filter(t => t.status === 'waiting').length,
      served: history.filter(t => t.status === 'served').length,
      cancelled: history.filter(t => t.status === 'cancelled').length
    };

    return [
      { name: 'En attente', value: statusCount.waiting, color: '#3B82F6' },
      { name: 'Servis', value: statusCount.served, color: '#14B8A6' },
      { name: 'Annulés', value: statusCount.cancelled, color: '#64748B' }
    ].filter(item => item.value > 0);
  };

  const prepareHourlyData = () => {
    if (!history.length) return [];

    const hourlyStats = {};
    
    history.forEach(ticket => {
      const date = new Date(ticket.created_at);
      const hour = date.getHours();
      if (!hourlyStats[hour]) {
        hourlyStats[hour] = { hour: `${hour}h`, count: 0 };
      }
      hourlyStats[hour].count++;
    });

    return Object.values(hourlyStats).sort((a, b) => {
      const hourA = parseInt(a.hour);
      const hourB = parseInt(b.hour);
      return hourA - hourB;
    });
  };

  const prepareWaitTimeData = () => {
    if (!history.length) return [];

    const servedTickets = history.filter(t => t.status === 'served' && t.served_at);
    const last20 = servedTickets.slice(0, 20).reverse();

    return last20.map((ticket, index) => {
      const created = new Date(ticket.created_at);
      const served = new Date(ticket.served_at);
      const waitMinutes = Math.round((served - created) / 60000);
      
      return {
        ticket: `#${ticket.ticket_number}`,
        minutes: waitMinutes
      };
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Chargement...</p>
      </div>
    );
  }

  const statusData = prepareStatusData();
  const hourlyData = prepareHourlyData();
  const waitTimeData = prepareWaitTimeData();

  return (
    <div className="min-h-screen bg-slate-50 noise-texture">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            data-testid="back-to-dashboard-btn"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour au tableau de bord
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-3xl font-display font-bold text-slate-900">Analytics</h1>
                <p className="text-slate-600">{queue?.name}</p>
              </div>
            </div>

            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-slate-600 text-sm">Total de tickets</p>
                    <BarChart3 className="w-5 h-5 text-slate-600" />
                  </div>
                  <p className="text-4xl font-display font-bold text-slate-900">{stats.total_tickets}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-blue-600 text-sm">En attente</p>
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-4xl font-display font-bold text-blue-700">{stats.waiting}</p>
                </div>
                <div className="bg-teal-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-teal-600 text-sm">Servis</p>
                    <Users className="w-5 h-5 text-teal-600" />
                  </div>
                  <p className="text-4xl font-display font-bold text-teal-700">{stats.served}</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-orange-600 text-sm">Temps moyen</p>
                    <Clock className="w-5 h-5 text-orange-600" />
                  </div>
                  <p className="text-4xl font-display font-bold text-orange-700">
                    {stats.average_wait_time ? `${Math.round(stats.average_wait_time)}m` : '—'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {statusData.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                <h2 className="text-xl font-display font-bold text-slate-900 mb-6">Répartition par statut</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {hourlyData.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                <h2 className="text-xl font-display font-bold text-slate-900 mb-6">Affluence par heure</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="hour" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip />
                    <Bar dataKey="count" fill="#4F46E5" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {waitTimeData.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
              <h2 className="text-xl font-display font-bold text-slate-900 mb-6">
                Temps d'attente (derniers 20 tickets servis)
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={waitTimeData}>
                  <defs>
                    <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F97316" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#F97316" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="ticket" stroke="#64748b" />
                  <YAxis stroke="#64748b" label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="minutes" stroke="#F97316" fillOpacity={1} fill="url(#colorMinutes)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {history.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
              <BarChart3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-display font-semibold text-slate-900 mb-2">
                Pas encore de données
              </h3>
              <p className="text-slate-600">
                Les statistiques apparaîtront après les premiers tickets
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Analytics;