import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Calendar, Clock, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ReservationPage = () => {
  const { queueId } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    date: '',
    time: ''
  });
  const [loading, setLoading] = useState(false);
  const [reservation, setReservation] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const reservedTime = new Date(`${formData.date}T${formData.time}:00`);
      
      const response = await axios.post(`${API}/queues/${queueId}/reservations`, {
        email: formData.email,
        phone: formData.phone || null,
        reserved_time: reservedTime.toISOString()
      });

      setReservation(response.data);
      toast.success('Réservation créée avec succès !');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la réservation');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (reservation) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6 py-12">
        <motion.div
          className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          data-testid="reservation-success"
        >
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-teal-600" />
          </div>
          <h1 className="text-3xl font-display font-bold text-slate-900 mb-4">
            Réservation confirmée !
          </h1>
          <div className="bg-slate-50 rounded-lg p-6 mb-6 text-left">
            <div className="space-y-3">
              <div>
                <p className="text-slate-600 text-sm">Créneau réservé</p>
                <p className="text-slate-900 font-semibold">{formatDateTime(reservation.reserved_time)}</p>
              </div>
              <div>
                <p className="text-slate-600 text-sm">Heure d'arrivée estimée</p>
                <p className="text-slate-900 font-semibold">{formatDateTime(reservation.estimated_arrival)}</p>
              </div>
              <div>
                <p className="text-slate-600 text-sm">Email de confirmation</p>
                <p className="text-slate-900 font-semibold">{reservation.email}</p>
              </div>
            </div>
          </div>
          <p className="text-slate-600 mb-6">
            Un email de confirmation vous a été envoyé. Présentez-vous 5 minutes avant votre créneau.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => navigate(`/q/${queueId}`)}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              data-testid="back-to-queue-btn"
            >
              Retour à la file
            </Button>
            <Button
              onClick={() => navigate(`/reservation/${reservation.id}`)}
              variant="outline"
              className="w-full border-2"
              data-testid="manage-reservation-btn"
            >
              Gérer ma réservation
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6 py-12">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-6 h-6 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-display font-bold text-slate-900 mb-2">
              Réserver un créneau
            </h1>
            <p className="text-slate-600">
              Choisissez votre heure d'arrivée préférée
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" data-testid="reservation-form">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="votre@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="bg-slate-50 border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                data-testid="reservation-email-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone (optionnel)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+33 6 12 34 56 78"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-slate-50 border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                data-testid="reservation-phone-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                required
                className="bg-slate-50 border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                data-testid="reservation-date-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Heure *</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                required
                className="bg-slate-50 border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                data-testid="reservation-time-input"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                <p className="text-blue-900 text-sm">
                  Votre heure d'arrivée sera estimée en fonction de l'état actuel de la file.
                  Arrivez 5 minutes avant votre créneau.
                </p>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-6 rounded-lg transition-all active:scale-95"
              disabled={loading}
              data-testid="reservation-submit-btn"
            >
              {loading ? 'Réservation...' : 'Confirmer ma réservation'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate(`/q/${queueId}`)}
              className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
              data-testid="skip-reservation-link"
            >
              Prendre un numéro sans réservation
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ReservationPage;