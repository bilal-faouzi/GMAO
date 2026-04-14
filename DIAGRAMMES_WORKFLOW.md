# 🎯 DIAGRAMME COMPLET DU WORKFLOW INTERVENTIONS

## 📊 FLUX GLOBAL - Vue narrative

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SYSTÈME GMAO - WORKFLOW INTERVENTIONS                    │
└─────────────────────────────────────────────────────────────────────────────┘

    TEMPS → →  →  →  →  →

    JOUR 1: MATIN                  JOUR 1: APRÈS-MIDI              JOUR 2

 ┌──────────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
 │  OPÉRATEUR - 09:15   │     │  RESPONSABLE - 14:00 │     │  OPÉRATEUR - 11:30   │
 │  Déclare panne       │────▶│  Rédige rapport      │───▶ │  Valide résultat     │
 └──────────────────────┘     └──────────────────────┘     └──────────────────────┘
       ✅ Photos                    ✅ Travaux détaillés           ✅ Tester équipement
       ✅ Description              ✅ Cause racine                 ✅ Confirmer réparation
       📌 DI créée                 ✅ Solution                     ✅ Clôturer OT
                                                                     
                              ▲              │
                              │              │             ┌──────────────────────┐
                              │              └────────────▶│   MAGASINIER - 11:45 │
                              │                            └──────────────────────┘
                              │                                   SI BESOIN PIÈCES
                    ┌──────────┴─────────────┐                   ✅ Chercher OT
                    │ RESPONSABLE - 09:30    │                   ✅ Allouer pièces
                    │ Valide demande         │                   ✅ Enregistrer sortie
                    │ Crée OT                │
                    │ Affecte équipe         │
                    └────────────────────────┘
                          ✅ Voir photos
                          ✅ Valider/Rejeter
                          ✅ Assigner personnel
                          📌 OT créé → EN_COURS
```

---

## 🔄 CYCLE DE VIE COMPLET - États & transitions

```
┌─────────────────────────────────────────────────────────────────────┐
│           DEMANDE D'INTERVENTION (DI) - Cycle complet               │
└─────────────────────────────────────────────────────────────────────┘

                       ┌─────────────────┐
                       │   EN ATTENTE    │
                       │   Opérateur     │
                       │   signale panne │
                       │  + 5 photos max │
                       └────────┬────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
              ✅ VALIDER            ❌ REJETER
                    │                       │
         ┌──────────▼─────────┐  ┌─────────▼────────┐
         │     VALIDÉE        │  │     REJETÉE      │
         │ OT-YYYY-XXXX créé  │  │  Motif expliqué  │
         │ Intervention       │  │  Fin du processus│
         │ programmée         │  └──────────────────┘
         └──────────┬─────────┘
                    │
          (OT créé et géré)
                    │
         ┌──────────▼──────────────────┐
         │      CLÔTURÉE               │
         │ Quand OT est CLÔTURÉ        │
         │ (Intervention terminée      │
         │  et validée)                │
         └─────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────┐
│             ORDRE DE TRAVAIL (OT) - Cycle complet                   │
└─────────────────────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │   OUVERT     │
                    │ OT créé      │
                    │ Prêt à être  │
                    │ assigné      │
                    └──────┬───────┘
                           │
            (Affecter équipe/technicien)
                           │
                    ┌──────▼────────┐
                    │   EN COURS    │◄─────┐
                    │ Intervention  │      │ Retour si
                    │ en cours      │      │ besoin más travail
                    └──────┬────────┘      │
                           │               │
          (Travaux terminés, rapport rédigé)
                           │
                ┌──────────┴──────────┐
                │                     │
            ✅ RÉPARÉ            ⚠️ DÉPANNÉ
            (définitif)         (temporaire)
                │                     │
                │                     │
         ┌──────▼───────┐      ┌─────▼──────┐
         │ EN_VALIDATION│      │ EN_ATTENTE │
         │ Opérateur    │      │ CORRECTION │
         │ valide si OK │      │ Besoin +   │
         └──────┬───────┘      │ travail    │
                │              └─────┬──────┘
         (Opérateur confirme)        │
                │               (Réassigner)
                │               │
         ┌──────▼─────────────────┐
         │     CLÔTURÉ ✅         │
         │ Intervention réussie   │
         │ OT archivé             │
         │ Historique conservé    │
         └────────────────────────┘
```

---

## 👥 RESPONSABILITÉS PAR RÔLE

```
┌─────────────────────────────────────────────────────────────────┐
│                    MATRICE RÔLES × ACTIONS                      │
└─────────────────────────────────────────────────────────────────┘

       OPÉRATEUR           RESPONSABLE             MAGASINIER
                          TECHNIQUE
   
   09:15                  09:30                   11:45
   ▼                      ▼                       ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ ✅ DÉCLARER      │  │ ✅ VALIDER/      │  │ ✅ CHERCHER      │
│    PANNE         │  │    REJETER DI    │  │    OT            │
│                  │  │                  │  │                  │
│ ✅ Sélectionner  │  │ ✅ CRÉER OT      │  │ ✅ SÉLECTIONNER │
│    équipement    │  │                  │  │    PIÈCE         │
│                  │  │ ✅ AFFECTER      │  │                  │
│ ✅ URGENCE       │  │    ÉQUIPE/       │  │ ✅ QUANTITÉ      │
│    (✅✅✅✨)      │  │    TECHNICIEN    │  │                  │
│                  │  │                  │  │ ✅ VÉRIFIER      │
│ ✅ DESCRIPTION   │  │ ✅ RÉDIGER       │  │    STOCK         │
│    détaillée     │  │    RAPPORT       │  │                  │
│                  │  │                  │  │ ✅ ENREGISTRER   │
│ ✨ AJOUTER       │  │ ✅ CHOISIR       │  │    SORTIE        │
│    PHOTOS        │  │    ÉTAT FINAL    │  │                  │
│   (5 max)        │  │    - Réparé ✅  │  │ ✅ NOTIFIER      │
│                  │  │    - Dépanné ⚠️  │  │    TECHNICIEN    │
│ ✅ SOUMETTRE     │  │    - Cause      │  │                  │
│                  │  │    - Solution   │  │                  │
│ ✅ VALIDER FIN   │  └──────────────────┘  └──────────────────┘
│    (dernière)    │
│                  │  ⏰ Si besoin pièces: 1-2h après début OT
│ 👁️ SURVEILLER     │  ⏰ Rapport: Fin de l'intervention
│    HISTORIQUE    │
└──────────────────┘


⏰ TIMELINE TYPE:

09:15 ──────────────────────► Opérateur déclare + photos
        ↓ 15 min
09:30 ──────────────────────► Responsable valide → OT créé
        ↓ 45 min
10:15 ──────────────────────► Technicien reçoit et commence
        ↓ 1h30 min
11:45 ──────────────────────► Besoin pièce → Magasinier alloue
        ↓ 30 min
12:15 ──────────────────────► Technicien termine travaux
        ↓ 15 min
12:30 ──────────────────────► Responsable rédige rapport
        ↓ 30 min
13:00 ──────────────────────► Opérateur teste et valide
                             ✅ OT CLÔTURÉ
```

---

## 📱 INTERFACES IMPLÉMENTÉES

```
┌─────────────────────────────────────────────────────────────────┐
│                         PAGES DISPONIBLES                        │
└─────────────────────────────────────────────────────────────────┘

1️⃣ /ordres/declarer
   ┌────────────────────────────────────┐
   │  DÉCLARER UNE PANNE                │
   │                                    │
   │  1. Selectionner Équipement        │  👷 OPÉRATEUR
   │  2. Urgence (◎◎◎◎)                 │
   │  3. Description                    │
   │  4. ✨ Photos (drag-drop)          │ ← NOUVEAU
   │  5. Envoyer                        │
   │                                    │
   │  [Recent list]                     │
   └────────────────────────────────────┘

2️⃣ /ordres/gestion
   ┌────────────────────────────────────┐
   │  GESTION OT (RESPONSABLE)          │
   │                                    │
   │  [Demandes en attente]             │ 🔍 RESPONSABLE
   │  - DI-0001 review photos ✅✅✅    │  TECHNIQUE
   │  - Can ACCEPT/REJECT               │
   │                                    │
   │  [OT assignations]                 │
   │  - OT-0001 → Équipe X              │
   │  - OT-0002 → ST Y                  │
   │  - Can change status               │
   └────────────────────────────────────┘

3️⃣ /magasin/sortie
   ┌────────────────────────────────────┐
   │  INTERFACE MAGASINIER              │
   │                                    │
   │  [Search OT]                       │ 📦 MAGASINIER
   │  OT-0001: MOT-001 [Motif...]      │
   │                                    │
   │  [Select Pièce]                    │
   │  CRB-001: Courroie                │
   │  Quantité: 1                       │
   │  Stock:  15 ✅                     │
   │                                    │
   │  [Enregistrer]                     │
   │  ✅ Sortie tracée                  │
   └────────────────────────────────────┘

4️⃣ /ordres/ots/:id/rapport ✨ NOUVEAU
   ┌────────────────────────────────────┐
   │  COMPTE RENDU INTERVENTION         │
   │                                    │
   │  📋 Travaux réalisés               │ 🔍 RESPONSABLE
   │  [textarea: détails]               │  TECHNIQUE
   │                                    │
   │  🔍 Constatations                  │
   │  [textarea: avant/après]           │
   │                                    │
   │  ⚙️ Cause racine                   │
   │  [◎ Mécanique] ◎ Élec...          │ ← SELECT
   │                                    │
   │  ✅ Solution                       │
   │  [textarea: what fixed it]         │
   │                                    │
   │  🏁 État final                     │
   │  [◎ Réparé ✅]  ◎ Dépanné ⚠️      │
   │                                    │
   │  [Envoyer rapport]                 │
   │  → OT → EN_VALIDATION              │
   └────────────────────────────────────┘

5️⃣ /ordres/validation
   ┌────────────────────────────────────┐
   │  VALIDATION INTERVENTIONS          │
   │                                    │
   │  [En attente de validation]        │ 👷 OPÉRATEUR
   │                                    │
   │  OT-0001: MOT-001                  │
   │  [Lire rapport]                    │
   │  - Travaux: ...                    │
   │  - Cause: ...                      │
   │  - Solution: ...                   │
   │                                    │
   │  [Test physique]                   │
   │  ✅ Fonctionne parfaitement        │
   │                                    │
   │  [✅ Confirmer / ⚠️ Rejecter]      │
   │  → OT → CLÔTURÉ ✅                 │
   └────────────────────────────────────┘
```

---

## 📊 DONNÉES TRANSVERSALES

```
┌─────────────────────────────────────────────────────────────────┐
│                    INFORMATIONS TRACÉES                          │
└─────────────────────────────────────────────────────────────────┘

CHAQUE INTERVENTION ENREGISTRE:

◉ IDENTIFICATION
  • Numéro unique (DI-YYYY-XXXX ou OT-YYYY-XXXX)
  • Équipement affecté (code + libellé)
  • Demandeur/Créateur
  • Date création
  
◉ URGENCE & PRIORITÉ
  • Level: Critique / Haute / Normale / Basse
  • SLA deadline
  • Historique changements
  
◉ PERSONNEL
  • Responsable technique assigné
  • Équipe/Technicien(s)
  • Magasinier (si pièces)
  • Validateur (opérateur)
  
◉ TRAVAIL
  • Description initiale
  • Photos de la panne
  • Rapport d'intervention
  • Cause racine identifiée
  • Solution apportée
  • Durée réelle minttes
  
◉ MATIÈRE
  • Pièces utilisées
  • Quantités sorties
  • Coûts unitaires capturés
  • Coût total matière
  
◉ COÛTS
  • Main-d'œuvre (heures × tarif)
  • Sous-traitance (si externe)
  • Total intervention
  
◉ AUDIT
  • Historique complet statuts
  • Changements et motifs
  • Dates exactes
  • Utilisateurs actions
  • Commentaires (interne/externe)
```

---

## ✅ ÉTATS FINAUX POSSIBLES

```
SUCCESS PATH ✅                      ERROR/RETRY PATH ⚠️
─────────────────                    ──────────────────

1. DI créée                          1. DI créée
   ↓                                    ↓
2. Responsable valide                2. Responsable REJETTE
   ↓                                    ↓
3. OT-YYYY-XXXX créé                3. FIN - Motif expliqué
   ↓                                    (Peut créer nouvelle DI)
4. Équipe assignée
   ↓
5. Intervention EN_COURS
   ↓
6. (Si besoin) Pièces allouées
   ↓
7. Travaux terminés
   ↓
8. Rapport rédigé
   ↓
9. OT → EN_VALIDATION
   ↓
10. Opérateur valide ✅
    ↓
    CLÔTURÉ ✅ (fin du processus)


ALTERNATIVE: DÉPANNAGE TEMPORAIRE ⚠️
──────────────────────────────────

7. Travaux terminés (partiels)
   ↓
8. Rapport rédigé
   • État: Dépanné ⚠️
   ↓
9. OT → EN_VALIDATION
   ↓
10. Opérateur valide ⚠️
    ↓
    DÉPANNÉ ⚠️
    (Reste en attente correction)
    
    → Peut revenir à EN_COURS
    → Nouvelle intervention requise
    → Nouvelle séance de travaux
    → Nouveau rapport
    → Nouvelle validation
```

---

## 🎨 ICÔNES & STATUTS VISUELS

```
URGENCES:
  🔴 CRITIQUE   →  Arrêt production, immédiat
  🟠 HAUTE      →  Impact fort, aujourd'hui
  🔵 NORMALE    →  Impact moyen, cette semaine
  ⚪ BASSE      →  Impact minimal, quand possible

DEMANDES:
  ✅ EN ATTENTE  →  En review responsable (jaune)
  ✅ VALIDÉE    →  OT créé, intervention programmée (vert)
  ❌ REJETÉE    →  Non acceptée, voir motif (rouge)

ORDRES:
  🔵 OUVERT                 →  Crée, prêt ressources
  🟡 EN_COURS               →  Intervention active
  🟠 DÉPANNÉ               →  Solution temporaire
  🟡 EN_ATTENTE_CORRECTION →  Attend rédaction rapport
  🟣 EN_VALIDATION         →  Opérateur vérifie
  🟢 CLÔTURÉ               →  Intervention terminée

ACTIONS:
  ✏️  Créer / Modifier
  👁️  Consulter
  ✅ Valider
  ❌ Rejeter
  📋 Rapport
  🔄 Retour
  ✨ Upload photos
```

---

## 📞 CONTACT RAPIDE

```
BESOIN DE...?

Comprendre le workflow
→ Lire: WORKFLOW_INTERVENTIONS.md

Utiliser le système
→ Lire: GUIDE_UTILISATION.md

Questions techniques
→ Lire: IMPLEMENTATION_TECHNIQUE.md

Support immédiat
→ Team: République Tech
→ Slack: #gmao-support
```

---

**Document:** Diagrammes Workflow v1.0  
**Date:** 13 Avril 2026  
**Status:** ✅ Ready to use
