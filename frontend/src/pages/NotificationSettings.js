import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Bell, Mail, MessageSquare, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const NotificationSettings = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [testEmail, setTestEmail] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [testing, setTesting] = useState(false);

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  useEffect(() => {
    fetchNotificationStatus();
  }, []);

  const fetchNotificationStatus = async () => {
    try {
      const response = await axios.get(`${API}/notifications/status`, getAuthHeaders());
      setStatus(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement du statut');
    }
  };

  const testNotifications = async () => {
    if (!testEmail && !testPhone) {
      toast.error('Veuillez fournir un email ou un téléphone');
      return;
    }

    setTesting(true);
    try {
      const response = await axios.post(
        `${API}/notifications/test`,
        {
          email: testEmail || undefined,
          phone: testPhone || undefined
        },
        getAuthHeaders()
      );

      if (response.data.email === 'sent') {
        toast.success('Email de test envoyé avec succès !');
      } else if (response.data.email === 'not_configured') {
        toast.warning('Service email non configuré');
      }

      if (response.data.sms === 'sent') {
        toast.success('SMS de test envoyé avec succès !');
      } else if (response.data.sms === 'not_configured') {
        toast.warning('Service SMS non configuré');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'envoi du test');
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (configured) => {
    if (configured) {
      return <CheckCircle2 className="w-5 h-5 text-teal-600" />;
    }
    return <XCircle className="w-5 h-5 text-slate-400" />;
  };

  const getStatusBadge = (statusValue) => {
    const configs = {
      fully_configured: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Entièrement configuré' },
      partially_configured: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Partiellement configuré' },
      not_configured: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Non configuré' }
    };

    const config = configs[statusValue] || configs.not_configured;

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

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

      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Bell className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-display font-bold text-slate-900">Notifications</h1>
                  <p className="text-slate-600">Configuration et test</p>
                </div>
              </div>
              {status && getStatusBadge(status.status)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-6 h-6 text-indigo-600" />
                    <h3 className="text-lg font-display font-semibold">Email</h3>
                  </div>
                  {status && getStatusIcon(status.email.configured)}
                </div>
                <p className="text-sm text-slate-600">
                  Provider: <strong>{status?.email.provider || 'Non configuré'}</strong>
                </p>
              </div>

              <div className="bg-slate-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <MessageSquare className="w-6 h-6 text-indigo-600" />
                    <h3 className="text-lg font-display font-semibold">SMS</h3>
                  </div>
                  {status && getStatusIcon(status.sms.configured)}
                </div>
                <p className="text-sm text-slate-600">
                  Provider: <strong>{status?.sms.provider || 'Non configuré'}</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <h2 className="text-2xl font-display font-bold mb-4">Tester les notifications</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="test-email">Email</Label>
                <Input
                  id="test-email"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                />
              </div>
              <div>
                <Label htmlFor="test-phone">Téléphone (E.164)</Label>
                <Input
                  id="test-phone"
                  type="tel"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+33612345678"
                />
              </div>
              <Button
                onClick={testNotifications}
                disabled={testing}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                {testing ? 'Envoi...' : 'Envoyer le test'}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default NotificationSettings;