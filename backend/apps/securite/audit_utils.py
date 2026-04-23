"""
Utilitaires centralisés pour l'enregistrement d'audit.
"""
from apps.securite.models import JournalAudit


def get_client_ip(request):
    """Extrait l'adresse IP du client depuis la requête."""
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0]
    return request.META.get('REMOTE_ADDR')


def log_audit(request, action_name, module_name, type_entite, id_entite, 
              ancienne_valeur=None, nouvelle_valeur=None):
    """
    Enregistre une action dans le journal d'audit.
    
    Args:
        request: La requête HTTP
        action_name: 'CREATE', 'UPDATE', 'DELETE', 'CHANGE_STATUS', etc.
        module_name: 'ORGANISATION', 'ACTIFS', 'MAGASIN', 'ORDRES', 'SOUS_TRAITANCE', 'SECURITE'
        type_entite: Nom du modèle (ex: 'Societe', 'Actif', 'Piece', etc.)
        id_entite: UUID de l'entité
        ancienne_valeur: Dict avec les anciennes valeurs (pour UPDATE/DELETE)
        nouvelle_valeur: Dict avec les nouvelles valeurs (pour CREATE/UPDATE)
    """
    try:
        JournalAudit.objects.create(
            id_utilisateur=request.user,
            action=action_name,
            module=module_name,
            type_entite=type_entite,
            id_entite=id_entite,
            ancienne_valeur=ancienne_valeur,
            nouvelle_valeur=nouvelle_valeur,
            adresse_ip=get_client_ip(request),
        )
    except Exception as e:
        # Log silencieux en cas d'erreur pour ne pas bloquer la requête
        print(f"Erreur audit log: {e}")
        pass
