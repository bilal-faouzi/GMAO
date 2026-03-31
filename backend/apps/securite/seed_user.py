import uuid
import hashlib
from django.utils import timezone
from apps.securite.models import Utilisateur

def hash_password(password):
    """Même logique que dans votre views.py"""
    return hashlib.sha256(password.encode()).hexdigest()

print("🗑️  Vidage de la table Utilisateur...")
Utilisateur.objects.all().delete()

# Liste étendue pour simuler une vraie base de données
data_brute = [
    ("Ahmed", "Mansouri", "amansouri"), ("Sophie", "Lefebvre", "slefebvre"),
    ("Yassine", "Bennani", "ybennani"), ("Claire", "Dubois", "cdubois"),
    ("Marc", "Moreau", "mmoreau"), ("Leila", "Haddad", "lhaddad"),
    ("Thomas", "Rousseau", "trousseau"), ("Sarah", "Belkaid", "sbelkaid"),
    ("Kevin", "Durand", "kdurand"), ("Fatima", "Zahra", "fzahra"),
    ("Antoine", "Gauthier", "agauthier"), ("Elena", "Rossi", "erossi"),
    ("Julien", "Bernard", "jbernard"), ("Inès", "Saidi", "isaidi"),
    ("Nicolas", "Petit", "npetit"), ("Chloé", "Michel", "cmichel"),
    ("Omar", "Faridi", "ofaridi"), ("Julie", "Masson", "jmasson"),
    ("Karim", "Tazi", "ktazi"), ("Admin", "GMAO", "admin")
]

PASSWORD_FIXE = "admin"
PASSWORD_HASH = hash_password(PASSWORD_FIXE)

print(f"🚀 Création de {len(data_brute)} utilisateurs...")

for prenom, nom, username in data_brute:
    Utilisateur.objects.create(
        id=uuid.uuid4(),
        nom_utilisateur=username,
        email=f"{username}@gmao-expert.com",
        mot_de_passe_hash=PASSWORD_HASH,
        prenom=prenom,
        nom=nom,
        est_actif=True,
        date_creation=timezone.now()
    )
    print(f"   + {username} ajouté.")

print(f"\n✨ Terminé ! Tous les utilisateurs ont le mot de passe : {PASSWORD_FIXE}")
# run
# python manage.py shell
# exec(open("apps/securite/seed_user.py", encoding="utf-8").read())