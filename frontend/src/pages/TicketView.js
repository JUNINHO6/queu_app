import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Users, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const WS_URL = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');

const TicketView = () => {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [position, setPosition] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    fetchTicket();
    fetchPosition();
    
    const interval = setInterval(() => {
      fetchPosition();
    }, 5000);

    return () => {
      clearInterval(interval);
      if (socket) socket.close();
    };
  }, [ticketId]);

  useEffect(() => {
    if (ticket) {
      connectWebSocket(ticket.queue_id);
    }
  }, [ticket]);

  const connectWebSocket = (queueId) => {
    const ws = new WebSocket(`${WS_URL}/ws/${queueId}`);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'ticket_called') {
        fetchPosition();
        if (data.ticket_id === ticketId) {
          toast.success('C\'est votre tour !', {
            duration: 10000,
            important: true
          });
        }
      }
    };

    setSocket(ws);
  };

  const fetchTicket = async () => {
    try {
      const response = await axios.get(`${API}/tickets/${ticketId}`);
      setTicket(response.data);
    } catch (error) {
      toast.error('Ticket introuvable');
    }
  };

  const fetchPosition = async () => {
    try {
      const response = await axios.get(`${API}/tickets/${ticketId}/position`);
      setPosition(response.data);
    } catch (error) {
      console.error('Error fetching position:', error);
    }
  };

  if (!ticket || !position) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Chargement...</p>
      </div>
    );
  }

  const isYourTurn = position.status === 'called';
  const isServed = position.status === 'served';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6 py-12">
      <motion.div 
        className="w-full max-w-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Ticket Number Card */}
        <div className={`rounded-2xl border shadow-sm p-12 text-center mb-6 ${
          isYourTurn ? 'bg-orange-50 border-orange-300 animate-pulse-slow' : 
          isServed ? 'bg-teal-50 border-teal-300' : 
          'bg-white border-slate-200'
        }`} data-testid="ticket-card">
          <p className="text-slate-600 mb-2">Votre numéro</p>
          <div className={`hero-number ${
            isYourTurn ? 'text-orange-500' : 
            isServed ? 'text-teal-500' : 
            'text-indigo-600'
          }`} data-testid="ticket-number">
            {ticket.ticket_number}
          </div>
          
          {isYourTurn && (
            <div className="mt-4" data-testid="your-turn-notice">
              <p className="text-orange-700 font-display font-bold text-2xl">C'est votre tour !</p>
              <p className="text-orange-600 mt-2">Présentez-vous au comptoir</p>
            </div>
          )}
          
          {isServed && (
            <div className="mt-4 flex items-center justify-center space-x-2 text-teal-700" data-testid="served-notice">
              <CheckCircle2 className="w-6 h-6" />
              <p className="font-display font-semibold text-lg">Servi</p>
            </div>
          )}
          
          {!isYourTurn && !isServed && (
            <div className="mt-6 space-y-4">
              <div data-testid="position-info">
                <p className="text-slate-600 text-sm mb-1">Personnes devant vous</p>
                <div className="flex items-center justify-center space-x-2">
                  <Users className="w-6 h-6 text-slate-600" />
                  <p className="text-4xl font-display font-bold text-slate-900">{position.position}</p>
                </div>
              </div>

              {position.estimated_wait_time && position.estimated_wait_time > 0 && (
                <div className="bg-indigo-50 rounded-lg p-4" data-testid="estimated-wait">
                  <div className="flex items-center justify-center space-x-2">
                    <Clock className="w-5 h-5 text-indigo-600" />
                    <p className="text-indigo-900">
                      Temps d'attente estimé: <strong>{position.estimated_wait_time} min</strong>
                    </p>
                  </div>
                </div>
              )}
              
              <div className="pt-4 border-t border-slate-200" data-testid="current-serving-info">
                <p className="text-slate-600 text-sm mb-1">Numéro en cours</p>
                <p className="text-3xl font-display font-bold text-slate-900">{position.current_serving || '—'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 text-center">
          <div className="flex items-center justify-center space-x-2 text-slate-600">
            <Clock className="w-5 h-5" />
            <span>Statut:</span>
            <span className={`font-medium ${
              isYourTurn ? 'text-orange-600' : 
              isServed ? 'text-teal-600' : 
              'text-indigo-600'
            }`} data-testid="ticket-status">
              {isYourTurn ? 'Appelé' : isServed ? 'Servi' : 'En attente'}
            </span>
          </div>
          {!isYourTurn && !isServed && (
            <p className="text-xs text-slate-500 mt-2">Cette page se met à jour automatiquement</p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default TicketView;