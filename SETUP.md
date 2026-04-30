# THEIA Clone — Guide de démarrage

## 1. Créer le projet Supabase

1. Aller sur [supabase.com](https://supabase.com) → New project
2. Copier l'URL et la clé `anon` depuis **Settings → API**
3. Renseigner dans `.env.local` :

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## 2. Initialiser la base de données

Dans **Supabase → SQL Editor**, exécuter dans l'ordre :

```
supabase/schema.sql   ← Tables, RLS, triggers
supabase/seed.sql     ← Données de démonstration (optionnel)
```

## 3. Créer le compte admin

1. **Authentication → Users → Add user** :
   - Email : `admin@cesi.fr`
   - Password : `Admin1234!`

2. Dans **SQL Editor** :
```sql
update public.profiles set role = 'admin' where email = 'admin@cesi.fr';
```

## 4. Lancer en local

```bash
npm install
npm run dev
```

→ http://localhost:5173

## 5. Déployer sur Vercel

```bash
# Via CLI
npx vercel

# Ou connecter le repo GitHub sur vercel.com
# Variables d'env à ajouter dans Vercel :
# VITE_SUPABASE_URL
# VITE_SUPABASE_ANON_KEY
```

---

## Format JSON d'un examen

```json
{
  "title": "Nom de l'examen",
  "description": "Description (optionnel)",
  "duration": 60,
  "questions": [
    {
      "id": 1,
      "text": "Texte de la question",
      "type": "single",
      "coefficient": 2,
      "choices": [
        { "id": "a", "text": "Choix A", "correct": false },
        { "id": "b", "text": "Choix B", "correct": true }
      ]
    },
    {
      "id": 2,
      "type": "multiple",
      "coefficient": 3,
      "text": "Question à choix multiples",
      "choices": [...]
    },
    {
      "id": 3,
      "type": "text",
      "coefficient": 4,
      "text": "Question à réponse libre (correction manuelle)"
    }
  ]
}
```

## Barème THEIA

| Type | Formule |
|------|---------|
| `single` | Tout ou rien × coefficient |
| `multiple` | `max(0, (bonnes - mauvaises) / total_correctes) × coefficient` |
| `text` | Correction manuelle (0 par défaut) |

**Note finale** = `(total_points / max_points) × 20`
