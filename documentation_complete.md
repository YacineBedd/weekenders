# Documentation du Tableau de Bord Nesto - Version Web

## Introduction

Le Tableau de Bord Nesto est une application web conçue pour suivre les leads clients et l'avancement des dossiers. Cette version web offre toutes les fonctionnalités de la version locale, avec l'avantage d'être accessible en ligne depuis n'importe quel appareil connecté à Internet.

## Fonctionnalités principales

1. **Vue d'ensemble** : Statistiques clés et graphiques sur les leads et les conversions
2. **Liste des leads** : Tableau interactif avec possibilité d'édition directe
3. **Suivi des appels** : Planification et enregistrement des appels clients
4. **Rapports et analyses** : Visualisations détaillées des performances
5. **Paramètres** : Personnalisation de l'interface et gestion des données
6. **Authentification** : Système de connexion sécurisé pour protéger les données

## Architecture technique

L'application est construite avec les technologies suivantes :

- **Frontend et Backend** : Streamlit (Python)
- **Base de données** : SQLite
- **Visualisation** : Plotly
- **Authentification** : Système intégré avec hachage des mots de passe
- **Déploiement** : Compatible avec Streamlit Cloud, Streamlit Sharing ou Docker

## Accès à l'application

### Méthode 1 : Déploiement sur Streamlit Cloud

1. Créez un compte sur [Streamlit Cloud](https://streamlit.io/cloud)
2. Créez un nouveau dépôt GitHub contenant les fichiers de l'application
3. Connectez votre dépôt GitHub à Streamlit Cloud
4. Configurez le déploiement en pointant vers le fichier `app.py`
5. Lancez le déploiement

### Méthode 2 : Déploiement local avec Docker

1. Installez Docker sur votre serveur
2. Construisez l'image Docker avec la commande :
   ```
   docker build -t nesto-dashboard .
   ```
3. Exécutez le conteneur avec la commande :
   ```
   docker run -p 8501:8501 nesto-dashboard
   ```
4. Accédez à l'application via l'URL : `http://localhost:8501`

### Méthode 3 : Déploiement manuel

1. Installez Python 3.9 ou supérieur
2. Installez les dépendances avec la commande :
   ```
   pip install -r requirements.txt
   ```
3. Exécutez l'application avec la commande :
   ```
   streamlit run app.py
   ```
4. Accédez à l'application via l'URL indiquée dans le terminal

## Authentification

L'application utilise un système d'authentification simple mais efficace :

- **Identifiants par défaut** :
  - Nom d'utilisateur : `admin`
  - Mot de passe : `admin`

Pour des raisons de sécurité, il est recommandé de modifier ces identifiants par défaut après le premier déploiement.

## Structure des fichiers

- `app.py` : Application principale Streamlit
- `excel_to_sqlite.py` : Script de conversion des données Excel en SQLite
- `requirements.txt` : Liste des dépendances Python
- `.streamlit/config.toml` : Configuration de Streamlit
- `Dockerfile` : Configuration pour le déploiement Docker
- `Suivi Leads Nesto.xlsx` : Fichier Excel de données (optionnel)
- `nesto_leads.db` : Base de données SQLite (générée automatiquement)

## Guide d'utilisation

### Connexion

1. Accédez à l'URL de l'application
2. Entrez les identifiants de connexion (par défaut : admin/admin)
3. Cliquez sur "Connexion"

### Navigation

Utilisez la barre latérale pour naviguer entre les différentes pages :
- **Tableau de bord** : Vue d'ensemble
- **Liste des leads** : Gestion des contacts
- **Suivi des appels** : Gestion des appels
- **Rapports** : Analyses et statistiques
- **Paramètres** : Configuration de l'application

### Filtres

La barre latérale contient également des filtres qui s'appliquent à toutes les pages :
- **Statut d'appel** : Filtrer par statut d'appel
- **Plage de dates** : Filtrer par période
- **Type de dossier** : Filtrer par type
- **Statut de conversion** : Filtrer par statut de conversion
- **Recherche** : Rechercher par nom, email ou téléphone

### Gestion des leads

1. Accédez à la page "Liste des leads"
2. Utilisez les options de tri et de pagination
3. Modifiez les informations directement dans le tableau
4. Cliquez sur "Sauvegarder les modifications" pour enregistrer

### Suivi des appels

1. Accédez à la page "Suivi des appels"
2. Utilisez l'onglet "Planification des rappels" pour gérer les rappels
3. Utilisez l'onglet "Historique des appels" pour consulter les appels passés
4. Utilisez l'onglet "Nouvel appel" pour enregistrer un nouvel appel

### Exportation des données

1. Accédez à la page "Liste des leads" ou "Paramètres"
2. Cliquez sur "Exporter en CSV" ou "Exporter en Excel"
3. Téléchargez le fichier généré

### Importation des données

1. Accédez à la page "Paramètres"
2. Allez dans l'onglet "Importation/Exportation"
3. Cliquez sur "Choisir un fichier Excel"
4. Sélectionnez votre fichier Excel
5. Cliquez sur "Importer les données"

## Personnalisation

L'application peut être personnalisée de plusieurs façons :

1. **Thème** : Modifiez le fichier `.streamlit/config.toml` pour changer les couleurs et les polices
2. **Colonnes** : Modifiez la fonction `leads_list_page()` dans `app.py` pour ajouter ou supprimer des colonnes
3. **Statuts** : Modifiez les options des listes déroulantes dans `app.py` pour ajouter ou supprimer des statuts
4. **Logo** : Remplacez l'URL du logo dans la fonction `create_header()` dans `app.py`

## Dépannage

### Problèmes courants

1. **Erreur de connexion** : Vérifiez que vous utilisez les bons identifiants
2. **Données non affichées** : Vérifiez que la base de données SQLite a été correctement créée
3. **Erreur lors de l'importation** : Vérifiez que votre fichier Excel a la même structure que le fichier original

### Support technique

Pour toute question ou assistance supplémentaire, veuillez contacter votre administrateur système ou le support technique.

## Mises à jour futures

Les fonctionnalités suivantes sont prévues pour les prochaines versions :

1. **Authentification avancée** : Gestion des utilisateurs et des rôles
2. **Notifications** : Alertes pour les rappels programmés
3. **Intégration CRM** : Synchronisation avec d'autres systèmes CRM
4. **Application mobile** : Version mobile de l'application
5. **Rapports personnalisés** : Création de rapports sur mesure

## Conclusion

Le Tableau de Bord Nesto - Version Web est un outil puissant et flexible pour la gestion des leads et le suivi des appels clients. Sa conception modulaire permet une personnalisation facile et des mises à jour régulières pour répondre à l'évolution de vos besoins.
