import os
import pandas as pd
import sqlite3
from datetime import datetime

# Fonction pour convertir les données Excel en base de données SQLite
def excel_to_sqlite(excel_file, db_file):
    # Vérifier si le fichier Excel existe
    if not os.path.exists(excel_file):
        return f"Erreur: Le fichier {excel_file} n'existe pas."
    
    # Lire le fichier Excel
    df = pd.read_excel(excel_file)
    
    # Nettoyer les données
    # Convertir les colonnes problématiques en texte
    if 'Phone:' in df.columns:
        df['Phone:'] = df['Phone:'].astype(str)
    
    # Remplir les valeurs manquantes
    df['répondu au tel'] = df['répondu au tel'].fillna('Non spécifié')
    df['Convertis'] = df['Convertis'].fillna('Non spécifié')
    df['Type'] = df['Type'].fillna('Non spécifié')
    
    # Créer une connexion à la base de données SQLite
    conn = sqlite3.connect(db_file)
    
    # Écrire les données dans la table 'leads'
    df.to_sql('leads', conn, if_exists='replace', index=False)
    
    # Créer une table pour les utilisateurs
    cursor = conn.cursor()
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Créer une table pour les sessions
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        session_token TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    
    # Créer un utilisateur par défaut (admin/admin)
    import hashlib
    hashed_password = hashlib.sha256('admin'.encode()).hexdigest()
    
    cursor.execute('''
    INSERT OR IGNORE INTO users (username, password, email)
    VALUES (?, ?, ?)
    ''', ('admin', hashed_password, 'admin@example.com'))
    
    # Valider les changements et fermer la connexion
    conn.commit()
    conn.close()
    
    return "Conversion réussie. Base de données SQLite créée avec succès."

# Exécuter la conversion si ce script est exécuté directement
if __name__ == "__main__":
    result = excel_to_sqlite('Suivi Leads Nesto.xlsx', 'nesto_leads.db')
    print(result)
