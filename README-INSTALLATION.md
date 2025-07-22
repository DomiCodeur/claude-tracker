# Claude Tracker - Guide d'Installation

## Structure du Projet

```
claude-tracker/
├── README.md                     # Documentation principale (Node.js)
├── README-INSTALLATION.md        # Ce fichier
├── CHANGELOG.md                  # Historique des versions
├── LICENSE                       # Licence MIT
├── package.json                  # Dépendances Node.js
├── package-lock.json            
├── tsconfig.json                 # Configuration TypeScript
├── dist/                         # Build Node.js
├── node_modules/                 # Dépendances Node.js
├── src/                          # Source TypeScript
│   ├── claudeReader.ts
│   ├── cli.ts
│   ├── index.ts
│   ├── tracker.ts
│   └── types.ts
├── scripts/                      # Scripts de lancement
│   ├── claude-wrapper.sh
│   ├── install.sh
│   ├── run_auto_tracker.sh
│   └── run_tracker.sh
└── python-version/               # Version Python alternative
    ├── calculate_session_tokens.py
    ├── claude-with-progress.py
    ├── claude_env/              # Environnement virtuel Python
    └── tracking                 # Données de suivi
```

## Installation Rapide

### Version Node.js (Recommandée)

```bash
# Installer globalement
npm install -g claude-tracker

# Ou utiliser directement
npx claude-tracker
```

### Version Locale (Développement)

```bash
cd claude-tracker
npm install
npm run build
npm start
```

## Utilisation

### Méthode Recommandée (Version Globale NPM)

Si vous avez installé globalement :
```bash
# Commande simple
ctrack

# Ou avec options
claude-track live -i 5
```

### Version Locale (Ce Dossier)

```bash
# Script principal avec menu de choix
./claude-track

# Ou directement la version Node.js
./scripts/run_nodejs_tracker.sh

# Ou la version Python alternative
./scripts/run_tracker.sh
```

### Version Python (Alternative)

```bash
# Utiliser l'environnement Python inclus
source python-version/claude_env/bin/activate
python python-version/claude-with-progress.py
```

## Scripts Disponibles

- `scripts/claude-wrapper.sh` - Wrapper principal
- `scripts/run_tracker.sh` - Lance le monitoring
- `scripts/run_auto_tracker.sh` - Monitoring automatique
- `scripts/install.sh` - Installation des dépendances

## Distribution

Ce dossier `claude-tracker` contient tout le nécessaire :
- Version Node.js complète et prête à l'emploi
- Version Python alternative
- Scripts de lancement
- Documentation
- Environnements de développement

**Pour distribuer :** Copiez simplement tout le dossier `claude-tracker`.