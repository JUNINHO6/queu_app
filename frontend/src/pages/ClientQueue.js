import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Users, Clock } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const WS_URL = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');

const ClientQueue = () => {
  const { queueId } = useParams();
  const navigate = useNavigate();
  const [queue, setQueue] = useState(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    fetchQueue();
    connectWebSocket();

    return () => {
      if (socket) socket.close();
    };
  }, [queueId]);

  const connectWebSocket = () => {
    const ws = new WebSocket(`${WS_URL}/ws/${queueId}`);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'ticket_called' || data.type === 'new_ticket' || data.type === 'queue_reset' || data.type === 'queue_status') {
        fetchQueue();
      }
    };

    setSocket(ws);
  };

  const fetchQueue = async () => {
    try {
      const response = await axios.get(`${API}/queues/${queueId}`);
      setQueue(response.data);
    } catch (error) {
      toast.error('File d\'attente introuvable');
    }
  };

  const takeTicket = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/queues/${queueId}/tickets`, { email: email || null });
      toast.success(`Votre numéro: ${response.data.ticket_number}`);
      navigate(`/ticket/${response.data.id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la prise de numéro');
    } finally {
      setLoading(false);
    }
  };

  if (!queue) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 py-12">
      <motion.div 
        className="w-full max-w-lg space-y-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Queue Info */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center" data-testid="queue-info-card">
          <h1 className="text-3xl font-display font-bold text-slate-900 mb-2">{queue.name}</h1>
          <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-6 ${
            queue.status === 'active' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600'
          }`}>
            {queue.status === 'active' ? 'File Active' : 'File en Pause'}
          </div>

          {/* Current Number */}
          <div className="mb-8" data-testid="current-serving-number">
            <p className="text-slate-600 mb-2">Numéro en cours</p>
            <div className="hero-number text-indigo-600">{queue.last_called_number || '—'}</div>
          </div>

          {/* Waiting Count - BIG AND VISIBLE */}
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-300 rounded-2xl p-6 mb-6">
            <div className="text-center">
              <p className="text-orange-700 font-semibold text-lg mb-2">Personnes en attente</p>
              <div className="text-7xl font-display font-extrabold text-orange-600" data-testid="waiting-count-display">
                {queue.current_number - queue.last_called_number}
              </div>
              <p className="text-orange-600 text-sm mt-2">dans la file actuellement</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-200">
            <div data-testid="total-waiting">
              <div className="flex items-center justify-center space-x-2 text-slate-600 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-sm">En attente</span>
              </div>
              <p className="text-2xl font-display font-bold text-slate-900">{queue.current_number - queue.last_called_number}</p>
            </div>
            <div data-testid="next-number">
              <div className="flex items-center justify-center space-x-2 text-slate-600 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Prochain</span>
              </div>
              <p className="text-2xl font-display font-bold text-slate-900">{queue.current_number}</p>
            </div>
          </div>
        </div>

        {/* Take Ticket Form */}
        {queue.status === 'active' ? (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
              <h2 className="text-xl font-display font-semibold text-slate-900 mb-6 text-center">
                Prendre un numéro
              </h2>
              <form onSubmit={takeTicket} className="space-y-4" data-testid="take-ticket-form">
                <div className="space-y-2">
                  <Label htmlFor="email">Email (optionnel)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-slate-50 border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                    data-testid="ticket-email-input"
                  />
                  <p className="text-xs text-slate-500">Recevez une notification par email quand votre tour approche</p>
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-6 rounded-lg transition-all active:scale-95"
                  disabled={loading}
                  data-testid="take-ticket-btn"
                >
                  {loading ? 'Création...' : 'Prendre mon numéro'}
                </Button>
              </form>
            </div>

            {/* Reservation Option */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 text-center">
              <p className="text-indigo-900 font-medium mb-3">
                💎 Préférez réserver un créneau ?
              </p>
              <p className="text-indigo-700 text-sm mb-4">
                Choisissez votre heure d'arrivée et évitez l'attente
              </p>
              <Button
                onClick={() => navigate(`/q/${queueId}/reserve`)}
                variant="outline"
                className="border-indigo-300 hover:bg-indigo-100"
                data-testid="go-to-reservation-btn"
              >
                Réserver un créneau
              </Button>
            </div>
          </>
        ) : (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-8 text-center" data-testid="queue-paused-notice">
            <p className="text-orange-700 font-medium">Cette file est actuellement en pause</p>
            <p className="text-orange-600 text-sm mt-2">Veuillez réessayer plus tard</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ClientQueue;