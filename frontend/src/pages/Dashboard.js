import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, LogOut, Play, Pause, RotateCcw, QrCode, Users, Clock } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import io from 'socket.io-client';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const WS_URL = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');

const Dashboard = () => {
  const navigate = useNavigate();
  const [queues, setQueues] = useState([]);
  const [selectedQueue, setSelectedQueue] = useState(null);
  const [queueStats, setQueueStats] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newQueueName, setNewQueueName] = useState('');
  const [establishment, setEstablishment] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const establishmentData = JSON.parse(localStorage.getItem('establishment'));
    setEstablishment(establishmentData);

    fetchQueues();
  }, [navigate]);

  useEffect(() => {
    if (selectedQueue) {
      fetchStats(selectedQueue.id);
      connectWebSocket(selectedQueue.id);
    }
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [selectedQueue]);

  const connectWebSocket = (queueId) => {
    const ws = new WebSocket(`${WS_URL}/ws/${queueId}`);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'ticket_called' || data.type === 'new_ticket' || data.type === 'queue_reset') {
        fetchQueues();
        fetchStats(queueId);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    setSocket(ws);
  };

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  const fetchQueues = async () => {
    try {
      const response = await axios.get(`${API}/queues`, getAuthHeaders());
      setQueues(response.data);
      if (response.data.length > 0 && !selectedQueue) {
        setSelectedQueue(response.data[0]);
      } else if (selectedQueue) {
        const updated = response.data.find(q => q.id === selectedQueue.id);
        if (updated) setSelectedQueue(updated);
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des files');
    }
  };

  const fetchStats = async (queueId) => {
    try {
      const response = await axios.get(`${API}/queues/${queueId}/stats`, getAuthHeaders());
      setQueueStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const createQueue = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/queues`, { name: newQueueName, notification_threshold: 3 }, getAuthHeaders());
      toast.success('File créée avec succès');
      setShowCreateDialog(false);
      setNewQueueName('');
      fetchQueues();
    } catch (error) {
      toast.error('Erreur lors de la création');
    }
  };

  const callNext = async () => {
    if (!selectedQueue) return;
    try {
      const response = await axios.post(`${API}/queues/${selectedQueue.id}/call-next`, {}, getAuthHeaders());
      toast.success(`Numéro ${response.data.ticket_number} appelé`);
      fetchQueues();
      fetchStats(selectedQueue.id);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'appel');
    }
  };

  const toggleQueueStatus = async () => {
    if (!selectedQueue) return;
    const newStatus = selectedQueue.status === 'active' ? 'paused' : 'active';
    try {
      await axios.put(`${API}/queues/${selectedQueue.id}/status`, { status: newStatus }, getAuthHeaders());
      toast.success(`File ${newStatus === 'active' ? 'activée' : 'mise en pause'}`);
      fetchQueues();
    } catch (error) {
      toast.error('Erreur lors du changement de statut');
    }
  };

  const resetQueue = async () => {
    if (!selectedQueue || !window.confirm('Êtes-vous sûr de vouloir réinitialiser cette file ?')) return;
    try {
      await axios.post(`${API}/queues/${selectedQueue.id}/reset`, {}, getAuthHeaders());
      toast.success('File réinitialisée');
      fetchQueues();
      fetchStats(selectedQueue.id);
    } catch (error) {
      toast.error('Erreur lors de la réinitialisation');
    }
  };

  const fetchQrCode = async () => {
    if (!selectedQueue) return;
    try {
      const response = await axios.get(`${API}/queues/${selectedQueue.id}/qr-code`, getAuthHeaders());
      setQrCode(response.data);
      setShowQrDialog(true);
    } catch (error) {
      toast.error('Erreur lors de la génération du QR code');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('establishment');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 noise-texture">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-display font-bold text-xl">Q</span>
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-slate-900">QUEUE</h1>
              <p className="text-xs text-slate-600">{establishment?.name}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={handleLogout}
            data-testid="logout-btn"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Queue List */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-semibold text-slate-900">Mes Files</h2>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" data-testid="create-queue-btn">
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent data-testid="create-queue-dialog">
                  <DialogHeader>
                    <DialogTitle>Créer une file d'attente</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={createQueue} className="space-y-4">
                    <div>
                      <Label htmlFor="queue-name">Nom de la file</Label>
                      <Input
                        id="queue-name"
                        value={newQueueName}
                        onChange={(e) => setNewQueueName(e.target.value)}
                        placeholder="ex: Service Principal"
                        required
                        data-testid="queue-name-input"
                      />
                    </div>
                    <Button type="submit" className="w-full" data-testid="create-queue-submit-btn">
                      Créer
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-2">
              {queues.map((queue) => (
                <button
                  key={queue.id}
                  onClick={() => setSelectedQueue(queue)}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    selectedQueue?.id === queue.id
                      ? 'bg-indigo-50 border-indigo-300'
                      : 'bg-white border-slate-200 hover:border-indigo-200'
                  }`}
                  data-testid={`queue-item-${queue.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display font-semibold text-slate-900">{queue.name}</h3>
                      <p className="text-sm text-slate-600">Numéro actuel: {queue.last_called_number}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      queue.status === 'active' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {queue.status === 'active' ? 'Active' : 'Pause'}
                    </span>
                  </div>
                </button>
              ))}
              {queues.length === 0 && (
                <p className="text-slate-500 text-center py-8">Aucune file créée</p>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {selectedQueue ? (
              <>
                {/* Current Number Display */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center" data-testid="current-number-display">
                  <p className="text-slate-600 mb-2">Numéro en cours</p>
                  <div className="hero-number text-indigo-600">{selectedQueue.last_called_number || '—'}</div>
                  <p className="text-slate-500 mt-2">Prochain: {selectedQueue.current_number}</p>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <Button
                    onClick={callNext}
                    className="bg-orange-500 hover:bg-orange-600 text-white py-6 rounded-lg"
                    disabled={selectedQueue.status !== 'active'}
                    data-testid="call-next-btn"
                  >
                    <Users className="w-5 h-5 mr-2" />
                    Appeler suivant
                  </Button>
                  <Button
                    onClick={toggleQueueStatus}
                    variant="outline"
                    className="py-6 rounded-lg"
                    data-testid="toggle-status-btn"
                  >
                    {selectedQueue.status === 'active' ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
                    {selectedQueue.status === 'active' ? 'Pause' : 'Activer'}
                  </Button>
                  <Button
                    onClick={fetchQrCode}
                    variant="outline"
                    className="py-6 rounded-lg"
                    data-testid="show-qr-btn"
                  >
                    <QrCode className="w-5 h-5 mr-2" />
                    QR Code
                  </Button>
                  <Button
                    onClick={() => navigate(`/queue/${selectedQueue.id}/details`)}
                    variant="outline"
                    className="py-6 rounded-lg"
                    data-testid="view-details-btn"
                  >
                    <Clock className="w-5 h-5 mr-2" />
                    Détails
                  </Button>
                  <Button
                    onClick={resetQueue}
                    variant="outline"
                    className="py-6 rounded-lg text-red-600 hover:text-red-700"
                    data-testid="reset-queue-btn"
                  >
                    <RotateCcw className="w-5 h-5 mr-2" />
                    Réinitialiser
                  </Button>
                </div>

                {/* Stats */}
                {queueStats && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-lg border border-slate-200 p-6" data-testid="stats-waiting">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-slate-600 text-sm">En attente</p>
                          <p className="text-3xl font-display font-bold text-slate-900 mt-1">{queueStats.waiting}</p>
                        </div>
                        <Users className="w-8 h-8 text-indigo-600" />
                      </div>
                    </div>
                    <div className="bg-white rounded-lg border border-slate-200 p-6" data-testid="stats-served">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-slate-600 text-sm">Servis</p>
                          <p className="text-3xl font-display font-bold text-slate-900 mt-1">{queueStats.served}</p>
                        </div>
                        <Users className="w-8 h-8 text-teal-500" />
                      </div>
                    </div>
                    <div className="bg-white rounded-lg border border-slate-200 p-6" data-testid="stats-avg-time">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-slate-600 text-sm">Temps moyen</p>
                          <p className="text-3xl font-display font-bold text-slate-900 mt-1">
                            {queueStats.average_wait_time ? `${Math.round(queueStats.average_wait_time)}m` : '—'}
                          </p>
                        </div>
                        <Clock className="w-8 h-8 text-orange-500" />
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
                <p className="text-slate-500 text-lg">Sélectionnez ou créez une file d'attente pour commencer</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent data-testid="qr-code-dialog">
          <DialogHeader>
            <DialogTitle>QR Code de la file</DialogTitle>
          </DialogHeader>
          {qrCode && (
            <div className="text-center space-y-4">
              <div className="flex justify-center p-4">
                <QRCodeSVG value={qrCode.url} size={256} data-testid="qr-code-image" />
              </div>
              <p className="text-sm text-slate-600">Les clients peuvent scanner ce QR code pour prendre un numéro</p>
              <Input value={qrCode.url} readOnly className="text-center" data-testid="queue-url-input" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;