# QUEUE - Gestion de Files d'Attente

Application web moderne pour organiser et gérer les files d'attente dans les lieux physiques (restaurants, administrations, coiffeurs, salons, etc.).

## 🎯 Fonctionnalités

### Pour les Établissements
- ✅ Inscription et connexion sécurisées
- ✅ Création et gestion de files d'attente multiples
- ✅ Génération de QR codes pour accès client
- ✅ Appel du numéro suivant en un clic
- ✅ Mise en pause/reprise de la file
- ✅ Réinitialisation complète de la file
- ✅ Statistiques en temps réel (personnes en attente, servis, temps moyen)
- ✅ Mises à jour en temps réel via WebSocket

### Pour les Clients
- ✅ Accès via QR code ou lien direct
- ✅ Prise de numéro instantanée (1 clic)
- ✅ Visualisation en temps réel :
  - Numéro personnel
  - Numéro actuellement servi
  - Position dans la file
- ✅ Notifications email (optionnel)
- ✅ Interface responsive (mobile-first)

## 🏗️ Architecture

### Backend
- **Framework**: FastAPI (Python)
- **Base de données**: MongoDB
- **Authentification**: JWT tokens
- **Temps réel**: WebSocket
- **Sécurité**: bcrypt pour les mots de passe

### Frontend
- **Framework**: React
- **Routing**: React Router
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Composants UI**: Shadcn/UI
- **QR Codes**: qrcode.react
- **WebSocket**: socket.io-client

## 📦 Installation

### Prérequis
- Python 3.11+
- Node.js 18+
- MongoDB
- Yarn

### Backend
```bash
cd /app/backend
pip install -r requirements.txt
```

### Frontend
```bash
cd /app/frontend
yarn install
```

## 🚀 Lancement

Les services sont gérés par Supervisor et démarrent automatiquement.

### Redémarrer les services
```bash
sudo supervisorctl restart backend
sudo supervisorctl restart frontend
```

### Vérifier le statut
```bash
sudo supervisorctl status
```

## 📋 Modèle de Données

### Establishments
```json
{
  "id": "uuid",
  "name": "string",
  "email": "string",
  "password_hash": "string",
  "created_at": "datetime"
}
```

### Queues
```json
{
  "id": "uuid",
  "establishment_id": "string",
  "name": "string",
  "status": "active|paused|closed",
  "current_number": "number",
  "last_called_number": "number",
  "total_served": "number",
  "notification_threshold": "number",
  "created_at": "datetime"
}
```

### Tickets
```json
{
  "id": "uuid",
  "queue_id": "string",
  "ticket_number": "number",
  "email": "string|null",
  "status": "waiting|called|served|cancelled",
  "created_at": "datetime",
  "called_at": "datetime|null",
  "served_at": "datetime|null"
}
```

## 🎨 Design

L'application suit un design moderne et minimaliste :
- **Couleurs principales**: 
  - Indigo (#4F46E5) - Actions primaires
  - Orange (#F97316) - Alertes urgentes
  - Teal (#14B8A6) - Succès
- **Typographie**: 
  - Manrope (titres, numéros)
  - Public Sans (corps de texte)
- **Espacement généreux** pour une meilleure lisibilité
- **Animations fluides** avec Framer Motion

## 🔌 API Endpoints

### Authentification
- `POST /api/auth/register` - Inscription établissement
- `POST /api/auth/login` - Connexion
- `GET /api/auth/me` - Profil utilisateur

### Files d'attente
- `POST /api/queues` - Créer une file
- `GET /api/queues` - Liste des files
- `GET /api/queues/{id}` - Détails d'une file
- `PUT /api/queues/{id}/status` - Changer statut
- `POST /api/queues/{id}/call-next` - Appeler suivant
- `POST /api/queues/{id}/reset` - Réinitialiser
- `GET /api/queues/{id}/stats` - Statistiques
- `GET /api/queues/{id}/qr-code` - Générer QR code

### Tickets
- `POST /api/queues/{id}/tickets` - Prendre un numéro
- `GET /api/tickets/{id}` - Détails ticket
- `GET /api/tickets/{id}/position` - Position dans la file

### WebSocket
- `WS /ws/{queue_id}` - Connexion temps réel

## 🧪 Tests

L'application a été testée avec :
- Tests backend (17/18 passés - 94%)
- Tests frontend (navigation, formulaires, flux complets)
- Tests d'intégration (bout en bout)

## 🔐 Sécurité

- Mots de passe hashés avec bcrypt
- JWT tokens avec expiration (30 jours)
- Validation des données avec Pydantic
- Protection CORS configurée
- Headers de sécurité

## 📱 Utilisation

### Pour un établissement
1. Créer un compte sur `/register`
2. Se connecter sur `/login`
3. Créer une file d'attente depuis le dashboard
4. Générer et afficher le QR code
5. Appeler les numéros au fur et à mesure

### Pour un client
1. Scanner le QR code ou ouvrir le lien
2. (Optionnel) Entrer son email pour notifications
3. Cliquer sur "Prendre mon numéro"
4. Suivre sa position en temps réel
5. Se présenter quand son numéro est appelé

## 🚧 Fonctionnalités futures

- Envoi réel des notifications email (actuellement simulé)
- Notifications SMS via Twilio
- Historique des files passées
- Export des statistiques (CSV, PDF)
- Multi-langues (FR, EN, ES)
- Application mobile native (iOS/Android)
- Estimation du temps d'attente
- Système de réservation de créneaux

## 📄 License

Propriété de l'établissement utilisant l'application.

## 👨‍💻 Développement

Construit avec ❤️ par E1 (Emergent Agent)
