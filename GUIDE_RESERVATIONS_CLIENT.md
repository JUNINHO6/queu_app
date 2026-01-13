# 🔔 Notifications de Réservation + Gestion Client

## ✅ Fonctionnalités Implémentées

### 1. Notification d'Activation de Réservation 📧

Quand l'admin active une réservation, le client reçoit automatiquement une notification.

**Déclencheur** : Admin clique "Activer maintenant" sur une réservation

**Destinataires** : Email + SMS du client (si fournis)

**Contenu** :
- **Email** : Template HTML avec ticket number, lien vers suivi en temps réel
- **SMS** : Message court avec numéro de ticket et lien

**Code Backend** (`server.py`, endpoint `activate_reservation`) :
```python
# Envoi email
html_content = """
  Email moderne avec :
  - Header vert teal (réservation activée)
  - Numéro de ticket en gros
  - Bouton "Voir mon ticket"
  - Lien vers /ticket/{ticket_id}
"""

# Envoi SMS
message = f"✅ QUEUE: Votre réservation a été activée!
File: {queue['name']}
Votre numéro: {ticket.ticket_number}
Suivez: {url}/ticket/{ticket.id}"
```

### 2. Gestion de Réservation par le Client 🎫

#### Page de Gestion (`/reservation/{reservationId}`)

**Accès** : Lien direct fourni après création de réservation

**Fonctionnalités** :
- ✅ Visualisation des détails (date, heure, email, phone)
- ✅ Modification (si statut = pending)
- ✅ Annulation (si statut = pending)
- ✅ Affichage du statut (Pending/Activated/Cancelled)
- ✅ Lien vers ticket si activé

#### Modification de Réservation

**Endpoint** : `PUT /api/reservations/{id}`

**Ce qui peut être modifié** :
- Email
- Téléphone
- Date et heure du créneau

**Restrictions** :
- Uniquement si statut = "pending"
- Calcul automatique nouvelle heure d'arrivée estimée

**Notification** : Email de confirmation de modification envoyé

**Template Email** :
```html
Header indigo (modification)
- Nouveau créneau affiché
- Nouvelle heure estimée
- Message de confirmation
```

#### Annulation de Réservation

**Endpoint** : `DELETE /api/reservations/{id}`

**Restrictions** :
- Uniquement si statut = "pending"
- Si déjà activée : impossible (ticket existe)

**Notification** : Email de confirmation d'annulation

**Template Email** :
```html
Header gris (annulation)
- Confirmation annulation
- Message encourageant à revenir
```

### 3. Flux Complet Client

```
1. Client crée réservation
   └─> /q/{queueId}/reserve
   └─> Email confirmation envoyé

2. Client reçoit lien de gestion
   └─> /reservation/{reservationId}
   └─> Peut modifier ou annuler

3. Admin active réservation
   └─> Dashboard → Réservations → "Activer maintenant"
   └─> Email + SMS "Réservation activée" envoyé
   └─> Ticket créé automatiquement

4. Client suit son ticket
   └─> Lien dans email → /ticket/{ticketId}
   └─> Affichage temps réel
   └─> Notifications "votre tour approche"
```

---

## 📊 Endpoints API

### Réservations Client

| Endpoint | Méthode | Description | Auth |
|----------|---------|-------------|------|
| `/reservations/{id}` | GET | Détails réservation | Public |
| `/reservations/{id}` | PUT | Modifier réservation | Public |
| `/reservations/{id}` | DELETE | Annuler réservation | Public |
| `/reservations/{id}/activate` | POST | Activer (admin) | JWT |

### Paramètres PUT

```json
{
  "email": "new@email.com",
  "phone": "+33612345678",
  "reserved_time": "2024-01-20T14:30:00Z"
}
```

---

## 🎨 Interface Utilisateur

### Page de Gestion de Réservation

**Design** :
- Icône de statut (horloge/checkmark/croix)
- Badge coloré (orange/vert/gris)
- Détails dans carte avec fond gris
- 2 boutons : Modifier + Annuler (si pending)
- Dialogue de confirmation pour annulation

**États** :
1. **Pending** : Boutons Modifier + Annuler visibles
2. **Activated** : Affichage ticket + lien "Voir mon ticket"
3. **Cancelled** : Message annulation + bouton "Nouvelle réservation"

### Dialog Modification

**Champs** :
- Email (requis)
- Téléphone (optionnel)
- Date (minimum aujourd'hui)
- Heure

**Validation** : Côté client + serveur

### Dialog Annulation

**Design** : Warning rouge avec confirmation

**Message** : "Action irréversible, êtes-vous sûr ?"

---

## 🔔 Templates de Notification

### 1. Activation de Réservation

**Objet** : "✅ Réservation activée - Ticket #{ticket_number}"

**Style** :
- Couleur principale : Teal (#14B8A6)
- Icône : ✅
- CTA : "Voir mon ticket"

**Informations** :
- Nom de la file
- Numéro de ticket (gros)
- Lien de suivi

### 2. Confirmation de Modification

**Objet** : "📝 Réservation modifiée avec succès"

**Style** :
- Couleur principale : Indigo (#4F46E5)
- Icône : 📝

**Informations** :
- Nouveau créneau
- Nouvelle heure estimée
- Message de confirmation

### 3. Confirmation d'Annulation

**Objet** : "❌ Réservation annulée"

**Style** :
- Couleur principale : Gris (#64748B)
- Icône : ❌

**Informations** :
- Confirmation annulation
- Invitation à revenir

---

## 🧪 Tests

### Test Complet du Flux

```bash
# 1. Créer réservation (via UI ou API)
curl -X POST "$API/queues/{queue_id}/reservations" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "phone": "+33612345678",
    "reserved_time": "2024-01-20T14:00:00Z"
  }'
# → Retourne reservation_id

# 2. Voir la réservation
curl "$API/reservations/{reservation_id}"

# 3. Modifier la réservation
curl -X PUT "$API/reservations/{reservation_id}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "new@example.com",
    "phone": "+33612345678",
    "reserved_time": "2024-01-20T15:00:00Z"
  }'
# → Email de confirmation envoyé

# 4. Activer (admin)
curl -X POST "$API/reservations/{reservation_id}/activate" \
  -H "Authorization: Bearer $TOKEN"
# → Email + SMS d'activation envoyés
# → Ticket créé

# 5. Annuler (si pas activée)
curl -X DELETE "$API/reservations/{reservation_id}"
# → Email de confirmation envoyé
```

### Vérifier les Notifications

```bash
# Logs backend
tail -f /var/log/supervisor/backend.err.log | grep "📧"

# Rechercher activation
grep "activation notification" /var/log/supervisor/backend.err.log
```

---

## 📱 User Experience

### Scénario 1 : Modification Simple

1. Client crée réservation pour 14h
2. Reçoit email avec lien de gestion
3. Clique "Gérer ma réservation"
4. Clique "Modifier"
5. Change heure à 15h
6. Confirme
7. Reçoit email "Réservation modifiée"

### Scénario 2 : Annulation

1. Client a une réservation
2. Va sur `/reservation/{id}`
3. Clique "Annuler"
4. Confirme dans dialog
5. Reçoit email "Réservation annulée"
6. Redirected vers page file

### Scénario 3 : Activation par Admin

1. Admin voit réservation pending
2. Clique "Activer maintenant"
3. Système :
   - Crée ticket automatiquement
   - Envoie email au client
   - Envoie SMS si fourni
4. Client reçoit email avec numéro de ticket
5. Clique "Voir mon ticket"
6. Suit sa position en temps réel

---

## 🔐 Sécurité

### Accès Public

Les endpoints de gestion réservation sont **publics** (pas de JWT requis)

**Sécurité par obscurité** :
- ID de réservation = UUID aléatoire
- Difficile à deviner
- Pas de liste publique

**Protection** :
- Rate limiting (à implémenter si besoin)
- Validation des données
- Restrictions par statut

### Données Sensibles

- Email/téléphone stockés avec réservation
- Jamais affichés publiquement
- Utilisés uniquement pour notifications

---

## 📊 Logs et Monitoring

### Logs de Notifications

```
📧 Sending reservation activation notification to client@example.com
✓ Activation email sent to client@example.com
✓ Activation SMS sent to +33612345678
```

### Logs de Modifications

```
📧 Sending reservation update confirmation to client@example.com
✓ Update confirmation email sent
```

### Logs d'Annulation

```
📧 Sending cancellation confirmation to client@example.com
✓ Cancellation email sent
```

---

## 🎯 Statistiques

### Métriques Clés

**Backend** :
- 3 nouveaux endpoints (GET, PUT, DELETE)
- 3 templates email supplémentaires
- Intégration complète Resend + Twilio

**Frontend** :
- 1 nouvelle page (ManageReservation)
- 2 dialogues (Modifier, Annuler)
- Navigation fluide avec confirmation

**Notifications** :
- 5 types au total (approche, tour, activation, modification, annulation)
- Templates HTML responsive
- Fallback gracieux si pas de clés

---

## 🚀 Prochaines Améliorations

### Phase 1 (Court terme)
- [ ] Système de rappel avant créneau (24h avant)
- [ ] QR code unique par réservation
- [ ] Export réservations (CSV/PDF)

### Phase 2 (Moyen terme)
- [ ] Calendrier visuel des réservations
- [ ] Slots de temps configurables
- [ ] Limitation nombre réservations par créneau
- [ ] Surbooking intelligent

### Phase 3 (Long terme)
- [ ] Paiement en ligne (réservations premium)
- [ ] Programme de fidélité
- [ ] Analytics réservations vs walk-ins
- [ ] Intégration Google Calendar

---

## 💡 Conseils d'Usage

### Pour les Établissements

1. **Activation** : Activer les réservations 5-10 min avant créneau
2. **Communication** : Afficher QR code avec mention "Réservation possible"
3. **Gestion** : Vérifier réservations pending régulièrement
4. **Flexibilité** : Permettre aux clients de modifier facilement

### Pour les Clients

1. **Email** : Fournir email valide pour notifications
2. **Modification** : Possible jusqu'à activation
3. **Ponctualité** : Arriver 5 min avant créneau
4. **Lien** : Sauvegarder lien de gestion pour modifications

---

## 📞 Support

### Problèmes Courants

**"Impossible de modifier ma réservation"**
➡️ Vérifier statut : si activée, modification impossible

**"Je n'ai pas reçu l'email d'activation"**
➡️ Vérifier spam, vérifier clés API configurées

**"Lien de gestion ne fonctionne pas"**
➡️ Vérifier UUID complet dans URL

### Commandes Utiles

```bash
# Voir toutes les réservations d'une file
mongo queue_database --eval 'db.reservations.find({queue_id: "xxx"}).pretty()'

# Compter réservations par statut
mongo queue_database --eval 'db.reservations.aggregate([
  {$group: {_id: "$status", count: {$sum: 1}}}
])'
```

---

**Fait avec ❤️ par E1 (Emergent Agent)**
*Janvier 2025*
