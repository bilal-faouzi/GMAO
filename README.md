# GMAO
GMAO - Gestion de Maintenance Assistée par Ordinateur | Stack: Django 5.2 LTS + PostgreSQL 17 + React 19 + DRF 3.15 | Modules: Équipements, Interventions, Maintenance Préventive, Stock Pièces, Rapports KPI


================================================================================
  GMAO - Gestion de Maintenance Assistee par Ordinateur
================================================================================

  Application web de gestion de maintenance industrielle.
  Backend : Django 5.2 LTS + DRF 3.15
  Frontend : React 19 + Vite
  Base de donnees : PostgreSQL 17

================================================================================
  MODULES
================================================================================

  - Sécurité             : gestion des utilisateurs, des rôles et des permissions, ainsi que l’authentification via JWT et sessions
  - Organisation         : hiérarchisation de la structure du holding

================================================================================
  PREREQUIS
================================================================================

  - Node.js >= 22.22.0  
  - Python >= 3.13.12 
  - PostgreSQL 17
  

================================================================================
  INSTALLATION - FRONTEND
================================================================================

  1. Aller dans le dossier frontend
     cd frontend

  2. Installer les dependances
     npm install

  3. Creer le fichier d'environnement
     Creer un fichier .env avec les variables suivantes :

     VITE_BACKEND_URL=http://localhost:8000
     VITE_ACCESS_TOKEN=your_access_token

  4. Lancer le serveur de developpement
     npm run dev

================================================================================
  INSTALLATION - BACKEND
================================================================================

  1. Aller dans le dossier backend
     cd backend

  2. Creer et activer l'environnement virtuel
     python -m venv venv

     Windows   : venv\Scripts\activate
     Mac/Linux : source venv/bin/activate

  3. Installer les dependances
     pip install -r requirements.txt

  4. Creer le fichier d'environnement
     Creer un fichier .env avec les variables suivantes :

     SECRET_KEY=your_secret_key
     DB_NAME=gmao_db
     DB_USER=your_db_user
     DB_PASSWORD=your_db_password
     DB_HOST=localhost
     DB_PORT=5432

  5. Appliquer les migrations
     python manage.py makemigrations
     python manage.py migrate

  6. Lancer le serveur
     python manage.py runserver

================================================================================
  STRUCTURE DU PROJET
================================================================================

  GMAO/
  |-- frontend/
  |   |-- src/
  |   |-- .env
  |   `-- package.json
  |
  `-- backend/
      |-- manage.py
      |-- requirements.txt
      `-- .env

================================================================================