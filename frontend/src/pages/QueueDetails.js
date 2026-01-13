import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, History, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const QueueDetails = () => {
  const { queueId } = useParams();
  const navigate = useNavigate();
  const [queue, setQueue] = useState(null);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  useEffect(() => {
    fetchQueueDetails();
  }, [queueId]);

  const fetchQueueDetails = async () => {
    try {
      const [queueRes, historyRes, statsRes] = await Promise.all([
        axios.get(`${API}/queues/${queueId}`, getAuthHeaders()),
        axios.get(`${API}/queues/${queueId}/history?limit=100`, getAuthHeaders()),
        axios.get(`${API}/queues/${queueId}/stats`, getAuthHeaders())
      ]);

      setQueue(queueRes.data);
      setHistory(historyRes.data);
      setStats(statsRes.data);
    } catch (error) {
      toast.error('Erreur lors du chargement des détails');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = async () => {
    try {
      const response = await axios.get(`${API}/queues/${queueId}/export/csv`, {
        ...getAuthHeaders(),
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `queue_stats_${queueId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Export CSV téléchargé !');
    } catch (error) {
      toast.error('Erreur lors de l\'export CSV');
    }
  };

  const exportPDF = async () => {
    try {
      const response = await axios.get(`${API}/queues/${queueId}/export/pdf`, {
        ...getAuthHeaders(),
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `queue_stats_${queueId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Export PDF téléchargé !');
    } catch (error) {
      toast.error('Erreur lors de l\'export PDF');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      waiting: 'bg-blue-100 text-blue-700',
      called: 'bg-orange-100 text-orange-700',
      served: 'bg-teal-100 text-teal-700',
      cancelled: 'bg-slate-100 text-slate-600'
    };
    
    const labels = {
      waiting: 'En attente',
      called: 'Appelé',
      served: 'Servi',
      cancelled: 'Annulé'
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Chargement...</p>
      </div>
    );
  }

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
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={exportCSV}
              data-testid="export-csv-btn"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={exportPDF}
              data-testid="export-pdf-btn"
            >
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-display font-bold text-slate-900">{queue?.name}</h1>
                <p className="text-slate-600 mt-1">Détails et historique</p>
              </div>
              <div className={`px-4 py-2 rounded-lg font-medium ${
                queue?.status === 'active' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {queue?.status === 'active' ? 'Active' : 'Pause'}
              </div>
            </div>

            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-lg p-4" data-testid="stats-total">
                  <p className="text-slate-600 text-sm">Total de tickets</p>
                  <p className="text-3xl font-display font-bold text-slate-900 mt-1">{stats.total_tickets}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4" data-testid="stats-waiting-detail">
                  <p className="text-blue-600 text-sm">En attente</p>
                  <p className="text-3xl font-display font-bold text-blue-700 mt-1">{stats.waiting}</p>
                </div>
                <div className="bg-teal-50 rounded-lg p-4" data-testid="stats-served-detail">
                  <p className="text-teal-600 text-sm">Servis</p>
                  <p className="text-3xl font-display font-bold text-teal-700 mt-1">{stats.served}</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4" data-testid="stats-avg-wait">
                  <p className="text-orange-600 text-sm">Temps moyen</p>
                  <p className="text-3xl font-display font-bold text-orange-700 mt-1">
                    {stats.average_wait_time ? `${Math.round(stats.average_wait_time)}m` : '—'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <div className="flex items-center space-x-2 mb-6">
              <History className="w-6 h-6 text-indigo-600" />
              <h2 className="text-2xl font-display font-bold text-slate-900">Historique des tickets</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full" data-testid="history-table">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-slate-600 font-medium">Numéro</th>
                    <th className="text-left py-3 px-4 text-slate-600 font-medium">Statut</th>
                    <th className="text-left py-3 px-4 text-slate-600 font-medium">Créé le</th>
                    <th className="text-left py-3 px-4 text-slate-600 font-medium">Appelé le</th>
                    <th className="text-left py-3 px-4 text-slate-600 font-medium">Servi le</th>
                    <th className="text-left py-3 px-4 text-slate-600 font-medium">Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-8 text-slate-500">
                        Aucun ticket dans l'historique
                      </td>
                    </tr>
                  ) : (
                    history.map((ticket, index) => (
                      <tr key={ticket.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <span className="font-display font-bold text-indigo-600 text-lg">
                            {ticket.ticket_number}
                          </span>
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(ticket.status)}</td>
                        <td className="py-3 px-4 text-slate-600 text-sm">{formatDate(ticket.created_at)}</td>
                        <td className="py-3 px-4 text-slate-600 text-sm">
                          {ticket.called_at ? formatDate(ticket.called_at) : '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-sm">
                          {ticket.served_at ? formatDate(ticket.served_at) : '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-sm">
                          {ticket.email || ticket.phone || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default QueueDetails;