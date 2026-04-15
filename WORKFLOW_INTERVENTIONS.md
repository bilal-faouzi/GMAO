# 📋 WORKFLOW COMPLET GMAO - GESTION DES INTERVENTIONS

## 🎯 Vue d'ensemble du flux

```
OPÉRATEUR
   ↓
Déclare une panne (+ photos)
   ↓
RESPONSABLE TECHNIQUE
   ↓
Valide/Rejette la demande
   ↓ (si validée)
Crée un Order de Travail (OT)
Affecte équipe ou technicien(s)
   ↓
TECHNICIEN / ÉQUIPE
   ↓
Exécute l'intervention
   ↓ (si besoin pièces)
MAGASINIER
   ↓
Alloue les pièces
   ↓ (retour technicien)
RESPONSABLE TECHNIQUE
   ↓
Reçoit rapport d'intervention
Valide la solution (corrigé ou dépanné)
   ↓
OPÉRATEUR
   ↓
Valide si équipement fonctionne
   ↓
OT → CLÔTURÉ ou reste DÉPANNÉ
```

---

## 📍 ÉTAPE 1 : OPÉRATEUR - Déclarer une panne

### 📍 Page: `/ordres/declarer` (Déclarer une panne)

**Actions disponibles:**
1. ✅ Sélectionner l'équipement en panne
2. ✅ Indiquer le niveau d'urgence (Critique / Haute / Normale / Basse)
3. ✅ Décrire précisément le problème
4. ✅ **[NOUVEAU]** Ajouter jusqu'à 5 photos du problème
5. ✅ Soumettre la demande

**Résultat:** 
- Demande créée avec numéro DI-YYYY-XXXX
- Status: **En attente**
- Responsable technique notifié
- Opérateur peut voir ses déclarations récentes

**Données enviées:**
```json
{
  "idActif": "uuid",
  "urgence": "critique|haute|normale|basse",
  "description": "texte",
  "fichiers": ["image1.jpg", "image2.jpg"]
}
```

---

## 📍 ÉTAPE 2 : RESPONSABLE TECHNIQUE - Valider/Créer OT

### 📍 Page: `/ordres/gestion` (Gestion OT - Responsable)

**Actions disponibles:**
1. ✅ Consulter la liste des demandes en attente
2. ✅ Visualiser les photos jointes
3. ✅ **Valider la demande** → Crée automatiquement un OT
4. ✅ **Rejeter la demande** → Indiquer motif
5. ✅ Sur l'OT créé:
   - Assigner une équipe interne OU un sous-traitant
   - Assigner technicien(s) spécifique(s)
   - Fixer une date de début d'intervention
   - Ajouter des notes internes

**Workflow:**
```
Demande DI-2026-0001 (En attente)
   ↓ Cliquer "Valider"
OT-2026-0001 créé (OUVERT)
   ↓ Affecter équipe
Équipe assignée (statut → EN_COURS)
   ↓ Technicien peut voir l'OT
```

**Données envoyées pour affectation:**
```json
{
  "idEquipe": "uuid ou null",
  "idSousTraitant": "uuid ou null",
  "dateDebut": "2026-04-13T10:00:00Z"
}
```

---

## 📍 ÉTAPE 3 : MAGASINIER - Allouer les pièces

### 📍 Page: `/magasin/sortie` (Interface Magasinier)

**Quand un technicien a besoin de pièces:**
1. ✅ Le magasinier accède à l'interface
2. ✅ Cherche l'OT (exemple: OT-2026-0001)
3. ✅ Sélectionne la pièce détachée
4. ✅ Indique la quantité
5. ✅ Enregistre la sortie → Stock décrémente automatiquement

**Résultat:**
- Pièce tracée sur l'OT
- Stock mis à jour
- Coût de pièce capturé
- Alertes si stock faible

**Données:**
```json
{
  "idOrdreTravail": "uuid",
  "idPiece": "uuid",
  "quantite": 2
}
```

---

## 📍 ÉTAPE 4 : RESPONSABLE TECHNIQUE - Rapport d'intervention

### 📍 Page: `/ordres/ots/:id/rapport` (Compte rendu OT) **[NOUVEAU]**

**Après que le technicien termine les travaux:**

1. ✅ **Documenter les travaux réalisés**
   - Quelles pièces changées ?
   - Quels réglages effectués ?
   - Quelle durée totale ?

2. ✅ **Noter les constatations**
   - État avant intervention
   - État après intervention
   - Observations importantes

3. ✅ **Identifier la cause racine**
   - Mécanique
   - Électrique
   - Erreur humaine
   - Facteur externe
   - Autre

4. ✅ **Résumer la solution**
   - Description claire de la solution
   - L'équipement est-il revenu à la normale ?

5. ✅ **Évaluer l'état final**

   **Option A: Réparation définitive** ✅
   - L'équipement fonctionne normalement
   - Prêt pour clôture immédiate
   - Status → EN_VALIDATION

   **Option B: Dépannage temporaire** ⚠️
   - Solution temporaire
   - Équipement fonctionne partiellement
   - Intervention ultérieure nécessaire
   - Status → EN_VALIDATION

**Résultat:**
- Rapport enregistré (commentaire interne)
- OT passe à status: **EN_VALIDATION**
- Opérateur reçoit la demande de validation

---

## 📍 ÉTAPE 5 : OPÉRATEUR - Validation finale

### 📍 Page: `/ordres/validation` (Validation des interventions)

**L'opérateur confirme ou refute la réparation:**

1. ✅ Voir l'OT en attente de validation
2. ✅ Lire le compte rendu du responsable
3. ✅ Tester/Vérifier l'équipement
4. ✅ Confirmer:

   **Option A: ✅ Équipement réparé**
   - OT: **CLÔTURÉ (corrigé)**
   - HistoriK → Fin d'intervention
   - Maintenance: succès complet

   **Option B: ⚠️ Problème persiste**
   - OT: reste **DÉPANNÉ**
   - Responsable technique notifié
   - Nouvelle intervention requise

**Données:**
```json
{
  "decisionFinale": "corrige|depanne",
  "motif": "Équipement fonctionne correctement"
}
```

---

## 📊 STATUTS OT - Cycle de vie

```
OUVERT
  ↓ (affectation)
EN_COURS
  ↓ (travaux terminés)
DEPANNE (temporaire)
  ← ← ← ← ← ← ← ← ←
  ↓ (après rapport)
EN_ATTENTE_CORRECTION
  ↑ (si besoin plus de travail)
EN_COURS
  ↓
EN_VALIDATION
  ↓ Opérateur valide ✅
CLOTURE ✅

EN_VALIDATION
  ↓ Opérateur refuse ⚠️
DEPANNE ⚠️ (boucle)
```

---

## 📱 STATUTS DEMANDE D'INTERVENTION (DI)

```
EN_ATTENTE
  ↓
VALIDÉE (OT créé) → CLÔTURÉE avec l'OT
  ↓
REJETÉE (motif expliqué)
```

---

## 🎯 RÔLES & PERMISSIONS

| Rôle | Pages Accès | Actions |
|------|-----------|---------|
| **Opérateur** | `/ordres/declarer` | Déclarer panne + photos |
| | `/ordres/validation` | Valider intervention finale |
| **Resp. Technique** | `/ordres/gestion` | Valider DI, créer OT, affecter équipe |
| | `/ordres/ots/:id/rapport` | Enregistrer rapport intervention |
| **Magasinier** | `/magasin/sortie` | Allouer pièces aux OT |
| **Technicien** | `/ordres/ots` | Voir OT assignés |
| | `/ordres/ots/:id` | Voir détails OT |
| **Directeur** | Tous les rapports | Audit + dashboards |

---

## 📅 WORKFLOW COMPLET - EXEMPLE CONCRET

```
09:15 - OPÉRATEUR Ali
  ✅ Déclare une panne sur Moteur A (CRITIQUE)
  ✅ Ajoute 3 photos du moteur en panne
  📌 Demande DI-2026-0152 créée

09:30 - RESPONSABLE TECHNIQUE Karim
  ✅ Reçoit notification
  ✅ Consulte photos
  ✅ Valide la demande
  📌 OT-2026-0512 créé automatiquement

09:45 - RESPONSABLE TECHNIQUE Karim
  ✅ Assigne Équipe Mécanique
  ✅ Assigne Techniciens: Mohamed + Ahmed
  ✅ Date début: 09:45 (maintenant)
  📌 OT passe à EN_COURS

10:00 - TECHNICIEN Mohamed
  ✅ Voit OT-2026-0512 assigné
  ✅ Lance travaux sur le moteur
  ✅ Après 45 min, besoin de pièce: Courroie d'entraînement

10:45 - MAGASINIER Fatima
  ✅ Reçoit demande du technicien
  ✅ Cherche OT-2026-0512
  ✅ Sélectionne "Courroie d'entraînement"
  ✅ Alloue 1 unité
  📌 Stock: 15 → 14
  📌 Coût capturé: 250 MAD

11:15 - TECHNICIEN Mohamed
  ✅ Reçoit la courroie
  ✅ Installe la pièce
  ✅ Teste le moteur
  ✅ Moteur fonctionne parfaitement!

11:30 - RESPONSABLE TECHNIQUE Karim
  ✅ Va à /ordres/ots/OT-2026-0512/rapport
  ✅ Documente:
     - Travaux: "Remplacement courroie d'entraînement"
     - Cause: "Usure mécanique"
     - Solution: "Courroie neuve installée, moteur testé OK"
     - État final: ✅ Réparation définitive
  📌 OT passe à EN_VALIDATION

12:00 - OPÉRATEUR Ali
  ✅ Va à /ordres/validation
  ✅ Voit OT-2026-0512 en attente
  ✅ Lit rapport: "Réparation définitive"
  ✅ Va vérifier moteur: fonctionne parfaitement ✅
  ✅ Valide: "Corrigé"
  📌 OT-2026-0512 → CLÔTURÉ ✅

---

RÉSUMÉ:
- Cycle: 2h45 minutes (09:15 → 12:00)
- Panne signalée → Réparée → Validée
- Coût matière: 250 MAD
- Coût main-d'œuvre: ~2h (à calculer selon tarifs)
- Historique complet conservé
```

---

## 🔧 CONFIGURATION TECHNIQUE

### Backend Routes Nécessaires

```
POST   /api/v1/ordres/demandes/          # Créer demande
POST   /api/v1/ordres/demandes/{id}/telecharger_fichiers/  # Upload images
POST   /api/v1/ordres/demandes/{id}/valider/
POST   /api/v1/ordres/demandes/{id}/rejeter/

POST   /api/v1/ordres/ots/              # Créer OT
POST   /api/v1/ordres/ots/{id}/changer_statut/
POST   /api/v1/ordres/ots/{id}/affecter_equipe/
POST   /api/v1/ordres/ots/{id}/ajouter_commentaire/
POST   /api/v1/ordres/ots/{id}/cloturer/

POST   /api/v1/ordres/ots/{id}/enregistrer_piece/  # Magasinier
```

### Modèles Utilisés

- `DemandeIntervention` → Panne signalée
- `PieceJointeDI` → Photos
- `OrdreTravail` → Commande de travail
- `AffectationEquipe` → Assignation
- `CommentaireOT` → Rapports + notes
- `PieceUtiliseeOT` → Pièces utilisées
- `HistoriqueStatutOT` → Audit

---

## ✅ CHECKLIST DÉPLOIEMENT

- [ ] Backend: Endpoint upload fichiers créé
- [ ] Frontend: DeclarerPanne.jsx avec upload d'images
- [ ] Frontend: CompteRenduOT.jsx créé
- [ ] Routes: Toutes les routes ajoutées à App.jsx
- [ ] Permissions: Rôles configurés
- [ ] Tests: Workflow complet testé de A à Z
- [ ] Documentation: Équipe formée

---

## 🚀 UTILISATION QUOTIDIENNE

### Pour un OPÉRATEUR:
```
1. Aller à /ordres/declarer
2. Décrire la panne + ajouter photos
3. Aller à /ordres/validation pour valider finales
```

### Pour un RESPONSABLE TECHNIQUE:
```
1. Aller à /ordres/gestion
2. Valider/Créer les OT
3. Aller à /ordres/ots/:id/rapport pour finaliser
```

### Pour un MAGASINIER:
```
1. Aller à /magasin/sortie
2. Chercher l'OT
3. Allouer les pièces
```

---

**Documentation créée:** Avril 2026
**Workflow validé:** Workflow complet opérationnel
