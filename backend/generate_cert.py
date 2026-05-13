"""
Génère un certificat SSL auto-signé pour le serveur local HTTPS.
Usage :  venv\Scripts\python generate_cert.py
"""
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
import datetime
import os
import socket


def get_local_ip():
    """Récupère l'IP locale principale."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "192.168.2.232"


def generate_self_signed_cert(ip_address, output_dir="."):
    key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
    )

    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, "MA"),
        x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "Casablanca"),
        x509.NameAttribute(NameOID.LOCALITY_NAME, "Casablanca"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "GMAO Local"),
        x509.NameAttribute(NameOID.COMMON_NAME, ip_address),
    ])

    cert = x509.CertificateBuilder().subject_name(
        subject
    ).issuer_name(
        issuer
    ).public_key(
        key.public_key()
    ).serial_number(
        x509.random_serial_number()
    ).not_valid_before(
        datetime.datetime.utcnow()
    ).not_valid_after(
        datetime.datetime.utcnow() + datetime.timedelta(days=365)
    ).add_extension(
        x509.SubjectAlternativeName([
            x509.DNSName("localhost"),
            x509.DNSName("127.0.0.1"),
            x509.IPAddress(ipaddress.ip_address(ip_address)),
        ]),
        critical=False,
    ).sign(key, hashes.SHA256())

    key_path = os.path.join(output_dir, "key.pem")
    cert_path = os.path.join(output_dir, "cert.pem")

    with open(key_path, "wb") as f:
        f.write(key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption(),
        ))

    with open(cert_path, "wb") as f:
        f.write(cert.public_bytes(serialization.Encoding.PEM))

    print(f"Certificat généré : {cert_path}")
    print(f"Clé privée        : {key_path}")
    print(f"IP configurée     : {ip_address}")


if __name__ == "__main__":
    import ipaddress
    ip = get_local_ip()
    generate_self_signed_cert(ip)
