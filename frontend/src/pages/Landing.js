import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Clock, Users, Bell, QrCode, BarChart3, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <QrCode className="w-6 h-6" />,
      title: "Accès QR Code",
      description: "Les clients scannent et prennent leur numéro instantanément"
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Temps Réel",
      description: "Mises à jour instantanées de la position dans la file"
    },
    {
      icon: <Bell className="w-6 h-6" />,
      title: "Notifications",
      description: "Alertes email quand votre tour approche"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Gestion Simple",
      description: "Interface intuitive pour gérer votre file d'attente"
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Statistiques",
      description: "Suivez les performances de votre établissement"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Sans IA",
      description: "Simple, rapide, sans complexité inutile"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 glassmorphism">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-display font-bold text-xl">Q</span>
            </div>
            <span className="text-2xl font-display font-bold text-slate-900">QUEUE</span>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/login')}
              data-testid="header-login-btn"
            >
              Connexion
            </Button>
            <Button 
              onClick={() => navigate('/register')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              data-testid="header-register-btn"
            >
              Commencer
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <motion.div 
            className="text-center space-y-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-bold text-slate-900 leading-tight">
              Gérez vos files d'attente
              <br />
              <span className="text-indigo-600">sans chaos</span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
              Une solution simple et efficace pour organiser l'attente dans votre établissement.
              Pas d'IA, juste ce dont vous avez besoin.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button 
                size="lg"
                onClick={() => navigate('/register')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-6 text-lg rounded-lg shadow-sm hover:shadow-md transition-all active:scale-95"
                data-testid="hero-start-btn"
              >
                Démarrer gratuitement
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-6 text-lg rounded-lg border-slate-300 hover:border-indigo-300 transition-all"
                data-testid="hero-learn-more-btn"
              >
                En savoir plus
              </Button>
            </div>
          </motion.div>

          {/* Hero Image */}
          <motion.div 
            className="mt-16 rounded-2xl overflow-hidden shadow-2xl"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <img 
              src="https://images.unsplash.com/photo-1749626588174-09f86a67a5aa?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBjb2ZmZWUlMjBzaG9wJTIwaW50ZXJpb3IlMjBtaW5pbWFsaXN0fGVufDB8fHx8MTc2ODMyMDA1Nnww&ixlib=rb-4.1.0&q=85" 
              alt="Modern establishment" 
              className="w-full h-[500px] object-cover"
            />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-slate-50 noise-texture">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-display font-bold text-slate-900 mb-4">
              Fonctionnalités essentielles
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Tout ce dont vous avez besoin pour gérer efficacement vos files d'attente
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="bg-white p-8 rounded-lg border border-slate-200 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                data-testid={`feature-card-${index}`}
              >
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-display font-semibold text-slate-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-600">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <motion.div 
            className="bg-indigo-600 rounded-2xl p-12 text-center text-white shadow-xl"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
              Prêt à simplifier vos files d'attente ?
            </h2>
            <p className="text-indigo-100 text-lg mb-8">
              Créez votre compte et lancez votre première file en moins de 2 minutes
            </p>
            <Button 
              size="lg"
              onClick={() => navigate('/register')}
              className="bg-white text-indigo-600 hover:bg-slate-50 px-8 py-6 text-lg rounded-lg shadow-sm hover:shadow-md transition-all active:scale-95"
              data-testid="cta-register-btn"
            >
              Commencer maintenant
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-slate-200">
        <div className="container mx-auto text-center text-slate-600">
          <p>© 2024 QUEUE. Gestion de files d'attente simplifiée.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;