-- ============================================================
-- REVERT — Retour à l'état d'avant la sécurisation
-- Exécuter en une fois dans Supabase → SQL Editor
-- ============================================================
-- Ce script :
--   1. Remet "correct" dans exams.questions (depuis exam_answers)
--   2. Supprime toutes les sessions (données de test)
--   3. Supprime les fonctions créées
--   4. Supprime la table exam_answers


-- ─── Étape 1 : Restaurer "correct" dans exams.questions ────
-- Relit exam_answers et remet le champ "correct" dans chaque
-- choix du JSONB, pour que le scoring client-side refonctionne.

do $$
declare
  exam_rec    record;
  q_rec       record;
  q           jsonb;
  ans_rec     record;
  restored_ch jsonb;
  ch          jsonb;
  ch_id       text;
  restored_q  jsonb;
  restored_qs jsonb;
begin
  for exam_rec in select id, questions from public.exams loop
    restored_qs := '[]'::jsonb;

    for q_rec in select value from jsonb_array_elements(exam_rec.questions) loop
      q := q_rec.value;
      restored_q := q;

      select * into ans_rec from public.exam_answers
      where exam_id = exam_rec.id and question_id = q->>'id';

      -- Remettre "correct" dans les choix
      if found and (q->>'type') in ('single', 'multiple') and q->'choices' is not null then
        restored_ch := '[]'::jsonb;
        for ch in select value from jsonb_array_elements(q->'choices') loop
          ch_id := ch->>'id';
          restored_ch := restored_ch || jsonb_build_array(
            ch || jsonb_build_object('correct', ch_id = any(ans_rec.correct_choice_ids))
          );
        end loop;
        restored_q := jsonb_set(q, '{choices}', restored_ch);
      end if;

      -- Remettre les champs correct_answer pour les questions texte
      if found and ans_rec.correct_answer is not null then
        restored_q := jsonb_set(restored_q, '{correct_answer}', to_jsonb(ans_rec.correct_answer));
      end if;
      if found and ans_rec.correct_answer_min is not null then
        restored_q := jsonb_set(restored_q, '{correct_answer_min}', to_jsonb(ans_rec.correct_answer_min));
      end if;
      if found and ans_rec.correct_answer_max is not null then
        restored_q := jsonb_set(restored_q, '{correct_answer_max}', to_jsonb(ans_rec.correct_answer_max));
      end if;

      restored_qs := restored_qs || jsonb_build_array(restored_q);
    end loop;

    update public.exams set questions = restored_qs where id = exam_rec.id;
  end loop;
end;
$$;


-- ─── Étape 2 : Supprimer les sessions de test ──────────────

delete from public.exam_sessions;


-- ─── Étape 3 : Supprimer les fonctions ─────────────────────

drop function if exists public.submit_exam(uuid, jsonb);
drop function if exists public.recalculate_sessions(uuid);
drop function if exists public._score_answers(uuid, uuid, jsonb, jsonb);
drop function if exists public.theia_factor(integer, integer);


-- ─── Étape 4 : Supprimer la table exam_answers ─────────────

drop table if exists public.exam_answers cascade;
