import re
import sys

# Replacement rules: (pattern, replacement)
# Order matters: longer/more specific patterns first
RULES = [
    # ── Page wrappers ──
    ('className="p-6 text-white"', 'className="page"'),
    ('className="p-6 text-white max-w-4xl mx-auto"', 'className="page max-w-4xl mx-auto"'),

    # ── Container backgrounds ──
    ('bg-gray-800/50', 'bg-surface/50'),
    ('bg-gray-800', 'bg-surface'),
    ('bg-gray-700/50', 'bg-elevated/50'),
    ('bg-gray-700/30', 'bg-elevated/30'),
    ('bg-gray-700', 'bg-elevated'),
    ('bg-gray-900/50', 'bg-[var(--color-bg)]/50'),
    ('bg-gray-900', 'bg-[var(--color-bg)]'),
    ('bg-black/40', 'bg-[var(--color-bg)]/40'),
    ('bg-black/30', 'bg-[var(--color-bg)]/30'),

    # ── Borders ──
    ('border-gray-700', 'border-border'),
    ('border-gray-600', 'border-border-subtle'),

    # ── Text colors ──
    ('text-gray-600', 'text-text-muted'),
    ('text-gray-500', 'text-text-muted'),
    ('text-gray-400', 'text-text-secondary'),
    ('text-gray-300', 'text-text'),
    ('text-white', 'text-text'),

    # ── Inputs (common patterns in ordres pages) ──
    ('bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none focus:border-purple-500',
     'finput rounded-lg px-3 py-2 text-sm focus:border-purple-500'),
    ('bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none focus:border-teal-500',
     'finput rounded-lg px-3 py-2 text-sm focus:border-teal-500'),
    ('bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none focus:border-amber-500',
     'finput rounded-lg px-3 py-2 text-sm focus:border-amber-500'),
    ('bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 outline-none',
     'finput rounded-lg px-3 py-2'),
    ('bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600',
     'finput rounded-lg px-3 py-2 text-sm'),
    ('bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600',
     'finput rounded-lg px-3 py-2'),
    ('bg-gray-700 text-white rounded-lg px-2 py-1 text-sm border border-gray-600',
     'finput rounded-lg px-2 py-1 text-sm'),
    ('bg-gray-700 text-white rounded-lg px-2 py-1 border border-gray-600',
     'finput rounded-lg px-2 py-1'),

    # ── Selects ──
    ('bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none focus:border-purple-500',
     'fsel rounded-lg px-3 py-2 text-sm focus:border-purple-500'),
    ('bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600',
     'fsel rounded-lg px-3 py-2'),

    # ── Textarea ──
    ('bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 outline-none focus:border-purple-500 resize-none',
     'finput rounded-lg px-3 py-2 text-sm focus:border-purple-500 resize-none'),

    # ── Buttons: solid colors → .btn classes (most common patterns) ──
    # Green (validate/approve)
    ('bg-green-600 hover:bg-green-700 disabled:opacity-40 rounded-lg text-sm font-semibold transition text-white',
     'btn btn-primary disabled:opacity-40 rounded-lg text-sm font-semibold transition'),
    ('bg-green-600 hover:bg-green-700 rounded-lg text-sm font-semibold transition text-white',
     'btn btn-primary rounded-lg text-sm font-semibold transition'),
    ('bg-green-600 hover:bg-green-700 disabled:opacity-40 rounded-xl text-sm font-semibold transition text-white',
     'btn btn-primary disabled:opacity-40 rounded-xl text-sm font-semibold transition'),
    ('bg-green-600 hover:bg-green-700 rounded-xl text-sm font-semibold transition text-white',
     'btn btn-primary rounded-xl text-sm font-semibold transition'),

    # Red (danger/reject)
    ('bg-red-600 hover:bg-red-700 disabled:opacity-40 rounded-lg text-sm font-semibold transition text-white',
     'btn btn-danger disabled:opacity-40 rounded-lg text-sm font-semibold transition'),
    ('bg-red-600 hover:bg-red-700 rounded-lg text-sm font-semibold transition text-white',
     'btn btn-danger rounded-lg text-sm font-semibold transition'),
    ('bg-red-600 hover:bg-red-700 disabled:opacity-40 rounded-xl text-sm font-semibold transition text-white',
     'btn btn-danger disabled:opacity-40 rounded-xl text-sm font-semibold transition'),
    ('bg-red-600 hover:bg-red-700 rounded-xl text-sm font-semibold transition text-white',
     'btn btn-danger rounded-xl text-sm font-semibold transition'),

    # Teal (magasin)
    ('bg-teal-600 hover:bg-teal-700 disabled:opacity-40 rounded-lg text-sm font-semibold transition text-white',
     'btn btn-primary disabled:opacity-40 rounded-lg text-sm font-semibold transition'),
    ('bg-teal-600 hover:bg-teal-700 rounded-lg text-sm font-semibold transition text-white',
     'btn btn-primary rounded-lg text-sm font-semibold transition'),
    ('bg-teal-600 hover:bg-teal-700 disabled:opacity-40 rounded-xl text-sm font-semibold transition text-white',
     'btn btn-primary disabled:opacity-40 rounded-xl text-sm font-semibold transition'),
    ('bg-teal-600 hover:bg-teal-700 rounded-xl text-sm font-semibold transition text-white',
     'btn btn-primary rounded-xl text-sm font-semibold transition'),

    # Purple (primary actions)
    ('bg-purple-600 hover:bg-purple-700 disabled:opacity-40 rounded-lg text-sm font-semibold transition text-white',
     'btn btn-primary disabled:opacity-40 rounded-lg text-sm font-semibold transition'),
    ('bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-semibold transition text-white',
     'btn btn-primary rounded-lg text-sm font-semibold transition'),
    ('bg-purple-600 hover:bg-purple-700 disabled:opacity-40 rounded-xl text-sm font-semibold transition text-white',
     'btn btn-primary disabled:opacity-40 rounded-xl text-sm font-semibold transition'),
    ('bg-purple-600 hover:bg-purple-700 rounded-xl text-sm font-semibold transition text-white',
     'btn btn-primary rounded-xl text-sm font-semibold transition'),

    # Blue
    ('bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg text-sm font-semibold transition text-white',
     'btn btn-primary disabled:opacity-40 rounded-lg text-sm font-semibold transition'),
    ('bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold transition text-white',
     'btn btn-primary rounded-lg text-sm font-semibold transition'),

    # Amber/Orange
    ('bg-amber-600 hover:bg-amber-700 disabled:opacity-40 rounded-lg text-sm font-semibold transition text-white',
     'btn btn-primary disabled:opacity-40 rounded-lg text-sm font-semibold transition'),
    ('bg-amber-600 hover:bg-amber-700 rounded-lg text-sm font-semibold transition text-white',
     'btn btn-primary rounded-lg text-sm font-semibold transition'),

    # Outline buttons (ghost style)
    ('border border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700',
     'btn btn-outline'),
    ('border border-gray-600 text-gray-400 hover:text-text hover:bg-elevated',
     'btn btn-outline'),

    # ── Common small buttons ──
    ('bg-gray-700 hover:bg-gray-600 text-white', 'btn btn-ghost'),
    ('bg-gray-700 hover:bg-gray-600 text-text', 'btn btn-ghost'),
]

def fix_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    for old, new in RULES:
        content = content.replace(old, new)

    if content != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Updated: {path}')
    else:
        print(f'No changes: {path}')

files = [
    'src/pages/ordres/ValidationOperateur.jsx',
    'src/pages/ordres/DashboardOTs.jsx',
    'src/pages/ordres/DeclarerPanne.jsx',
    'src/pages/ordres/GestionOTs.jsx',
]

for f in files:
    fix_file(f)

print('Done.')
