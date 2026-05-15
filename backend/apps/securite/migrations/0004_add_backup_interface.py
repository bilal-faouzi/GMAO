from django.db import migrations


def add_backup_interface(apps, schema_editor):
    InterfaceApp = apps.get_model("securite", "InterfaceApp")
    InterfaceApp.objects.update_or_create(
        code="PARAMETRAGE_BACKUP",
        defaults={
            "libelle": "Sauvegarde",
            "route": "/parametrage/backup",
            "icon": "DatabaseBackup",
            "module": "PARAMETRAGE",
            "ordre": 90,
            "est_actif": True,
        },
    )


def remove_backup_interface(apps, schema_editor):
    InterfaceApp = apps.get_model("securite", "InterfaceApp")
    InterfaceApp.objects.filter(code="PARAMETRAGE_BACKUP").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("securite", "0003_interfaceapp_roleinterface"),
    ]

    operations = [
        migrations.RunPython(add_backup_interface, remove_backup_interface),
    ]
