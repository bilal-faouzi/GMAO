# create_command.sh
APP=$1
CMD=$2

mkdir -p apps/$APP/management/commands
touch apps/$APP/management/__init__.py
touch apps/$APP/management/commands/__init__.py

cat > apps/$APP/management/commands/$CMD.py << 'EOF'
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta


class Command(BaseCommand):
    help = 'Seed de données de test pour $CMD'

    def handle(self, *args, **kwargs):

        self.stdout.write("── Début du seed ──")

        # ──────────────────────────────────────────────
        # Imports des modèles (adapte selon ton app)
        # ──────────────────────────────────────────────
        # from apps.monapp.models import MonModel

        # ──────────────────────────────────────────────
        # Logique du seed
        # ──────────────────────────────────────────────

        self.stdout.write(self.style.SUCCESS('🎉 Seed terminé !'))
EOF

echo "✅ Commande '$CMD' créée dans apps/$APP/management/commands/"
echo "👉 Lance avec : python manage.py $CMD"