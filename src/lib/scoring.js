/**
 * Barème THEIA — tableau de discordances officiel
 * THEIA_TABLE[n][k] = facteur de score pour n propositions et k discordances
 * k = nombre de propositions où la réponse étudiante diffère de la réponse attendue
 */
const THEIA_TABLE = {
  1:  [1, 0],
  2:  [1, 0,    0],
  3:  [1, 0.3,  0,    0],
  4:  [1, 0.43, 0.1,  0,    0],
  5:  [1, 0.5,  0.2,  0,    0,    0],
  6:  [1, 0.58, 0.3,  0.1,  0,    0,    0],
  7:  [1, 0.64, 0.37, 0.17, 0.03, 0,    0,    0],
  8:  [1, 0.68, 0.43, 0.24, 0.1,  0,    0,    0,    0],
  9:  [1, 0.72, 0.47, 0.3,  0.15, 0.04, 0,    0,    0,    0],
  10: [1, 0.75, 0.5,  0.35, 0.2,  0.1,  0,    0,    0,    0,    0],
}

function theiaScore(n, k, coeff) {
  const tableN = Math.min(Math.max(n, 1), 10)
  const table = THEIA_TABLE[tableN]
  const kClamped = Math.min(k, table.length - 1)
  return parseFloat((table[kClamped] * coeff).toFixed(3))
}

export function scoreExam(questions, answers) {
  let totalPoints = 0
  let maxPoints = 0
  const discordances = []

  for (const question of questions) {
    const coeff = question.coefficient ?? 1
    const studentAnswer = answers[question.id]

    // Questions annulées — exclues du barème (maxPoints inchangé)
    if (question.annulee) {
      discordances.push({
        questionId:      question.id,
        questionText:    question.text,
        type:            question.type,
        expectedAnswer:  '(question annulée)',
        studentAnswer:   '—',
        score:           0,
        maxScore:        0,
        status:          'cancelled',
        coeff:           0,
        discordanceCount: 0,
        totalProps:       0,
      })
      continue
    }

    maxPoints += coeff

    if (question.type === 'text') {
      // ── 1. Plage numérique [min ; max] ──────────────────────
      const hasRange = question.correct_answer_min != null && question.correct_answer_max != null
      if (hasRange) {
        const val = parseFloat(String(studentAnswer ?? '').trim().replace(',', '.'))
        const min = parseFloat(question.correct_answer_min)
        const max = parseFloat(question.correct_answer_max)
        const isCorrect = !isNaN(val) && val >= min && val <= max
        const score = isCorrect ? coeff : 0
        totalPoints += score
        discordances.push({
          questionId:      question.id,
          questionText:    question.text,
          type:            'text',
          expectedAnswer:  `${min} ≤ x ≤ ${max}`,
          studentAnswer:   String(studentAnswer ?? '(non répondu)'),
          score,
          maxScore:        coeff,
          status:          !studentAnswer ? 'empty' : isCorrect ? 'correct' : 'wrong',
          coeff,
          discordanceCount: isCorrect ? 0 : 1,
          totalProps:       0,
        })
        continue
      }

      // ── 2. Valeur exacte (correct_answer ou choix correct) ───
      const correctChoice = question.choices?.find((c) => c.correct)
      const correctAnswer = question.correct_answer ?? correctChoice?.text ?? null

      if (correctAnswer !== null && correctAnswer !== '') {
        const norm = (v) => String(v ?? '').trim().toLowerCase()
        const isCorrect = norm(studentAnswer) === norm(correctAnswer)
        const score = isCorrect ? coeff : 0
        totalPoints += score
        discordances.push({
          questionId:      question.id,
          questionText:    question.text,
          type:            'text',
          expectedAnswer:  String(correctAnswer),
          studentAnswer:   String(studentAnswer ?? '(non répondu)'),
          score,
          maxScore:        coeff,
          status:          !studentAnswer ? 'empty' : isCorrect ? 'correct' : 'wrong',
          coeff,
          discordanceCount: isCorrect ? 0 : 1,
          totalProps:       0,
        })
      } else {
        // ── 3. Correction manuelle ───────────────────────────────
        discordances.push({
          questionId:      question.id,
          questionText:    question.text,
          type:            'text',
          expectedAnswer:  '(correction manuelle)',
          studentAnswer:   studentAnswer ?? '(non répondu)',
          score:           0,
          maxScore:        coeff,
          status:          'manual',
          coeff,
          discordanceCount: 0,
          totalProps:       0,
        })
      }
      continue
    }

    const choices = question.choices ?? []
    const n = choices.length
    const correctIds = new Set(choices.filter((c) => c.correct).map((c) => c.id))

    const selectedIds = question.type === 'single'
      ? new Set(studentAnswer ? [studentAnswer] : [])
      : new Set(Array.isArray(studentAnswer) ? studentAnswer : [])

    // Discordances : propositions où réponse étudiante ≠ réponse attendue
    let k = 0
    for (const choice of choices) {
      if (correctIds.has(choice.id) !== selectedIds.has(choice.id)) k++
    }

    // Aucune sélection = 0 point (le tableau Theia ne s'applique qu'aux sélections actives)
    const score = selectedIds.size === 0 ? 0 : theiaScore(n, k, coeff)
    totalPoints += score

    const expectedTexts = [...correctIds]
      .map((id) => choices.find((c) => c.id === id)?.text ?? id)
      .join(', ')

    const studentTexts = selectedIds.size > 0
      ? [...selectedIds].map((id) => choices.find((c) => c.id === id)?.text ?? id).join(', ')
      : '(non répondu)'

    let status
    if (selectedIds.size === 0) {
      status = 'empty'
    } else if (k === 0) {
      status = 'correct'
    } else if (score > 0) {
      status = 'partial'
    } else {
      status = 'wrong'
    }

    discordances.push({
      questionId: question.id,
      questionText: question.text,
      type: question.type,
      expectedAnswer: expectedTexts,
      studentAnswer: studentTexts,
      score,
      maxScore: coeff,
      status,
      coeff,
      discordanceCount: k,
      totalProps: n,
    })
  }

  // Note finale = pourcentage 0-100
  const finalNote = maxPoints > 0
    ? parseFloat(((totalPoints / maxPoints) * 100).toFixed(2))
    : 0

  return {
    totalPoints: parseFloat(totalPoints.toFixed(3)),
    maxPoints,
    finalNote,
    discordances,
  }
}

// Mention CESI A/B/C/D basée sur le pourcentage
export function getNoteGrade(pct) {
  if (pct >= 75) return 'A'
  if (pct >= 50) return 'B'
  if (pct >= 25) return 'C'
  return 'D'
}

export function getNoteColor(pct) {
  if (pct >= 75) return 'text-green-600'
  if (pct >= 50) return 'text-blue-600'
  if (pct >= 25) return 'text-yellow-600'
  return 'text-red-600'
}

export function getNoteLabel(pct) {
  if (pct >= 75) return 'Très bien'
  if (pct >= 50) return 'Bien'
  if (pct >= 25) return 'Passable'
  return 'Insuffisant'
}
