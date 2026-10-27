# Task Manager V3 - README

## Overview
V3 évolué de la version V2 en ajoutant une interface **Kanban en deux colonnes** et en remplaçant le stockage par **SQLite** au lieu de `tasks.json`. Toutes les fonctions CRUD sont préservées et les données existantes sont migrées automatiquement.

## Technologies Utilisées
- **Backend** : Node.js + Express v5.3.0 + better-sqlite3
- **Frontend** : HTML5 / Vanilla JavaScript (pas de framework)
- **Base de données** : SQLite (fichier `tasks.db`)
- **Stockage précédent** : `tasks.json` (migré vers SQLite au premier lancement)

## Installation et Lancement

### 1. Installer les dépendances
```powershell
cd D:\study\school\CNPM\Tuan_7\architec\code
npm install
```
*Note : `better-sqlite3` sera installé automatiquement. La première installation peut prendre quelques secondes.*

### 2. Lancer le serveur
```powershell
npm start
```
Le serveur démarrera à l'adresse http://localhost:3000

### 3. Accéder à l'application
Ouvrez votre navigateur à `http://localhost:3000`

## Utilisation de l'interface Kanban

L'interface affiche maintenant deux colonnes :

### Colonne "Chưa hoàn thành" (To-Do)
- Contient les tâches dont `completed = 0` (non terminées)
- C'est ici que les nouvelles tâches apparaissent en premier

### Colonne "Hoàn thành" (Done)
- Contient les tâches dont `completed = 1` (terminées)
- Les tâches y sont déplacées lorsqu'on bascule leur statut

### Actions disponibles :

| Action | Raccourci | Description |
|--------|-----------|-------------|
| **Créer une tâche** | Entrer du texte + bouton "Thêm" ou `Entrée` | Ajoute une nouvelle tâche dans la colonne "Chưa hoàncompleted" |
| **Basculer statut** | Cliquer sur la case à cocher ✓ | Déplace la tâche entre les deux colonnes (completed toggles) |
| **Supprimer une tâche** | Bouton corbeille ❌ sur chaque tâche | Supprime la tâche de façon définitive |
| **Rafraîchir** | Polling automatique toutes les 5 secondes | Les modifications d'autres clients apparaissent automatiquement |

### Créer une nouvelle tâche
1. Saisir le nom de la tâche dans le champ de texte en haut
2. Cliquer sur le bouton "Thêm" ou appuyer sur `Entrée`
3. La tâche apparaîtra dans la colonne "Chưa hoàn thành"

### Basculer le statut d'une tâche
1. Cliquer sur la case à cocher ✓ à gauche du nom de la tâche
2. La tâche sera déplacée vers l'autre colonne
3. Le statut est sauvegardé dans SQLite instantanément

### Supprimer une tâche
1. Cliquer sur le bouton corbeille ❌ sur la tâche souhaitée
2. Confirmer la suppression dans la boîte de dialogue
2. La tâche disparaîtra des deux colonnes

## Migration des données (JSON → SQLite)

### Première exécution
- Au premier lancement de V3, le serveur détecte automatiquement la présence de `tasks.json`
- Toutes les tâches existantes sont migrées vers la base de données SQLite
- La migration est **idempotente** : si SQLite contient déjà des données, la migration ne s'exécute pas à nouveau

### Fichier `tasks.json`
- Gardé intact dans le répertoire racine (non supprimé)
- Servant de référence et de sauvegarde
- Non lu par l'application après migration réussie

### Fichier `tasks.db`
- Créé automatiquement au premier lancement
- Contient la table `tasks` avec les colonnes : `id`, `name`, `completed`, `createdAt`
- Peut être inspecté directement avec des outils SQLite ou via les API

## Vérification du fonctionnement

### Tests rapides
Après avoir lancé le serveur (`npm start`), essayez :

1. **Vérifier la migration** : Ouvrez `http://localhost:3000/tasks` via navigateur ou API. Vous devriez voir 4 tâches existantes.

2. **Créer une nouvelle tâche** :
   - Saisir "Test V3" dans le champ
   - Cliquer sur "Thêm"
   - La tâche apparaîtra dans la colonne "Chưa hoàn thành"

3. **Basculer le statut** :
   - Cliquer sur la case ✓ à côté de la tâche
   - La tâche bougera vers la colonne "Hoàn thành"

4. **Supprimer une tâche** :
   - Cliquer sur ❌ sur la tâche
   - Confirmer la suppression
   - La tâche disparaît

5. **Redémarrer le serveur** :
   - Arrêter le serveur (Ctrl+C)
   - Relancer (`npm start`)
   - Toutes les tâches et leurs statuts doivent être préservés

## Structure des fichiers importants

| Fichier | Description |
|---------|-------------|
| `server.js` | Backend Express avec SQLite + migration depuis `tasks.json` |
| `public/index.html` | Interface Kanban UI (deux colonnes, CRUD, polling) |
| `tasks.db` | Base de données SQLite (créée automatiquement) |
| `tasks.json` | Fichier de référence d'origine (non modifié, non supprimé) |
| `package.json` | Dépendances : express, better-sqlite3 |
| `README.md` | Ce fichier |

## Dépannage

### Problème : Le serveur ne démarre pas
- Vérifiez que Node.js est installé
- Supprimez le fichier `tasks.db` si corrompu et relancez `npm start`
- Vérifiez que le port 3000 n'est pas occupé par autre chose

### Problème : Les tâches n'apparaissent pas après migration
- Vérifiez que `tasks.json` existe toujours à la racine du projet
- Regardez les logs du terminal au démarrage - le message "Migrated X tasks from tasks.json to SQLite" doit apparaître

### Problème : L'interface ne montre pas les bonnes colonnes
- Assurez-vous que le navigateur charge bien la nouvelle version (`public/index.html`)
- Le polling automatique (toutes les 5s) doit synchroniser les changements

### Problème : Erreur SQLite
- Vérifiez que le fichier `tasks.db` n'est pas en lecture seule
- Essayez de supprimer `tasks.db` et de redémarrer le serveur pour recréer proprement

## Différences avec V2

| Fonctionnalité | V2 | V3 |
|----------------|----|----|
| **Interface** | Liste simple | Kanban 2 colonnes |
| **Stockage** | `tasks.json` (fichier plat) | `tasks.db` (SQLite) |
| **Migration** | Aucune | Automatique JSON → SQLite |
| **Persistance** | Recharge depuis file à chaque requête | Base de données persistante |
| **Nouvelle tâche** | Apparait au bottom de liste | Apparait dans colonne "Chưa hoàncompleted" |
| **Toggle statut** | Refresh page pour voir changements | Changement instantané + colonne autom. |