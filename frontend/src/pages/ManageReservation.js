import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar, Clock, Mail, Phone, Edit2, Trash2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ManageReservation = () => {
  const { reservationId } = useParams();
  const navigate = useNavigate();
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    email: '',
    phone: '',
    date: '',
    time: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReservation();
  }, [reservationId]);

  const fetchReservation = async () => {
    try {
      const response = await axios.get(`${API}/reservations/${reservationId}`);
      setReservation(response.data);
      
      // Pre-fill edit form
      const reservedDate = new Date(response.data.reserved_time);
      setEditForm({
        email: response.data.email,
        phone: response.data.phone || '',
        date: reservedDate.toISOString().split('T')[0],
        time: reservedDate.toTimeString().slice(0, 5)
      });
    } catch (error) {
      toast.error('Réservation introuvable');
      setTimeout(() => navigate('/'), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const reservedTime = new Date(`${editForm.date}T${editForm.time}:00`);
      
      await axios.put(`${API}/reservations/${reservationId}`, {
        email: editForm.email,
        phone: editForm.phone || null,
        reserved_time: reservedTime.toISOString()
      });

      toast.success('Réservation modifiée avec succès !');
      setShowEditDialog(false);
      fetchReservation();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la modification');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    setSubmitting(true);

    try {
      await axios.delete(`${API}/reservations/${reservationId}`);
      toast.success('Réservation annulée');
      setShowCancelDialog(false);
      
      // Redirect after 2 seconds
      setTimeout(() => {
        if (reservation?.queue_id) {
          navigate(`/q/${reservation.queue_id}`);
        } else {
          navigate('/');
        }
      }, 2000);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'annulation');
    } finally {
      setSubmitting(false);
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

  const getStatusConfig = (status) => {
    const configs = {
      pending: {
        icon: <Clock className="w-16 h-16 text-orange-500" />,
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-700',
        label: 'En attente d\'activation',
        message: 'Votre réservation sera activée par l\'établissement'
      },
      activated: {
        icon: <CheckCircle2 className="w-16 h-16 text-teal-500" />,
        bg: 'bg-teal-50',
        border: 'border-teal-200',
        text: 'text-teal-700',
        label: 'Activée',
        message: 'Votre réservation a été activée et un ticket généré'
      },
      cancelled: {
        icon: <XCircle className="w-16 h-16 text-slate-500" />,
        bg: 'bg-slate-50',
        border: 'border-slate-200',
        text: 'text-slate-700',
        label: 'Annulée',
        message: 'Cette réservation a été annulée'
      }
    };
    return configs[status] || configs.pending;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Chargement...</p>
      </div>
    );
  }

  if (!reservation) {
    return null;
  }

  const statusConfig = getStatusConfig(reservation.status);
  const canModify = reservation.status !== 'cancelled'; // Peut modifier même si activé

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6 py-12">
      <motion.div
        className="w-full max-w-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className={`bg-white rounded-2xl border-2 ${statusConfig.border} shadow-sm p-8`}>
          {/* Status Icon */}
          <div className="text-center mb-6">
            <div className={`w-20 h-20 ${statusConfig.bg} rounded-full flex items-center justify-center mx-auto mb-4`}>
              {statusConfig.icon}
            </div>
            <h1 className="text-3xl font-display font-bold text-slate-900 mb-2">
              Votre Réservation
            </h1>
            <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.text}`}>
              {statusConfig.label}
            </span>
            <p className="text-slate-600 mt-2">{statusConfig.message}</p>
          </div>

          {/* Reservation Details */}
          <div className="space-y-4 mb-8">
            <div className="bg-slate-50 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center space-x-2 text-slate-600 mb-2">
                    <Calendar className="w-5 h-5" />
                    <span className="text-sm font-medium">Créneau réservé</span>
                  </div>
                  <p className="text-lg font-semibold text-slate-900">
                    {formatDateTime(reservation.reserved_time)}
                  </p>
                </div>
                <div>
                  <div className="flex items-center space-x-2 text-slate-600 mb-2">
                    <Clock className="w-5 h-5" />
                    <span className="text-sm font-medium">Arrivée estimée</span>
                  </div>
                  <p className="text-lg font-semibold text-slate-900">
                    {formatDateTime(reservation.estimated_arrival)}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-200 mt-4 pt-4 space-y-2">
                <div className="flex items-center space-x-2 text-slate-600">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">{reservation.email}</span>
                </div>
                {reservation.phone && (
                  <div className="flex items-center space-x-2 text-slate-600">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">{reservation.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {reservation.status === 'activated' && reservation.ticket_id && (
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-teal-600 mt-0.5" />
                  <div>
                    <p className="text-teal-900 font-medium">Ticket généré !</p>
                    <p className="text-teal-700 text-sm mt-1">Votre réservation a été convertie en ticket. Cliquez ci-dessous pour le suivre.</p>
                    <Button
                      onClick={() => navigate(`/ticket/${reservation.ticket_id}`)}
                      className="mt-3 bg-teal-600 hover:bg-teal-700"
                      size="sm"
                    >
                      Voir mon ticket
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          {canModify && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => setShowEditDialog(true)}
                variant="outline"
                className="py-6 border-2"
                data-testid="edit-reservation-btn"
              >
                <Edit2 className="w-5 h-5 mr-2" />
                Modifier
              </Button>
              <Button
                onClick={() => setShowCancelDialog(true)}
                variant="outline"
                className="py-6 border-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                data-testid="cancel-reservation-btn"
              >
                <Trash2 className="w-5 h-5 mr-2" />
                Annuler
              </Button>
            </div>
          )}

          {!canModify && reservation.status === 'cancelled' && (
            <Button
              onClick={() => navigate(`/q/${reservation.queue_id}`)}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              Faire une nouvelle réservation
            </Button>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier la réservation</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-phone">Téléphone (optionnel)</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="+33 6 12 34 56 78"
                />
              </div>
              <div>
                <Label htmlFor="edit-date">Date</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-time">Heure</Label>
                <Input
                  id="edit-time"
                  type="time"
                  value={editForm.time}
                  onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                  required
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {submitting ? 'Modification...' : 'Confirmer'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Cancel Dialog */}
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Annuler la réservation</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <div className="flex items-start space-x-3 bg-red-50 border border-red-200 rounded-lg p-4">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="text-red-900 font-medium">Êtes-vous sûr ?</p>
                  <p className="text-red-700 text-sm mt-1">
                    Cette action est irréversible. Votre réservation sera définitivement annulée.
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCancelDialog(false)}
              >
                Non, garder
              </Button>
              <Button
                onClick={handleCancel}
                disabled={submitting}
                className="bg-red-600 hover:bg-red-700"
              >
                {submitting ? 'Annulation...' : 'Oui, annuler'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
};

export default ManageReservation;