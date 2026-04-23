# 📋 Guide Pratique - Consultation du Journal d'Audit

## Accès via l'API

### 1. **Lire tout le journal d'audit**
```bash
GET /api/auth/journal-audits/
Authorization: Bearer {access_token}
```

**Réponse:**
```json
{
  "count": 245,
  "next": "/api/auth/journal-audits/?page=2",
  "previous": null,
  "results": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "id_utilisateur": "123e4567-e89b-12d3-a456-426614174000",
      "horodatage": "2026-04-23T14:30:45.123456Z",
      "action": "CREATE",
      "module": "ORGANISATION",
      "type_entite": "Societe",
      "id_entite": "789e4567-e89b-12d3-a456-426614174999",
      "ancienne_valeur": null,
      "nouvelle_valeur": {
        "code": "ACME",
        "libelle": "ACME Corporation"
      },
      "adresse_ip": "192.168.1.100"
    },
    ...
  ]
}
```

### 2. **Filtrer par module**
```bash
GET /api/auth/journal-audits/?module=ORDRES
Authorization: Bearer {access_token}
```

### 3. **Filtrer par type d'action**
```bash
GET /api/auth/journal-audits/?action=CREATE
Authorization: Bearer {access_token}
```

### 4. **Filtrer par entité**
```bash
GET /api/auth/journal-audits/?type_entite=OrdreTravail
Authorization: Bearer {access_token}
```

### 5. **Filtrer par utilisateur**
```bash
GET /api/auth/journal-audits/?id_utilisateur=123e4567-e89b-12d3-a456-426614174000
Authorization: Bearer {access_token}
```

## Scénarios Réels d'Audit

### Scénario 1: Création d'une Société
```bash
POST /api/v1/organisation/societes/
Content-Type: application/json
Authorization: Bearer {token}

{
  "code": "ACME",
  "libelle": "ACME Corporation"
}
```

**Journal d'audit généré:**
```json
{
  "action": "CREATE",
  "module": "ORGANISATION",
  "type_entite": "Societe",
  "ancienne_valeur": null,
  "nouvelle_valeur": {
    "code": "ACME",
    "libelle": "ACME Corporation"
  }
}
```

### Scénario 2: Modification d'un Actif
```bash
PATCH /api/v1/actifs/actifs/789e4567-e89b-12d3-a456-426614174999/
Content-Type: application/json

{
  "libelle": "Pompe modifiée",
  "statut": "en_maintenance"
}
```

**Journal d'audit généré:**
```json
{
  "action": "UPDATE",
  "module": "ACTIFS",
  "type_entite": "Actif",
  "ancienne_valeur": {
    "libelle": "Pompe",
    "statut": "actif",
    "estActif": true
  },
  "nouvelle_valeur": {
    "libelle": "Pompe modifiée",
    "statut": "en_maintenance",
    "estActif": true
  }
}
```

### Scénario 3: Changement de Statut d'un Actif
```bash
POST /api/v1/actifs/actifs/789e4567-e89b-12d3-a456-426614174999/changer_statut/
Content-Type: application/json

{
  "nouveauStatut": "en_panne",
  "motif": "Défaillance du moteur"
}
```

**Journal d'audit généré:**
```json
{
  "action": "CHANGE_STATUS",
  "module": "ACTIFS",
  "type_entite": "Actif",
  "ancienne_valeur": {
    "statut": "en_maintenance"
  },
  "nouvelle_valeur": {
    "statut": "en_panne",
    "motif": "Défaillance du moteur"
  }
}
```

### Scénario 4: Sortie de Stock (Magasin)
```bash
POST /api/v1/magasin/pieces/550e8400-e29b-41d4-a716-446655440000/sortie/
Content-Type: application/json

{
  "quantite": "5.50",
  "idOrdreTravail": "OT-2026-001",
  "commentaire": "Pièces utilisées pour OT-2026-001"
}
```

**Journal d'audit généré:**
```json
{
  "action": "STOCK_SORTIE",
  "module": "MAGASIN",
  "type_entite": "Piece",
  "ancienne_valeur": {
    "quantiteStock": "100.00"
  },
  "nouvelle_valeur": {
    "quantiteStock": "94.50",
    "quantite_sortie": "5.50"
  }
}
```

### Scénario 5: Validation d'une Demande d'Intervention
```bash
POST /api/v1/ordres/demandes-interventions/550e8400-e29b-41d4-a716-446655440000/valider/
Authorization: Bearer {token}
```

**Journal d'audit généré:**
```json
{
  "action": "VALIDER",
  "module": "ORDRES",
  "type_entite": "DemandeIntervention",
  "ancienne_valeur": {
    "statut": "en_attente"
  },
  "nouvelle_valeur": {
    "statut": "validee",
    "ot_numero": "OT-2026-001"
  }
}
```

### Scénario 6: Clôture d'un Ordre de Travail
```bash
POST /api/v1/ordres/ordres-travails/550e8400-e29b-41d4-a716-446655440000/cloturer/
Content-Type: application/json

{
  "typeCloture": "corrige",
  "motif": "Maintenance corrective réussie"
}
```

**Journal d'audit généré:**
```json
{
  "action": "CLOTURER",
  "module": "ORDRES",
  "type_entite": "OrdreTravail",
  "ancienne_valeur": {
    "statut": "EN_COURS"
  },
  "nouvelle_valeur": {
    "statut": "CLOTURE",
    "duree": 480,
    "type_cloture": "corrige"
  }
}
```

### Scénario 7: Changement de Statut d'un Sous-traitant
```bash
POST /api/v1/soustraitants/550e8400-e29b-41d4-a716-446655440000/changer_statut/
Content-Type: application/json

{
  "statut": "suspendu",
  "motif": "Non-conformité détectée"
}
```

**Journal d'audit généré:**
```json
{
  "action": "SOUS_TRAITANT_STATUT_CHANGE",
  "module": "SOUS_TRAITANCE",
  "type_entite": "SousTraitant",
  "ancienne_valeur": {
    "statut": "actif"
  },
  "nouvelle_valeur": {
    "ancienStatut": "actif",
    "nouveauStatut": "suspendu",
    "motif": "Non-conformité détectée",
    "affectationsImpactees": []
  }
}
```

## Requêtes SQL pour l'Analyse

### Toutes les actions d'un utilisateur
```sql
SELECT * FROM journal_audit 
WHERE id_utilisateur = '{user_id}' 
ORDER BY horodatage DESC;
```

### Modifications d'un enregistrement spécifique
```sql
SELECT * FROM journal_audit 
WHERE id_entite = '{entity_id}' 
ORDER BY horodatage ASC;
```

### Activité par module
```sql
SELECT module, COUNT(*) as total, action, COUNT(*) 
FROM journal_audit 
WHERE horodatage >= NOW() - INTERVAL 7 DAY
GROUP BY module, action
ORDER BY total DESC;
```

### Utilisateurs les plus actifs
```sql
SELECT u.nom_utilisateur, COUNT(*) as total 
FROM journal_audit ja
JOIN utilisateur u ON ja.id_utilisateur = u.id
WHERE ja.horodatage >= NOW() - INTERVAL 30 DAY
GROUP BY u.id, u.nom_utilisateur
ORDER BY total DESC;
```

## Utilisation Programmatique (Django)

### Interroger l'audit depuis le code
```python
from apps.securite.models import JournalAudit
from datetime import timedelta
from django.utils import timezone

# Derniers 10 changements
recent = JournalAudit.objects.all().order_by('-horodatage')[:10]

# Modifications d'une entité spécifique (ex: Actif)
entity_history = JournalAudit.objects.filter(
    type_entite='Actif',
    id_entite='789e4567-e89b-12d3-a456-426614174999'
).order_by('horodatage')

# Actions d'aujourd'hui
today = timezone.now().date()
today_logs = JournalAudit.objects.filter(
    horodatage__date=today
)

# Créations dans le module ORDRES
creations = JournalAudit.objects.filter(
    module='ORDRES',
    action='CREATE'
).count()
```

## Informations Enregistrées

Chaque entrée d'audit contient:

| Champ | Description |
|-------|-------------|
| `id` | UUID unique de l'entrée |
| `id_utilisateur` | Utilisateur qui a effectué l'action |
| `horodatage` | Timestamp exact (UTC) |
| `action` | CREATE, UPDATE, DELETE, CHANGE_STATUS, etc. |
| `module` | ORGANISATION, ACTIFS, MAGASIN, ORDRES, etc. |
| `type_entite` | Societe, Actif, Piece, OrdreTravail, etc. |
| `id_entite` | UUID de l'entité modifiée |
| `ancienne_valeur` | Dict avec les anciennes valeurs (pour UPDATE/DELETE) |
| `nouvelle_valeur` | Dict avec les nouvelles valeurs (pour CREATE/UPDATE) |
| `adresse_ip` | Adresse IP du client |

## Conformité & Traçabilité

✅ **Piste d'audit complète**: Chaque modification est enregistrée avec:
- Qui a fait l'action (utilisateur)
- Quand (horodatage)
- Quoi (type d'entité)
- Quoi exactement (ancienne vs nouvelle valeur)
- D'où (adresse IP)

✅ **Non-répudiation**: Impossible de nier une action effectuée
✅ **Immuabilité**: Les entrées d'audit ne sont jamais modifiées
✅ **Conformité légale**: Aide à répondre aux exigences de conformité

