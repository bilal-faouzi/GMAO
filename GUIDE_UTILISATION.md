# 🔧 GMAO - GUIDE COMPLET DU WORKFLOW D'INTERVENTIONS

## 📖 Table des matières
1. [Vue d'ensemble](#vue-densemble)
2. [Interface Opérateur](#interface-opérateur)
3. [Interface Responsable Technique](#interface-responsable-technique)
4. [Interface Magasinier](#interface-magasinier)
5. [Interface Validation](#interface-validation)
6. [FAQ](#faq)

---

## 🎯 Vue d'ensemble

Le système GMAO suivant gère le cycle complet d'une intervention maintenance:

```
👷 OPÉRATEUR signale panne avec photos
      ↓
🔍 RESPONSABLE valide + crée l'ordre de travail
      ↓
👨‍🔧 TECHNICIEN exécute l'intervention
      ↓ (si besoin)
📦 MAGASINIER fournit les pièces
      ↓
📋 RESPONSABLE rédige le rapport final
      ↓
✅ OPÉRATEUR valide le résultat
```

---

## 👷 Interface Opérateur - Déclarer une panne

**URL:** `http://localhost:5174/ordres/declarer`

### 📍 Étapes

#### 1️⃣ Sélectionner l'équipement
```
• Chercher par code (ex: "MOT-001")
• Chercher par nom (ex: "Moteur principal")
• Cliquer sur l'équipement dans la liste
```

#### 2️⃣ Choisir le niveau d'urgence
```
🔴 CRITIQUE  → Production arrêtée, intervention immédiate
🟠 HAUTE     → Impact fort, traiter dans la journée
🔵 NORMALE   → Gêne partielle, attendre quelques jours
⚪ BASSE     → Non urgent, selon disponibilité
```

#### 3️⃣ Décrire le problème
```
Soyez précis:
• Quel est le symptôme ? (bruit, fuite, arrêt, etc.)
• Depuis quand ?
• Dans quelles conditions ?
• Est-ce partiel ou complet ?
```

#### 4️⃣ **[NOUVEAU]** Ajouter des photos
```
✅ Cliquer sur la zone de téléversement
✅ Sélectionner jusqu'à 5 images
✅ Les photos aident le responsable à diagnostiquer
✅ Les aperçus s'affichent avant envoi
✅ Vous pouvez supprimer une photo en cliquant X
```

#### 5️⃣ Cliquer "Déclarer la panne"
```
✅ Demande créée avec numéro DI-YYYY-XXXX
✅ Responsable technique notifié
✅ Vous pouvez suivre l'état dans "Mes déclarations récentes"
```

### 📊 États possibles de votre demande

| État | Signification | Prochaine action |
|------|---------------|------------------|
| **En attente** 🕐 | Responsable en cours de review | Attendre validation |
| **Validée** ✅ | OT créé, intervention programmée | Suivre sur dashboard |
| **Rejetée** ❌ | Demande non acceptée | Voir motif du rejet |

---

## 🔍 Interface Responsable Technique - Gestion des OT

**URL:** `http://localhost:5174/ordres/gestion`

### 📍 Responsabilités

#### 1️⃣ Valider les demandes d'intervention
```
• Consulter la liste des DI en attente
• Voir les photos jointes par l'opérateur
• Décision:
   ✅ VALIDER → Crée automatiquement un OT
   ❌ REJETER → Indiquer motif (équipement hors service, etc.)
```

#### 2️⃣ Créer et configurer l'Ordre de Travail (OT)
```
Une fois la DI validée:
• OT-YYYY-XXXX créé automatiquement
• Status: OUVERT
• Associé à l'équipement de la demande
• Hérité de l'urgence (priorité)
```

#### 3️⃣ Affecter le personnel
```
Options:
A) Équipe interne:
   • Sélectionner une équipe (Mécanique, Électrique, etc.)
   • Les techniciens seront assignés
   
B) Sous-traitant:
   • Sélectionner parmi sous-traitants actifs
   • Sous-traitant reçoit la commande
   
C) Technicien spécifique:
   • Nommer directement le responsable
   • Utile pour travaux spécialisés
```

#### 4️⃣ Définir la date de début
```
• Sélectionner quand l'intervention doit commencer
• Par défaut: maintenant
• Peut être programmée dans le futur
```

#### 5️⃣ Ajouter des notes internes
```
• Contexte supplémentaire
• Historique problème
• Spécificités équipement
• Notes visibles seulement à l'équipe maintenance
```

### ⚠️ Points importants

```
✅ Toujours voir les photos avant décision
✅ Si urgent (CRITIQUE), APPELER directement le chef équipe
✅ Fixer date réaliste pour affectation
✅ Rajouter contexte si complexe
❌ Ne pas créer OT sans comprendre la panne
```

---

## 📋 Rôle pendant l'intervention

Une fois l'OT créé et l'équipe assignée:

**Le responsable technique reste disponible pour:**
```
• Consulter l'avancement de l'intervention
• Valider demandes de pièces du magasinier
• Intervenir si problème complexe
• À la fin → Rédiger le compte rendu
```

---

## 📦 Interface Magasinier - Allocation des pièces

**URL:** `http://localhost:5174/magasin/sortie`

### 📍 Étapes d'allocation

#### 1️⃣ Chercher l'Ordre de Travail
```
• Entrer numéro OT (ex: OT-2026-0512)
• OU chercher par équipement
• OU par responsable
```

#### 2️⃣ Sélectionner la pièce
```
• Le technicien vous demande une pièce
• Chercher par référence (ex: "CRB-001")
• OU par désignation (ex: "Courroie d'entraînement")
• OU par emplacement magasin
```

#### 3️⃣ Indiquer la quantité
```
⚠️ VÉRIFIER stock disponible
✅ Entrer quantité demandée
✅ Si stock insuffisant → Message d'alerte
❌ Ne pas dépasser le stock
```

#### 4️⃣ Enregistrer la sortie
```
✅ Cliquer "Enregistrer"
✅ Pièce tracée sur l'OT
✅ Stock décrémente automatiquement
✅ Coût capturé (prix unitaire × quantité)
```

### 📊 Alertes stock

Si vous voyez des alertes rouges en haut:
```
⚠️ X pièce(s) sous le seuil minimum
• Vérifier stocks critiques
• Passer commandes fournisseur
• Communication avec chef de projet
```

---

## 📋 Compte Rendu de l'OT - Responsable Technique

**URL:** `http://localhost:5174/ordres/ots/:id/rapport` (après les travaux)

Au moment où le technicien termine l'intervention:

### 📍 Phases du rapport

#### 1️⃣ Documenter les travaux
```
Détailler TOUT ce qui a été fait:
• "Remplacement moteur électrique"
• "Ajustement courroies"
• "Nettoyage ventilateurs"
• "Réglage capteurs"
• Pièces spécifiques utilisées
```

#### 2️⃣ Constatations
```
État AVANT:
• "Moteur bruyant, surchauffe après 2 heures"
• "Vibrations excessives"

État APRÈS:
• "Moteur silencieux"
• "Température normale"
• "Pas de vibrations"
```

#### 3️⃣ Identifier la cause racine
```
Choisir parmi:
🔧 MÉCANIQUE     → Usure, jeu, alignement
⚡ ÉLECTRIQUE     → Court-circuit, isolant défaillant
👤 ERREUR HUMAIN  → Mauvaise maintenance, surcharge
🌍 EXTERNE        → Conditions, pollution, surcharge
❓ AUTRE          → À préciser dans description
```

#### 4️⃣ Résumer la solution
```
Décrire clairement:
• Qu'a-t-on fait exactement ?
• Pourquoi cela résout le problème ?
• Est-ce définitif ou temporaire ?
• Y a-t-il besoin de maintenance préventive ?
```

#### 5️⃣ **État final de l'équipement**

##### ✅ Option 1: Réparation DÉFINITIVE
```
Quand: L'équipement fonctionne normalement

Conséquences:
• OT passera à EN_VALIDATION
• Opérateur fera rapide vérification
• OT sera CLÔTURÉ immédiatement après
• Intervention considérée comme réussie

À utiliser si: 100% confiance que c'est réparé
```

##### ⚠️ Option 2: Dépannage TEMPORAIRE
```
Quand: Solution partielle, équipement partiellement fonctionnel

Exemple: "Balance balance correctement mais pèse
5% moins qu'avant. Besoin ajustement capteur demain."

Conséquences:
• OT passera à EN_VALIDATION
• Opérateur confirmera le dépannage
• OT restera en DÉPANNÉ
• Nouvelle intervention requise

À utiliser si: Solution non définitive
```

---

## ✅ Validation Final - Opérateur

**URL:** `http://localhost:5174/ordres/validation`

### 📍 Étapes de validation

**Vue:** Liste des OT en attente de validation (EN_VALIDATION)

#### 1️⃣ Consulter l'OT
```
• Infos: Numéro, équipement, priorité
• Lire le rapport du responsable
• Voir toutes les actions effectuées
```

#### 2️⃣ Tester l'équipement
```
Vous vous rendez physiquement sur l'équipement:
• Démarrer, tester, valider fonctionnement
• Comparer avec rapport du technicien
• Poser questions si incohérences
```

#### 3️⃣ Décider du statut final

##### ✅ ÉQUIPEMENT RÉPARÉ (Corrigé)
```
Condition: Fonctionne normalement 100%

Cliquer: "✅ Confirmation réparation"

Résultat:
• OT → CLÔTURÉ ✅
• Intervention terminée
• Rapport d'intervention conservé
• Coûts finalisés
```

##### ⚠️ PROBLÈME PERSISTE (Dépanné)
```
Condition: N'a pas fonctionné comme décrit

Cliquer: "⚠️ Signaler dépannage"

Résultat:
• OT reste en DÉPANNÉ
• Responsable technique notifié
• Nouvelle intervention requise
• Cycle recommence
```

---

## FAQ - Questions Fréquentes

### ❓ Comment puis-je ajouter plusieurs techniciens sur un OT ?

**Responsable Technique:**
```
1. Créer l'OT
2. Première affectation: Équipe + Chef technicien
3. Dans l'OT → Ajouter des "Membres intervention"
4. Chaque technicien peut enregistrer son temps
```

### ❓ Que faire si stocks insuffisan? (Pièce manquante)

**Magasinier:**
```
✅ L'application affiche alerte
❌ Pas de validation si stock insuffisant
→ Commander la pièce fournisseur
→ Contacter responsable maintenance
→ OT reste EN_COURS en attente
```

### ❓ Comment annuler une demande d'intervention ?

**Actuellement:**
```
✅ Responsable peut REJETER avant création OT
❌ Après OT créé → pas d'annulation directe
→ Créer OT avec status ANNULÉ ou clôturer sans action
```

### ❓ Qui peut voir les images joinées à la panne ?

**Visibilité:**
```
✅ Opérateur: Peut voir ses photos
✅ Responsable technique: DOIT les consulter avant décision
❌ Magasinier: Non (pas pertinent)
❌ Opérateur autre: Voit que nombre de pièces jointes
```

### ❓ Comment enregistrer le temps réel d'intervention ?

**Technicien:**
```
À chaque session de travail:
1. Enregistrer "Suivi temps" dans l'OT
2. Heure début, heure fin, description 
3. Le système calcule automatiquement durée
4. Temps total utilisé pour coût MO
```

### ❓ Comment voir les coûts d'une intervention ?

**Responsable/Directeur:**
```
Sur l'OT → Section "Coûts":
• Coût matière (pièces) = Σ (quantité × prix)
• Coût main-d'œuvre = Durée réelle × tarif horaire
• Coût sous-traitance = Si ext erne
• TOTAL = Somme de tous les coûts
```

### ❓ Que faire en cas de panne critique (arrêt production) ?

**Processus URGENCE:**
```
1. OPÉRATEUR: Déclarer avec URGENCE = CRITIQUE
2. ⏰ Responsable reçoit alerte immédiate
3. RESPONSABLE: Appeler directement chef équipe
4. Validation rapide, OT créé en 5 min
5. Équipe mobilisée IMMÉDIATEMENT
```

---

## 🚀 Conseils pratiques

### Pour OPÉRATEUR:
```
✅ Toujours prendre photos si possible (angle clair)
✅ Décrire AVANT d'appeler → permet triage urgence
✅ Avancer l'équipement si panne non urgente
✅ Noter l'heure exacte du problème
```

### Pour RESPONSABLE:
```
✅ Valider demandes le plus tôt possible
✅ Programmer affectation réaliste (buffer 30min)
✅ Communiquer les délais à l'opérateur
✅ Dans doute → consulter le technicien senior
```

### Pour MAGASINIER:
```
✅ Toujours vérifier stock avant confirmation
✅ Signaler ruptures au responsable achats
✅ Conserver historique sorties par OT
✅ Coûts capturés = meilleure traçabilité
```

---

## 📞 Support & Contact

Problème? Questions?
```
• Message équipe maintenance: Slack #gmao-support
• Email: maintenance@company.com
• Responsable GMAO: Direction Technique
```

---

**Document:** Guide Complet GMAO v1.0  
**Créé:** Avril 2026  
**Langue:** Français  
**Statut:** Opérationnel ✅
