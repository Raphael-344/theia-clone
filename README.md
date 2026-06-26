# THEIA Clone — Plateforme d'examens en ligne

Reproduction open-source de la plateforme THEIA permettant aux administrateurs de créer et gérer des examens QCM en ligne, et aux étudiants de les passer dans un environnement sécurisé avec anti-triche intégré.

---

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React 18, Vite, React Router v6 |
| Style | Tailwind CSS, Lucide React |
| Backend / BDD | Supabase (Auth, Postgres, Storage) |
| Déploiement | Vercel |
| Extracteur PDF | Python, pdfplumber, PyMuPDF, Ollama (Llama 3.2) |

---

## Fonctionnalités

### Interface étudiant
- Tableau de bord avec les examens disponibles et leur statut
- Passage d'examen avec minuteur et barre de progression
- Navigation entre questions, réponses modifiables jusqu'à la soumission
- Résultats détaillés question par question après correction

### Interface administrateur
- Gestion complète des examens (création, édition, activation/désactivation)
- Import d'examens via JSON ou extraction automatique depuis un PDF
- Suivi des sessions en cours et des résultats par étudiant
- Correction manuelle des questions à réponse libre
- Création manuelle des comptes étudiants (email, nom, mot de passe) — il n'y a pas d'inscription en libre-service, seul l'administrateur peut ajouter des étudiants

### Types de questions
- **Choix unique** — une seule bonne réponse
- **Choix multiple** — barème partiel (bonnes réponses moins mauvaises)
- **Réponse libre** — correction manuelle par l'administrateur
- Support des **images** dans les énoncés (stockées sur Supabase Storage)
- Questions **numériques** avec plage de réponses acceptées

### Barème THEIA
| Type | Formule |
|---|---|
| `single` | Tout ou rien × coefficient |
| `multiple` | `max(0, (bonnes − mauvaises) / total_correctes) × coefficient` |
| `text` | Correction manuelle (0 par défaut) |

**Note finale** = `(points obtenus / points max) × 20`

### Système anti-triche
Toutes les violations sont enregistrées en base (`anti_cheat_logs`) et visibles par l'administrateur :
- Changement d'onglet ou fenêtre masquée
- Tentative de quitter la page
- Copier / coller bloqués
- Clic droit bloqué
- Raccourcis DevTools bloqués (F12, Ctrl+U, Ctrl+Shift+I)
- Sortie du mode plein écran

### Extracteur PDF → JSON (`ia-extractor/`)
Script Python qui lit un PDF d'examen THEIA, extrait les questions et les bonnes réponses automatiquement (via surbrillance ou symboles), nettoie les textes avec Llama 3.2 (Ollama) et uploade l'examen directement dans Supabase.

```bash
python extract.py mon_examen.pdf "Titre de l'examen" "Description" 20
```

---

## Accès démo

> **Pour démo uniquement** — ces identifiants donnent accès à l'interface étudiant sur l'instance de démonstration.

| Champ | Valeur |
|---|---|
| Email | `demo@theia.com` |
| Mot de passe | `Demo1234` |
| Rôle | Étudiant |

Le compte démo est en lecture seule côté étudiant : il permet de consulter les examens disponibles et de voir l'interface, mais les sessions passées avec ce compte ne sont pas représentatives de vraies données.

---

## Captures d'écran

> **À ajouter manuellement** — lance le projet en local (`npm run dev`) et capture les vues suivantes :
> - Page de connexion (`/`)
> - Dashboard étudiant (`/student`)
> - Page d'examen en cours (`/exam/:id`)
> - Dashboard admin (`/admin`)
> - Éditeur d'examen admin (`/admin/exams/:id`)

---

## Installation rapide

```bash
git clone https://github.com/Raphael-344/theia-clone
cd theia-clone
npm install
# Copier .env.example en .env.local et renseigner les variables Supabase
npm run dev
```

Pour la configuration complète de Supabase, la base de données et le déploiement Vercel, voir **[SETUP.md](./SETUP.md)**.

---

## Structure du projet

```
src/
├── components/
│   ├── Admin/          # Import et liste des examens (admin)
│   └── Layout/         # Header, Sidebar, Layout global
├── contexts/
│   └── AuthContext.jsx # Authentification Supabase
├── hooks/
│   └── useAntiCheat.js # Hook anti-triche
├── lib/
│   ├── supabase.js     # Client Supabase
│   └── scoring.js      # Calcul des notes
└── pages/              # Toutes les vues (Login, Student*, Admin*)

supabase/
├── schema.sql          # Tables, RLS, triggers
└── seed.sql            # Données de démonstration

ia-extractor/
└── extract.py          # Extraction PDF → JSON → Supabase
```
