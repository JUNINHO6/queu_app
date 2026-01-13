import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Mail, Phone, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ReservationManagement = () => {
  const { queueId } = useParams();
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [queue, setQueue] = useState(null);
  const [loading, setLoading] = useState(true);

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  useEffect(() => {
    fetchData();
  }, [queueId]);

  const fetchData = async () => {
    try {
      const [queueRes, reservationsRes] = await Promise.all([
        axios.get(`${API}/queues/${queueId}`, getAuthHeaders()),
        axios.get(`${API}/queues/${queueId}/reservations`, getAuthHeaders())
      ]);
      setQueue(queueRes.data);
      setReservations(reservationsRes.data);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const activateReservation = async (reservationId) => {
    try {
      await axios.post(`${API}/reservations/${reservationId}/activate`, {}, getAuthHeaders());
      toast.success('Réservation activée !');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'activation');
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const configs = {
      pending: { bg: 'bg-orange-100', text: 'text-orange-700', icon: <Clock className="w-4 h-4" />, label: 'En attente' },
      activated: { bg: 'bg-teal-100', text: 'text-teal-700', icon: <CheckCircle2 className="w-4 h-4" />, label: 'Activé' },
      cancelled: { bg: 'bg-slate-100', text: 'text-slate-600', icon: <XCircle className="w-4 h-4" />, label: 'Annulé' }
    };
    const config = configs[status] || configs.pending;
    return (
      <span className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}>
        {config.icon}
        <span>{config.label}</span>
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

  const pendingReservations = reservations.filter(r => r.status === 'pending');
  const activatedReservations = reservations.filter(r => r.status === 'activated');

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

      <div className="container mx-auto px-6 py-8 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-3xl font-display font-bold text-slate-900">Réservations</h1>
                <p className="text-slate-600">{queue?.name}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-slate-600 text-sm">Total</p>
                <p className="text-3xl font-display font-bold text-slate-900">{reservations.length}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <p className="text-orange-600 text-sm">En attente</p>
                <p className="text-3xl font-display font-bold text-orange-700">{pendingReservations.length}</p>
              </div>
              <div className="bg-teal-50 rounded-lg p-4">
                <p className="text-teal-600 text-sm">Activées</p>
                <p className="text-3xl font-display font-bold text-teal-700">{activatedReservations.length}</p>
              </div>
            </div>
          </div>

          {pendingReservations.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
              <h2 className="text-2xl font-display font-bold text-slate-900 mb-6">À activer</h2>
              <div className="space-y-4">
                {pendingReservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="border border-slate-200 rounded-lg p-6 hover:border-indigo-200 transition-all"
                    data-testid={`reservation-${reservation.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-3">
                          {getStatusBadge(reservation.status)}
                          <span className="text-lg font-display font-semibold text-slate-900">
                            {formatDateTime(reservation.reserved_time)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-slate-600">
                          <div className="flex items-center space-x-1">
                            <Mail className="w-4 h-4" />
                            <span>{reservation.email}</span>
                          </div>
                          {reservation.phone && (
                            <div className="flex items-center space-x-1">
                              <Phone className="w-4 h-4" />
                              <span>{reservation.phone}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">
                          Arrivée estimée : {formatDateTime(reservation.estimated_arrival)}
                        </p>
                      </div>
                      <Button
                        onClick={() => activateReservation(reservation.id)}
                        className="bg-indigo-600 hover:bg-indigo-700"
                        data-testid={`activate-btn-${reservation.id}`}
                      >
                        Activer maintenant
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activatedReservations.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
              <h2 className="text-2xl font-display font-bold text-slate-900 mb-6">Déjà activées</h2>
              <div className="space-y-3">
                {activatedReservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="border border-slate-200 rounded-lg p-4 bg-slate-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(reservation.status)}
                          <span className="font-medium text-slate-900">
                            {formatDateTime(reservation.reserved_time)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">{reservation.email}</p>
                      </div>
                      {reservation.ticket_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/ticket/${reservation.ticket_id}`)}
                        >
                          Voir le ticket
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reservations.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
              <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-display font-semibold text-slate-900 mb-2">
                Aucune réservation
              </h3>
              <p className="text-slate-600">
                Les clients pourront réserver des créneaux via le lien public de la file
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ReservationManagement;