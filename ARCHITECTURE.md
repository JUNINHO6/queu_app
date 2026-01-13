# QUEUE - Architecture & Plan d'Implémentation

## 📐 Architecture Technique

### Vue d'ensemble
```
┌─────────────────────────────────────────────────────────────┐
│                       CLIENT (Browser)                       │
├─────────────────────────────────────────────────────────────┤
│  React Frontend (Port 3000)                                  │
│  - React Router (Navigation)                                 │
│  - Framer Motion (Animations)                                │
│  - Tailwind CSS (Styling)                                    │
│  - Socket.IO Client (WebSocket)                              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ HTTPS/WSS
                 │
┌────────────────▼────────────────────────────────────────────┐
│  Kubernetes Ingress                                          │
│  - /api/* → Backend (8001)                                   │
│  - /* → Frontend (3000)                                      │
└────────────────┬────────────────────────────────────────────┘
                 │
         ┌───────┴───────┐
         │               │
┌────────▼──────┐ ┌─────▼────────┐
│   FastAPI     │ │   WebSocket  │
│   Backend     │ │   Server     │
│   (Port 8001) │ │              │
│               │ │              │
│ - REST API    │ │ - Real-time  │
│ - JWT Auth    │ │   updates    │
│ - Business    │ │ - Broadcast  │
│   Logic       │ │   messages   │
└───────┬───────┘ └──────────────┘
        │
        │ Motor (Async Driver)
        │
┌───────▼──────────────────────────────────────────────────┐
│  MongoDB (Port 27017)                                     │
│  - establishments                                         │
│  - queues                                                 │
│  - tickets                                                │
└───────────────────────────────────────────────────────────┘
```

## 🔐 Flux d'Authentification

```
Client                 Frontend               Backend              MongoDB
  │                      │                      │                    │
  │──Register Form──────►│                      │                    │
  │                      │──POST /api/auth/─────►│                    │
  │                      │    register          │                    │
  │                      │                      │──hash password────►│
  │                      │                      │                    │
  │                      │                      │◄──save user────────│
  │                      │◄──JWT token──────────│                    │
  │◄──Store in──────────│    + user data       │                    │
  │   localStorage       │                      │                    │
  │                      │                      │                    │
  │──Protected Route────►│                      │                    │
  │                      │──GET /api/queues────►│                    │
  │                      │   + Bearer token     │──verify JWT────────►│
  │                      │                      │                    │
  │                      │◄──Data or 401────────│                    │
  │◄──Render or────────│                      │                    │
  │   Redirect           │                      │                    │
```

## 🔄 Flux de Gestion de File

### Création d'une File
```
Establishment → POST /api/queues
                ├─ Authentification JWT ✓
                ├─ Création dans MongoDB
                ├─ Génération ID unique
                └─ Retour données de la file
```

### Prise de Numéro (Client)
```
Client → GET /api/queues/{id} (Info publique)
         │
         ├─ Affichage état actuel
         │
Client → POST /api/queues/{id}/tickets
         │   {email: "optional@email.com"}
         │
         ├─ Génération ticket_number = queue.current_number + 1
         ├─ Sauvegarde ticket en DB
         ├─ Incrémentation queue.current_number
         ├─ Broadcast WebSocket → {type: "new_ticket"}
         │
         └─ Redirect → /ticket/{ticket_id}
```

### Appel du Numéro Suivant
```
Establishment → POST /api/queues/{id}/call-next
                 ├─ Auth JWT ✓
                 ├─ Vérification status === "active"
                 ├─ Recherche prochain ticket (status="waiting", ORDER BY ticket_number ASC)
                 │
                 ├─ Mise à jour ticket → status="called"
                 ├─ Mise à jour ancien ticket → status="served"
                 ├─ Mise à jour queue.last_called_number
                 ├─ Incrémentation queue.total_served
                 │
                 └─ Broadcast WebSocket → {type: "ticket_called", ticket_number, ticket_id}
                     │
                     └─ Tous les clients reçoivent la mise à jour
```

## 📡 WebSocket - Temps Réel

### Connexion
```javascript
// Frontend
const ws = new WebSocket(`wss://domain.com/ws/${queueId}`);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'new_ticket':
      // Mettre à jour compteur "En attente"
      break;
    case 'ticket_called':
      // Mettre à jour numéro actuel
      // Notifier si c'est le ticket de l'utilisateur
      break;
    case 'queue_status':
      // File active/pause/fermée
      break;
    case 'queue_reset':
      // Rafraîchir complètement
      break;
  }
};
```

### Gestion des Connexions (Backend)
```python
class ConnectionManager:
    active_connections: Dict[str, Set[WebSocket]]
    
    async def broadcast(queue_id: str, message: dict):
        # Envoyer à tous les clients connectés à cette file
        for connection in active_connections[queue_id]:
            await connection.send_json(message)
```

## 🗂️ Modèle de Données Détaillé

### Establishments
| Champ         | Type     | Description                    |
|---------------|----------|--------------------------------|
| id            | UUID     | Identifiant unique             |
| name          | String   | Nom de l'établissement         |
| email         | String   | Email (unique)                 |
| password_hash | String   | Mot de passe hashé (bcrypt)    |
| created_at    | DateTime | Date de création               |

**Index**: email (unique)

### Queues
| Champ                 | Type     | Description                      |
|-----------------------|----------|----------------------------------|
| id                    | UUID     | Identifiant unique               |
| establishment_id      | String   | Référence établissement          |
| name                  | String   | Nom de la file                   |
| status                | String   | active/paused/closed             |
| current_number        | Int      | Dernier numéro distribué         |
| last_called_number    | Int      | Dernier numéro appelé            |
| total_served          | Int      | Compteur total servis            |
| notification_threshold| Int      | Seuil pour notif (ex: 3)         |
| created_at            | DateTime | Date de création                 |

**Index**: establishment_id, status

### Tickets
| Champ         | Type     | Description                      |
|---------------|----------|----------------------------------|
| id            | UUID     | Identifiant unique               |
| queue_id      | String   | Référence file                   |
| ticket_number | Int      | Numéro du ticket                 |
| email         | String?  | Email client (optionnel)         |
| status        | String   | waiting/called/served/cancelled  |
| created_at    | DateTime | Heure de prise                   |
| called_at     | DateTime?| Heure d'appel                    |
| served_at     | DateTime?| Heure de service                 |

**Index**: queue_id + status, queue_id + ticket_number

## 📊 Calcul des Statistiques

### Temps d'Attente Moyen
```python
served_tickets = db.tickets.find({
    "queue_id": queue_id,
    "status": "served",
    "served_at": {"$exists": True}
})

wait_times = []
for ticket in served_tickets:
    delta = ticket.served_at - ticket.created_at
    wait_times.append(delta.total_seconds() / 60)  # en minutes

average = sum(wait_times) / len(wait_times) if wait_times else None
```

### Personnes en Attente
```python
waiting = db.tickets.count_documents({
    "queue_id": queue_id,
    "status": "waiting"
})
```

## 🛡️ Sécurité

### Protection contre les Abus

**Double prise de numéro**
- Pas de vérification stricte pour le MVP (client peut prendre plusieurs numéros)
- Future amélioration: IP rate limiting, cookie/session

**Spam de création de files**
- Authentification JWT requise
- Rate limiting possible au niveau Nginx/Ingress

**Token expiration**
- Durée: 30 jours
- Refresh possible via nouveau login

## 🚀 Déploiement

### Variables d'Environnement

**Backend (.env)**
```bash
MONGO_URL=mongodb://localhost:27017
DB_NAME=queue_database
JWT_SECRET=your-secret-key-change-in-production
CORS_ORIGINS=*
FRONTEND_URL=https://yourdomain.com
```

**Frontend (.env)**
```bash
REACT_APP_BACKEND_URL=https://yourdomain.com
```

### Commandes Supervisor
```bash
# Démarrer tous les services
sudo supervisorctl start all

# Redémarrer après modifications
sudo supervisorctl restart backend frontend

# Voir les logs
tail -f /var/log/supervisor/backend.err.log
tail -f /var/log/supervisor/frontend.err.log
```

## 📈 Évolution Future

### Phase 2 - Notifications
- Intégration SMTP pour emails
- Intégration Twilio pour SMS
- Système de file de jobs (Celery/Redis)

### Phase 3 - Analytics
- Dashboard de statistiques avancées
- Graphiques de performance
- Export de rapports

### Phase 4 - Multi-établissement
- Support de plusieurs établissements
- Gestion d'équipe
- Rôles et permissions

### Phase 5 - Mobile
- Application native iOS/Android
- Notifications push
- Mode hors ligne

## 🎯 MVP Réalisé

✅ Authentification établissement
✅ Gestion CRUD des files
✅ Prise de numéro client
✅ Appel du numéro suivant
✅ Temps réel (WebSocket)
✅ QR Code generation
✅ Statistiques basiques
✅ Interface responsive
✅ Design moderne et épuré

**Temps de développement MVP**: ~2 jours
**Technologies utilisées**: 10
**Lignes de code**: ~3000
**Tests passés**: 94% (backend), 90% (frontend)
