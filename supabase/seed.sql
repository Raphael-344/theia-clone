-- ============================================================
-- Seed — données de démonstration
-- ============================================================

-- Insérer un examen de démo (after creating admin account)
-- Remplacez 'ADMIN_UUID' par l'UUID de votre compte admin

insert into public.exams (title, description, duration, questions, is_active)
values (
  'Examen de démonstration — Algorithmique',
  'Évaluation des connaissances fondamentales en algorithmique et structures de données.',
  45,
  '[
    {
      "id": 1,
      "text": "Quelle est la complexité temporelle d''un algorithme de tri rapide (QuickSort) dans le meilleur cas ?",
      "type": "single",
      "coefficient": 2,
      "choices": [
        {"id": "a", "text": "O(n²)", "correct": false},
        {"id": "b", "text": "O(n log n)", "correct": true},
        {"id": "c", "text": "O(n)", "correct": false},
        {"id": "d", "text": "O(log n)", "correct": false}
      ]
    },
    {
      "id": 2,
      "text": "Parmi les structures de données suivantes, lesquelles permettent un accès en O(1) en moyenne ?",
      "type": "multiple",
      "coefficient": 3,
      "choices": [
        {"id": "a", "text": "Table de hachage", "correct": true},
        {"id": "b", "text": "Tableau (accès par index)", "correct": true},
        {"id": "c", "text": "Liste chaînée", "correct": false},
        {"id": "d", "text": "Arbre binaire de recherche équilibré", "correct": false}
      ]
    },
    {
      "id": 3,
      "text": "Qu''est-ce qu''une file (queue) ?",
      "type": "single",
      "coefficient": 1,
      "choices": [
        {"id": "a", "text": "Une structure LIFO (Last In, First Out)", "correct": false},
        {"id": "b", "text": "Une structure FIFO (First In, First Out)", "correct": true},
        {"id": "c", "text": "Une structure d''accès aléatoire", "correct": false},
        {"id": "d", "text": "Un arbre binaire", "correct": false}
      ]
    },
    {
      "id": 4,
      "text": "Expliquez brièvement la différence entre la récursivité et l''itération.",
      "type": "text",
      "coefficient": 4
    }
  ]'::jsonb,
  true
);
