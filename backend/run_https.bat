@echo off
cd /d "%~dp0"
venv\Scripts\python manage.py runserver_plus 0.0.0.0:9669 --cert-file cert.pem --key-file key.pem
