import os

base = r'C:\Users\yahya\GMAO-1\frontend\src'

replacements = {
    '"#052e16"': '"rgba(34, 197, 94, 0.12)"',
    '"#431407"': '"rgba(249, 115, 22, 0.12)"',
    '"#450a0a"': '"rgba(239, 68, 68, 0.12)"',
    '"#1c1917"': '"rgba(120, 113, 108, 0.12)"',
    '"#0c1a4b"': '"rgba(59, 130, 246, 0.12)"',
    '"#2e1065"': '"rgba(168, 85, 247, 0.12)"',
    '"#1d4ed8"': '"var(--color-primary)"',
    '"#1f1f23"': '"var(--color-elevated)"',
    '"#71717a"': '"var(--color-text-muted)"',
}

files = [
    'pages/actifs/actifspage.jsx',
    'pages/actifs/Historiquestatuspage.jsx',
    'pages/securite/JournalAudit.jsx',
]

for f in files:
    path = os.path.join(base, f)
    with open(path, 'r', encoding='utf-8') as fh:
        content = fh.read()
    for old, new in replacements.items():
        content = content.replace(old, new)
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write(content)
    print(f'OK: {f}')
print('ALL DONE')
