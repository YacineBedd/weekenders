import streamlit as st
import pandas as pd
import sqlite3
import os
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
import hashlib
import uuid
import json

# Configuration de la page
st.set_page_config(
    page_title="Tableau de Bord Nesto",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Fonction pour créer la base de données si elle n'existe pas
def init_db():
    # Vérifier si le fichier de base de données existe
    if not os.path.exists('nesto_leads.db'):
        # Si le fichier Excel existe, convertir en SQLite
        if os.path.exists('Suivi Leads Nesto.xlsx'):
            from excel_to_sqlite import excel_to_sqlite
            excel_to_sqlite('Suivi Leads Nesto.xlsx', 'nesto_leads.db')
        else:
            # Créer une base de données vide avec la structure requise
            conn = sqlite3.connect('nesto_leads.db')
            cursor = conn.cursor()
            
            # Créer la table leads
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS leads (
                "Lead ID" REAL,
                "First Name:" TEXT,
                "Last Name:" TEXT,
                "Email:" TEXT,
                "Phone:" TEXT,
                "répondu au tel" TEXT,
                "Date d'appel" TIMESTAMP,
                "Convertis" TEXT,
                "Type" TEXT,
                "Unnamed: 9" TEXT,
                "Unnamed: 10" TEXT
            )
            ''')
            
            # Créer la table users
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            ''')
            
            # Créer la table sessions
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
            cursor.execute('''
            INSERT OR IGNORE INTO users (username, password, email)
            VALUES (?, ?, ?)
            ''', ('admin', hashlib.sha256('admin'.encode()).hexdigest(), 'admin@example.com'))
            
            conn.commit()
            conn.close()

# Fonction pour charger les données depuis SQLite
@st.cache_data(ttl=300)
def load_data():
    try:
        conn = sqlite3.connect('nesto_leads.db')
        df = pd.read_sql_query("SELECT * FROM leads", conn)
        conn.close()
        
        # Nettoyage des données
        df['répondu au tel'] = df['répondu au tel'].fillna('Non spécifié')
        df['Convertis'] = df['Convertis'].fillna('Non spécifié')
        df['Type'] = df['Type'].fillna('Non spécifié')
        df['Date d\'appel'] = pd.to_datetime(df['Date d\'appel'], errors='coerce')
        
        return df
    except Exception as e:
        st.error(f"Erreur lors du chargement des données: {e}")
        return pd.DataFrame()

# Fonction pour sauvegarder les données
def save_data(df):
    try:
        conn = sqlite3.connect('nesto_leads.db')
        df.to_sql('leads', conn, if_exists='replace', index=False)
        conn.close()
        return True
    except Exception as e:
        st.error(f"Erreur lors de la sauvegarde des données: {e}")
        return False

# Fonction pour vérifier l'authentification
def check_auth(username, password):
    # Version simplifiée pour le déploiement web
    # Dans un environnement de production, utilisez une méthode plus sécurisée
    if username == "admin" and password == "admin":
        return True
    return False

# Styles CSS personnalisés
def load_css():
    st.markdown("""
    <style>
        .main-header {
            font-size: 2.5rem;
            color: #1E3A8A;
            margin-bottom: 1rem;
            font-weight: 700;
        }
        .sub-header {
            font-size: 1.5rem;
            color: #2563EB;
            margin-bottom: 1rem;
            font-weight: 600;
        }
        .card {
            background-color: #F3F4F6;
            border-radius: 0.5rem;
            padding: 1rem;
            margin-bottom: 1rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .metric-card {
            background-color: #EFF6FF;
            border-left: 4px solid #3B82F6;
            padding: 1rem;
            border-radius: 0.5rem;
            margin-bottom: 1rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .metric-value {
            font-size: 2rem;
            font-weight: 700;
            color: #1E3A8A;
        }
        .metric-label {
            font-size: 1rem;
            color: #6B7280;
        }
        .status-badge {
            padding: 0.25rem 0.5rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 600;
        }
        .status-badge.success {
            background-color: #D1FAE5;
            color: #065F46;
        }
        .status-badge.warning {
            background-color: #FEF3C7;
            color: #92400E;
        }
        .status-badge.danger {
            background-color: #FEE2E2;
            color: #B91C1C;
        }
        .status-badge.info {
            background-color: #E0F2FE;
            color: #0369A1;
        }
        .footer {
            margin-top: 3rem;
            padding-top: 1rem;
            border-top: 1px solid #E5E7EB;
            text-align: center;
            color: #6B7280;
            font-size: 0.875rem;
        }
        .login-container {
            max-width: 400px;
            margin: 0 auto;
            padding: 2rem;
            background-color: #F3F4F6;
            border-radius: 0.5rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .login-header {
            text-align: center;
            margin-bottom: 2rem;
        }
        .login-button {
            width: 100%;
            margin-top: 1rem;
        }
    </style>
    """, unsafe_allow_html=True)

# Fonction pour créer l'en-tête
def create_header(df):
    col1, col2, col3 = st.columns([1, 2, 1])
    
    with col1:
        st.image("https://nesto.ca/wp-content/uploads/2022/06/nesto-logo.svg", width=150)
    
    with col2:
        st.markdown('<h1 class="main-header">Tableau de Bord Suivi des Leads</h1>', unsafe_allow_html=True)
    
    with col3:
        st.markdown(f"<p style='text-align: right;'>Date: {datetime.now().strftime('%d/%m/%Y')}</p>", unsafe_allow_html=True)
        st.markdown(f"<p style='text-align: right;'>Heure: {datetime.now().strftime('%H:%M')}</p>", unsafe_allow_html=True)
    
    # Métriques clés
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-value">{len(df)}</div>
            <div class="metric-label">Total des leads</div>
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        appels_effectues = df['Date d\'appel'].notna().sum()
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-value">{appels_effectues}</div>
            <div class="metric-label">Appels effectués</div>
        </div>
        """, unsafe_allow_html=True)
    
    with col3:
        convertis = df[df['Convertis'].notna() & (df['Convertis'] != 'Non') & (df['Convertis'] != 'Non spécifié')].shape[0]
        taux_conversion = round((convertis / len(df)) * 100, 1) if len(df) > 0 else 0
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-value">{taux_conversion}%</div>
            <div class="metric-label">Taux de conversion</div>
        </div>
        """, unsafe_allow_html=True)
    
    with col4:
        rappels = df[df['répondu au tel'].str.contains('Rappel', case=False, na=False)].shape[0]
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-value">{rappels}</div>
            <div class="metric-label">Rappels à programmer</div>
        </div>
        """, unsafe_allow_html=True)

# Fonction pour créer la barre latérale
def create_sidebar():
    with st.sidebar:
        st.markdown('<h2 class="sub-header">Navigation</h2>', unsafe_allow_html=True)
        
        page = st.radio(
            "Sélectionnez une page",
            ["Tableau de bord", "Liste des leads", "Suivi des appels", "Rapports", "Paramètres"],
            index=0
        )
        
        st.markdown('<hr>', unsafe_allow_html=True)
        st.markdown('<h2 class="sub-header">Filtres</h2>', unsafe_allow_html=True)
        
        # Ces filtres seront utilisés dans les différentes pages
        status_filter = st.multiselect(
            "Statut d'appel",
            ["Oui", "Non", "Rappel à programmer", "Pas intéressé", "Tous"],
            default=["Tous"]
        )
        
        date_range = st.date_input(
            "Plage de dates",
            value=(datetime.now() - timedelta(days=30), datetime.now()),
            max_value=datetime.now()
        )
        
        type_filter = st.multiselect(
            "Type de dossier",
            ["Renouvellement", "Refinancement", "Tous"],
            default=["Tous"]
        )
        
        conversion_filter = st.multiselect(
            "Statut de conversion",
            ["Non", "Pré Qualification", "Refinancement", "Renouvellement", "Tous"],
            default=["Tous"]
        )
        
        search_term = st.text_input("Recherche par nom/email/téléphone")
        
        filters = {
            "status": status_filter,
            "date_range": date_range,
            "type": type_filter,
            "conversion": conversion_filter,
            "search": search_term
        }
        
        # Bouton de déconnexion
        if st.button("Déconnexion"):
            st.session_state.authenticated = False
            st.experimental_rerun()
        
        return page, filters

# Fonction pour appliquer les filtres
def apply_filters(df, filters):
    filtered_df = df.copy()
    
    # Filtre par statut d'appel
    if "Tous" not in filters["status"] and filters["status"]:
        status_conditions = []
        for status in filters["status"]:
            if status == "Rappel à programmer":
                status_conditions.append(filtered_df['répondu au tel'].str.contains('Rappel', case=False, na=False))
            else:
                status_conditions.append(filtered_df['répondu au tel'] == status)
        
        if status_conditions:
            combined_condition = status_conditions[0]
            for condition in status_conditions[1:]:
                combined_condition = combined_condition | condition
            filtered_df = filtered_df[combined_condition]
    
    # Filtre par plage de dates
    if filters["date_range"] and len(filters["date_range"]) == 2:
        start_date, end_date = filters["date_range"]
        mask = (filtered_df['Date d\'appel'] >= pd.Timestamp(start_date)) & (filtered_df['Date d\'appel'] <= pd.Timestamp(end_date))
        # Ne filtrer que les lignes avec des dates valides
        date_filtered_df = filtered_df[mask]
        if not date_filtered_df.empty:
            filtered_df = date_filtered_df
    
    # Filtre par type de dossier
    if "Tous" not in filters["type"] and filters["type"]:
        filtered_df = filtered_df[filtered_df['Type'].isin(filters["type"])]
    
    # Filtre par statut de conversion
    if "Tous" not in filters["conversion"] and filters["conversion"]:
        filtered_df = filtered_df[filtered_df['Convertis'].isin(filters["conversion"])]
    
    # Recherche par terme
    if filters["search"]:
        search = filters["search"].lower()
        filtered_df = filtered_df[
            filtered_df['First Name:'].str.lower().str.contains(search, na=False) |
            filtered_df['Last Name:'].str.lower().str.contains(search, na=False) |
            filtered_df['Email:'].str.lower().str.contains(search, na=False) |
            filtered_df['Phone:'].astype(str).str.lower().str.contains(search, na=False)
        ]
    
    return filtered_df

# Page Tableau de bord
def dashboard_page(df, filters):
    st.markdown('<h2 class="sub-header">Vue d\'ensemble</h2>', unsafe_allow_html=True)
    
    # Appliquer les filtres
    filtered_df = apply_filters(df, filters)
    
    # Graphiques
    col1, col2 = st.columns(2)
    
    with col1:
        # Graphique circulaire des statuts d'appel
        status_counts = filtered_df['répondu au tel'].value_counts().reset_index()
        status_counts.columns = ['Statut', 'Nombre']
        
        fig = px.pie(
            status_counts, 
            values='Nombre', 
            names='Statut', 
            title='Répartition des statuts d\'appel',
            color_discrete_sequence=px.colors.sequential.Blues
        )
        fig.update_traces(textposition='inside', textinfo='percent+label')
        fig.update_layout(margin=dict(t=50, b=0, l=0, r=0))
        
        st.plotly_chart(fig, use_container_width=True)
    
    with col2:
        # Graphique à barres des conversions par type
        if 'Convertis' in filtered_df.columns and 'Type' in filtered_df.columns:
            conversion_by_type = filtered_df.groupby(['Type', 'Convertis']).size().reset_index(name='count')
            conversion_by_type = conversion_by_type[conversion_by_type['Convertis'] != 'Non spécifié']
            
            fig = px.bar(
                conversion_by_type,
                x='Type',
                y='count',
                color='Convertis',
                title='Conversions par type de dossier',
                color_discrete_sequence=px.colors.sequential.Blues
            )
            fig.update_layout(margin=dict(t=50, b=0, l=0, r=0))
            
            st.plotly_chart(fig, use_container_width=True)
    
    # Rappels programmés pour aujourd'hui
    st.markdown('<h3 class="sub-header">Rappels programmés pour aujourd\'hui</h3>', unsafe_allow_html=True)
    
    rappels_df = filtered_df[filtered_df['répondu au tel'].str.contains('Rappel', case=False, na=False)]
    
    if not rappels_df.empty:
        st.dataframe(
            rappels_df[['First Name:', 'Last Name:', 'Phone:', 'Email:', 'répondu au tel']],
            use_container_width=True,
            hide_index=True
        )
    else:
        st.info("Aucun rappel programmé pour aujourd'hui.")
    
    # Activité récente
    st.markdown('<h3 class="sub-header">Activité récente</h3>', unsafe_allow_html=True)
    
    recent_activity = filtered_df.sort_values(by='Date d\'appel', ascending=False).head(5)
    
    if not recent_activity.empty and 'Date d\'appel' in recent_activity.columns:
        st.dataframe(
            recent_activity[['First Name:', 'Last Name:', 'Date d\'appel', 'répondu au tel', 'Convertis']],
            use_container_width=True,
            hide_index=True
        )
    else:
        st.info("Aucune activité récente à afficher.")

# Page Liste des leads
def leads_list_page(df, filters):
    st.markdown('<h2 class="sub-header">Liste des leads</h2>', unsafe_allow_html=True)
    
    # Appliquer les filtres
    filtered_df = apply_filters(df, filters)
    
    # Options d'affichage
    col1, col2, col3 = st.columns([1, 1, 2])
    
    with col1:
        sort_by = st.selectbox(
            "Trier par",
            ["First Name:", "Last Name:", "Date d'appel", "répondu au tel", "Convertis"],
            index=0
        )
    
    with col2:
        sort_order = st.radio(
            "Ordre",
            ["Ascendant", "Descendant"],
            horizontal=True,
            index=0
        )
    
    with col3:
        st.write("")  # Espace vide pour l'alignement
    
    # Trier le DataFrame
    ascending = sort_order == "Ascendant"
    if sort_by in filtered_df.columns:
        sorted_df = filtered_df.sort_values(by=sort_by, ascending=ascending)
    else:
        sorted_df = filtered_df
    
    # Pagination
    items_per_page = 10
    total_pages = max(1, (len(sorted_df) + items_per_page - 1) // items_per_page)
    
    col1, col2, col3 = st.columns([1, 3, 1])
    
    with col2:
        page_number = st.slider(
            "Page",
            min_value=1,
            max_value=total_pages,
            value=1
        )
    
    start_idx = (page_number - 1) * items_per_page
    end_idx = min(start_idx + items_per_page, len(sorted_df))
    
    page_df = sorted_df.iloc[start_idx:end_idx].copy()
    
    # Afficher le tableau avec édition
    edited_df = st.data_editor(
        page_df,
        use_container_width=True,
        hide_index=True,
        num_rows="fixed",
        column_config={
            "Lead ID": st.column_config.NumberColumn("Lead ID", help="Identifiant unique du lead"),
            "First Name:": st.column_config.TextColumn("Prénom", help="Prénom du client"),
            "Last Name:": st.column_config.TextColumn("Nom", help="Nom de famille du client"),
            "Email:": st.column_config.TextColumn("Email", help="Adresse email du client"),
            "Phone:": st.column_config.TextColumn("Téléphone", help="Numéro de téléphone du client"),
            "répondu au tel": st.column_config.SelectboxColumn(
                "Statut d'appel",
                help="Statut de l'appel",
                options=[
                    "Oui", "Non", "Pas intéressé", "Call failed", "Numéro pas en service",
                    "Rappel à 18h", "Rappel à 18h Mercredi", "Pré qualifiaction - à rappeler demain",
                    "Rappel Lundi 24 Nov avec taux sur le marché", "Rappel à 3 PM pour renouvellement hypothécaire",
                    "Rappel à 5 PM pour renouvellement Hypothécaire", "à contacter", "Transférer - VENDU"
                ]
            ),
            "Date d'appel": st.column_config.DatetimeColumn("Date d'appel", help="Date et heure de l'appel"),
            "Convertis": st.column_config.SelectboxColumn(
                "Statut de conversion",
                help="Statut de conversion du lead",
                options=["Non", "DOUBLON", "Pré Qualification", "Refinancement", "Renouvellement"]
            ),
            "Type": st.column_config.SelectboxColumn(
                "Type de dossier",
                help="Type de dossier",
                options=["Renouvellement", "Refinancement", "Plus d'actualité"]
            )
        }
    )
    
    # Actions sur les données
    col1, col2, col3 = st.columns(3)
    
    with col1:
        if st.button("Sauvegarder les modifications", type="primary"):
            # Mettre à jour le DataFrame original avec les modifications
            for idx, row in edited_df.iterrows():
                df.loc[start_idx + idx] = row
            
            # Sauvegarder dans la base de données
            if save_data(df):
                st.success("Modifications sauvegardées avec succès!")
            else:
                st.error("Erreur lors de la sauvegarde des modifications.")
    
    with col2:
        if st.button("Exporter en CSV"):
            csv = sorted_df.to_csv(index=False)
            st.download_button(
                label="Télécharger CSV",
                data=csv,
                file_name="leads_nesto_export.csv",
                mime="text/csv"
            )
    
    with col3:
        if st.button("Exporter en Excel"):
            # Créer un fichier Excel temporaire en mémoire
            output = pd.ExcelWriter('temp_export.xlsx', engine='openpyxl')
            sorted_df.to_excel(output, index=False)
            output.close()
            
            # Lire le fichier et le proposer au téléchargement
            with open('temp_export.xlsx', "rb") as file:
                st.download_button(
                    label="Télécharger Excel",
                    data=file,
                    file_name="leads_nesto_export.xlsx",
                    mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                )

# Page Suivi des appels
def call_tracking_page(df, filters):
    st.markdown('<h2 class="sub-header">Suivi des appels</h2>', unsafe_allow_html=True)
    
    # Appliquer les filtres
    filtered_df = apply_filters(df, filters)
    
    # Interface en onglets
    tab1, tab2, tab3 = st.tabs(["Planification des rappels", "Historique des appels", "Nouvel appel"])
    
    with tab1:
        st.markdown('<h3 class="sub-header">Planification des rappels</h3>', unsafe_allow_html=True)
        
        # Afficher les rappels programmés
        rappels_df = filtered_df[filtered_df['répondu au tel'].str.contains('Rappel', case=False, na=False)]
        
        if not rappels_df.empty:
            st.dataframe(
                rappels_df[['First Name:', 'Last Name:', 'Phone:', 'Email:', 'répondu au tel']],
                use_container_width=True,
                hide_index=True
            )
            
            # Sélectionner un lead pour modifier le rappel
            selected_lead = st.selectbox(
                "Sélectionnez un lead pour modifier le rappel",
                rappels_df.index,
                format_func=lambda x: f"{rappels_df.loc[x, 'First Name:']} {rappels_df.loc[x, 'Last Name:']} - {rappels_df.loc[x, 'répondu au tel']}"
            )
            
            if selected_lead is not None:
                with st.form("update_callback_form"):
                    st.write(f"Modifier le rappel pour {rappels_df.loc[selected_lead, 'First Name:']} {rappels_df.loc[selected_lead, 'Last Name:']}")
                    
                    new_callback_status = st.text_input(
                        "Nouveau statut de rappel",
                        value=rappels_df.loc[selected_lead, 'répondu au tel']
                    )
                    
                    callback_date = st.date_input(
                        "Date de rappel",
                        value=datetime.now()
                    )
                    
                    callback_time = st.time_input(
                        "Heure de rappel",
                        value=datetime.now().time()
                    )
                    
                    notes = st.text_area(
                        "Notes pour le rappel",
                        value=""
                    )
                    
                    submit_button = st.form_submit_button("Mettre à jour le rappel")
                    
                    if submit_button:
                        # Mettre à jour le DataFrame
                        df.loc[selected_lead, 'répondu au tel'] = new_callback_status
                        df.loc[selected_lead, 'Date d\'appel'] = pd.Timestamp(datetime.combine(callback_date, callback_time))
                        
                        # Sauvegarder dans la base de données
                        if save_data(df):
                            st.success("Rappel mis à jour avec succès!")
                        else:
                            st.error("Erreur lors de la mise à jour du rappel.")
        else:
            st.info("Aucun rappel programmé.")
    
    with tab2:
        st.markdown('<h3 class="sub-header">Historique des appels</h3>', unsafe_allow_html=True)
        
        # Afficher l'historique des appels
        calls_history = filtered_df[filtered_df['Date d\'appel'].notna()].sort_values(by='Date d\'appel', ascending=False)
        
        if not calls_history.empty:
            st.dataframe(
                calls_history[['First Name:', 'Last Name:', 'Date d\'appel', 'répondu au tel', 'Convertis']],
                use_container_width=True,
                hide_index=True
            )
        else:
            st.info("Aucun historique d'appel à afficher.")
    
    with tab3:
        st.markdown('<h3 class="sub-header">Nouvel appel</h3>', unsafe_allow_html=True)
        
        # Sélectionner un lead pour un nouvel appel
        leads_to_call = filtered_df[~filtered_df.index.isin(filtered_df[filtered_df['Date d\'appel'].notna()].index)]
        
        if not leads_to_call.empty:
            selected_lead_for_call = st.selectbox(
                "Sélectionnez un lead à appeler",
                leads_to_call.index,
                format_func=lambda x: f"{leads_to_call.loc[x, 'First Name:']} {leads_to_call.loc[x, 'Last Name:']} - {leads_to_call.loc[x, 'Phone:'] if pd.notna(leads_to_call.loc[x, 'Phone:']) else 'No phone'}"
            )
            
            if selected_lead_for_call is not None:
                st.write(f"Informations du contact:")
                st.write(f"Nom: {leads_to_call.loc[selected_lead_for_call, 'First Name:']} {leads_to_call.loc[selected_lead_for_call, 'Last Name:']}")
                st.write(f"Téléphone: {leads_to_call.loc[selected_lead_for_call, 'Phone:'] if pd.notna(leads_to_call.loc[selected_lead_for_call, 'Phone:']) else 'Non disponible'}")
                st.write(f"Email: {leads_to_call.loc[selected_lead_for_call, 'Email:']}")
                
                with st.form("new_call_form"):
                    call_status = st.selectbox(
                        "Résultat de l'appel",
                        [
                            "Oui", "Non", "Pas intéressé", "Call failed", "Numéro pas en service",
                            "Rappel à 18h", "Rappel à 18h Mercredi", "Pré qualifiaction - à rappeler demain",
                            "Rappel Lundi 24 Nov avec taux sur le marché", "Rappel à 3 PM pour renouvellement hypothécaire",
                            "Rappel à 5 PM pour renouvellement Hypothécaire", "à contacter", "Transférer - VENDU"
                        ]
                    )
                    
                    conversion_status = st.selectbox(
                        "Statut de conversion",
                        ["Non", "DOUBLON", "Pré Qualification", "Refinancement", "Renouvellement", "Non spécifié"],
                        index=5
                    )
                    
                    call_notes = st.text_area(
                        "Notes d'appel",
                        value=""
                    )
                    
                    submit_call = st.form_submit_button("Enregistrer l'appel")
                    
                    if submit_call:
                        # Mettre à jour le DataFrame
                        df.loc[selected_lead_for_call, 'répondu au tel'] = call_status
                        df.loc[selected_lead_for_call, 'Date d\'appel'] = pd.Timestamp(datetime.now())
                        
                        if conversion_status != "Non spécifié":
                            df.loc[selected_lead_for_call, 'Convertis'] = conversion_status
                        
                        # Sauvegarder dans la base de données
                        if save_data(df):
                            st.success("Appel enregistré avec succès!")
                        else:
                            st.error("Erreur lors de l'enregistrement de l'appel.")
        else:
            st.info("Tous les leads ont déjà été contactés.")

# Page Rapports
def reports_page(df, filters):
    st.markdown('<h2 class="sub-header">Rapports et Analyses</h2>', unsafe_allow_html=True)
    
    # Appliquer les filtres
    filtered_df = apply_filters(df, filters)
    
    # Interface en onglets
    tab1, tab2, tab3 = st.tabs(["Performance", "Tendances", "Répartition"])
    
    with tab1:
        st.markdown('<h3 class="sub-header">Performance des appels</h3>', unsafe_allow_html=True)
        
        # Taux de réponse
        reponses = filtered_df['répondu au tel'].value_counts()
        
        fig = px.pie(
            names=reponses.index,
            values=reponses.values,
            title="Taux de réponse aux appels",
            color_discrete_sequence=px.colors.sequential.Blues
        )
        fig.update_traces(textposition='inside', textinfo='percent+label')
        
        st.plotly_chart(fig, use_container_width=True)
        
        # Taux de conversion
        if 'Convertis' in filtered_df.columns:
            conversions = filtered_df['Convertis'].value_counts()
            
            fig = px.bar(
                x=conversions.index,
                y=conversions.values,
                title="Statuts de conversion",
                labels={'x': 'Statut', 'y': 'Nombre de leads'},
                color_discrete_sequence=px.colors.sequential.Blues
            )
            
            st.plotly_chart(fig, use_container_width=True)
    
    with tab2:
        st.markdown('<h3 class="sub-header">Tendances temporelles</h3>', unsafe_allow_html=True)
        
        # Vérifier si des dates d'appel sont disponibles
        if 'Date d\'appel' in filtered_df.columns and filtered_df['Date d\'appel'].notna().any():
            # Créer une copie du DataFrame avec seulement les dates valides
            date_df = filtered_df[filtered_df['Date d\'appel'].notna()].copy()
            
            # Extraire la date (sans l'heure)
            date_df['Date'] = date_df['Date d\'appel'].dt.date
            
            # Compter les appels par jour
            calls_by_date = date_df.groupby('Date').size().reset_index(name='Nombre d\'appels')
            
            fig = px.line(
                calls_by_date,
                x='Date',
                y='Nombre d\'appels',
                title="Nombre d'appels par jour",
                markers=True
            )
            
            st.plotly_chart(fig, use_container_width=True)
            
            # Conversions par jour
            if 'Convertis' in date_df.columns:
                conversions_by_date = date_df[date_df['Convertis'].notna() & (date_df['Convertis'] != 'Non') & (date_df['Convertis'] != 'Non spécifié')].groupby('Date').size().reset_index(name='Nombre de conversions')
                
                fig = px.line(
                    conversions_by_date,
                    x='Date',
                    y='Nombre de conversions',
                    title="Nombre de conversions par jour",
                    markers=True
                )
                
                st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("Pas assez de données temporelles pour afficher les tendances.")
    
    with tab3:
        st.markdown('<h3 class="sub-header">Répartition par type</h3>', unsafe_allow_html=True)
        
        # Répartition par type de dossier
        if 'Type' in filtered_df.columns:
            types = filtered_df['Type'].value_counts()
            
            fig = px.bar(
                x=types.index,
                y=types.values,
                title="Répartition par type de dossier",
                labels={'x': 'Type', 'y': 'Nombre de leads'},
                color_discrete_sequence=px.colors.sequential.Blues
            )
            
            st.plotly_chart(fig, use_container_width=True)
        
        # Matrice de conversion par type
        if 'Convertis' in filtered_df.columns and 'Type' in filtered_df.columns:
            # Créer une table croisée
            cross_tab = pd.crosstab(filtered_df['Type'], filtered_df['Convertis'])
            
            fig = px.imshow(
                cross_tab,
                title="Matrice de conversion par type",
                color_continuous_scale='Blues',
                labels=dict(x="Statut de conversion", y="Type de dossier", color="Nombre")
            )
            
            st.plotly_chart(fig, use_container_width=True)

# Page Paramètres
def settings_page():
    st.markdown('<h2 class="sub-header">Paramètres</h2>', unsafe_allow_html=True)
    
    # Interface en onglets
    tab1, tab2, tab3 = st.tabs(["Personnalisation", "Importation/Exportation", "Aide"])
    
    with tab1:
        st.markdown('<h3 class="sub-header">Personnalisation de l\'interface</h3>', unsafe_allow_html=True)
        
        st.write("Cette section vous permet de personnaliser l'apparence et le comportement du tableau de bord.")
        
        # Options de personnalisation
        theme = st.selectbox(
            "Thème",
            ["Clair", "Sombre", "Bleu (par défaut)"],
            index=2
        )
        
        items_per_page = st.slider(
            "Nombre d'éléments par page",
            min_value=5,
            max_value=50,
            value=10,
            step=5
        )
        
        date_format = st.selectbox(
            "Format de date",
            ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"],
            index=0
        )
        
        st.info("Les options de personnalisation seront disponibles dans une future mise à jour.")
    
    with tab2:
        st.markdown('<h3 class="sub-header">Importation et Exportation</h3>', unsafe_allow_html=True)
        
        st.write("Cette section vous permet d'importer et d'exporter des données.")
        
        # Importation
        st.subheader("Importer des données")
        
        uploaded_file = st.file_uploader("Choisir un fichier Excel", type=["xlsx"])
        
        if uploaded_file is not None:
            if st.button("Importer les données"):
                try:
                    # Lire le fichier Excel
                    df = pd.read_excel(uploaded_file)
                    
                    # Sauvegarder dans la base de données
                    conn = sqlite3.connect('nesto_leads.db')
                    df.to_sql('leads', conn, if_exists='replace', index=False)
                    conn.close()
                    
                    st.success("Données importées avec succès! Veuillez rafraîchir la page pour voir les changements.")
                except Exception as e:
                    st.error(f"Erreur lors de l'importation des données: {e}")
        
        # Exportation
        st.subheader("Exporter les données")
        
        export_format = st.radio(
            "Format d'exportation",
            ["Excel (.xlsx)", "CSV (.csv)"],
            horizontal=True
        )
        
        if st.button("Exporter toutes les données"):
            try:
                # Charger les données
                conn = sqlite3.connect('nesto_leads.db')
                df = pd.read_sql_query("SELECT * FROM leads", conn)
                conn.close()
                
                if export_format == "Excel (.xlsx)":
                    # Créer un fichier Excel
                    output = pd.ExcelWriter('export_complet.xlsx', engine='openpyxl')
                    df.to_excel(output, index=False)
                    output.close()
                    
                    # Lire le fichier et le proposer au téléchargement
                    with open('export_complet.xlsx', "rb") as file:
                        st.download_button(
                            label="Télécharger Excel",
                            data=file,
                            file_name="leads_nesto_export_complet.xlsx",
                            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        )
                else:
                    csv = df.to_csv(index=False)
                    st.download_button(
                        label="Télécharger CSV",
                        data=csv,
                        file_name="leads_nesto_export_complet.csv",
                        mime="text/csv"
                    )
            except Exception as e:
                st.error(f"Erreur lors de l'exportation des données: {e}")
    
    with tab3:
        st.markdown('<h3 class="sub-header">Aide et Documentation</h3>', unsafe_allow_html=True)
        
        st.write("Cette section fournit de l'aide et de la documentation sur l'utilisation du tableau de bord.")
        
        with st.expander("Comment utiliser le tableau de bord"):
            st.write("""
            Le tableau de bord Nesto vous permet de suivre vos leads clients et l'avancement de vos dossiers. Voici comment l'utiliser :
            
            1. **Navigation** : Utilisez la barre latérale pour naviguer entre les différentes pages du tableau de bord.
            2. **Filtres** : Utilisez les filtres dans la barre latérale pour affiner les données affichées.
            3. **Tableau de bord** : Affiche une vue d'ensemble de vos leads et de vos performances.
            4. **Liste des leads** : Affiche la liste complète de vos leads avec la possibilité de les modifier.
            5. **Suivi des appels** : Permet de planifier et d'enregistrer vos appels clients.
            6. **Rapports** : Affiche des graphiques et des analyses sur vos performances.
            7. **Paramètres** : Permet de personnaliser le tableau de bord et de gérer vos données.
            """)
        
        with st.expander("Comment gérer les rappels"):
            st.write("""
            Pour gérer les rappels clients :
            
            1. Accédez à la page "Suivi des appels".
            2. Sélectionnez l'onglet "Planification des rappels".
            3. Vous verrez la liste des rappels programmés.
            4. Pour modifier un rappel, sélectionnez-le dans la liste déroulante et mettez à jour les informations.
            5. Pour programmer un nouveau rappel, allez dans l'onglet "Nouvel appel", sélectionnez un lead et choisissez une option de rappel.
            """)
        
        with st.expander("Comment exporter des données"):
            st.write("""
            Pour exporter vos données :
            
            1. Accédez à la page "Liste des leads" ou "Paramètres".
            2. Sur la page "Liste des leads", utilisez les boutons "Exporter en CSV" ou "Exporter en Excel" pour exporter les données filtrées.
            3. Sur la page "Paramètres", allez dans l'onglet "Importation/Exportation" et utilisez le bouton "Exporter toutes les données" pour exporter l'ensemble des données.
            """)
        
        st.info("Pour toute question ou assistance supplémentaire, veuillez contacter votre administrateur système.")

# Page de connexion
def login_page():
    st.markdown('<div class="login-container">', unsafe_allow_html=True)
    st.markdown('<div class="login-header">', unsafe_allow_html=True)
    st.image("https://nesto.ca/wp-content/uploads/2022/06/nesto-logo.svg", width=150)
    st.markdown('<h1 class="main-header">Tableau de Bord Nesto</h1>', unsafe_allow_html=True)
    st.markdown('</div>', unsafe_allow_html=True)
    
    username = st.text_input("Nom d'utilisateur")
    password = st.text_input("Mot de passe", type="password")
    
    if st.button("Connexion", type="primary"):
        if username and password:
            if check_auth(username, password):
                st.session_state.authenticated = True
                st.success("Connexion réussie!")
                st.experimental_rerun()
            else:
                st.error("Nom d'utilisateur ou mot de passe incorrect.")
        else:
            st.warning("Veuillez entrer un nom d'utilisateur et un mot de passe.")
    
    st.markdown('</div>', unsafe_allow_html=True)

# Fonction principale
def main():
    # Initialiser la base de données si nécessaire
    init_db()
    
    # Charger les styles CSS
    load_css()
    
    # Initialiser l'état de session si nécessaire
    if 'authenticated' not in st.session_state:
        st.session_state.authenticated = False
    
    # Vérifier si l'utilisateur est connecté
    if not st.session_state.authenticated:
        login_page()
    else:
        # Charger les données
        df = load_data()
        
        # Créer la barre latérale
        page, filters = create_sidebar()
        
        # Créer l'en-tête
        create_header(df)
        
        # Afficher la page sélectionnée
        if page == "Tableau de bord":
            dashboard_page(df, filters)
        elif page == "Liste des leads":
            leads_list_page(df, filters)
        elif page == "Suivi des appels":
            call_tracking_page(df, filters)
        elif page == "Rapports":
            reports_page(df, filters)
        elif page == "Paramètres":
            settings_page()
        
        # Pied de page
        st.markdown(
            '<div class="footer">© 2025 Tableau de Bord Nesto. Tous droits réservés.</div>',
            unsafe_allow_html=True
        )

if __name__ == "__main__":
    main()
