import pdfplumber
import ollama
import json
import re
import os
import sys
import uuid
import io
import fitz  # pymupdf
from PIL import Image
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Couleur de surbrillance bleue dans les PDFs type "Matériaux"
BLUE_HIGHLIGHT = (0.909803921, 0.945098039, 0.952941176)

# ─────────────────────────────────────────────
# DÉTECTION DU FORMAT PDF
# ─────────────────────────────────────────────

def detect_format(pdf_path):
    with pdfplumber.open(pdf_path) as pdf:
        page = pdf.pages[0]
        text = page.extract_text() or ""
        if "☑" in text or "■" in text:
            return "wbs"
        blue_rects = [r for r in page.rects if r.get("non_stroking_color") == BLUE_HIGHLIGHT]
        if blue_rects:
            return "materiaux"
    return "unknown"

# ─────────────────────────────────────────────
# EXTRACTION D'IMAGES + UPLOAD SUPABASE STORAGE
# ─────────────────────────────────────────────

def extract_and_upload_image(pdf_path, page_num, img_info, supabase):
    """Extrait une image d'une page PDF et l'uploade dans Supabase Storage"""
    try:
        doc = fitz.open(pdf_path)
        page = doc[page_num]
        mat = fitz.Matrix(2, 2)  # x2 résolution
        pix = page.get_pixmap(matrix=mat)
        full_img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

        scale = 2
        x0 = int(img_info['x0'] * scale)
        y0 = int(img_info['top'] * scale)
        x1 = int(img_info['x1'] * scale)
        y1 = int(img_info['bottom'] * scale)

        cropped = full_img.crop((x0, y0, x1, y1))

        # Convertir en bytes PNG
        img_bytes = io.BytesIO()
        cropped.save(img_bytes, format='PNG')
        img_bytes.seek(0)

        # Nom unique pour le fichier
        filename = f"question_{uuid.uuid4().hex[:8]}.png"

        # Upload dans Supabase Storage
        supabase.storage.from_("exam-images").upload(
            filename,
            img_bytes.read(),
            {"content-type": "image/png"}
        )

        # URL publique
        url = supabase.storage.from_("exam-images").get_public_url(filename)
        return url
    except Exception as e:
        print(f"  ⚠️  Erreur extraction image : {e}")
        return None

def find_question_images(pdf_path, page_num, question_top, question_bottom):
    """Trouve les images significatives dans la zone d'une question"""
    with pdfplumber.open(pdf_path) as pdf:
        page = pdf.pages[page_num]
        big_images = []
        for img in page.images:
            # Ignorer les images trop petites (décoratives)
            if img['width'] < 100 or img['height'] < 50:
                continue
            # Ignorer les images qui couvrent toute la page (cadres)
            if img['width'] > page.width * 0.9 and img['height'] > page.height * 0.8:
                continue
            img_top = img['top']
            img_bottom = img['bottom']
            # L'image est-elle dans la zone de la question ?
            if img_top >= question_top - 20 and img_bottom <= question_bottom + 20:
                big_images.append(img)
        return big_images

# ─────────────────────────────────────────────
# EXTRACTION FORMAT WBS (☑ / ■)
# ─────────────────────────────────────────────

def extract_wbs(pdf_path):
    raw_questions = []

    with pdfplumber.open(pdf_path) as pdf:
        full_text = ""
        for page in pdf.pages:
            full_text += (page.extract_text() or "") + "\n"

    blocks = re.split(r'Question \d+\s+Question à réponses?\s*\w*', full_text)
    question_matches = re.finditer(r'(Question \d+\s+Question à réponses?\s*(\w*))', full_text)

    types = []
    for m in question_matches:
        t = m.group(2).lower()
        if "multiple" in t:
            types.append("multiple")
        else:
            types.append("single")

    for i, block in enumerate(blocks[1:]):
        if i >= len(types):
            break

        lines = [l.strip() for l in block.strip().split('\n') if l.strip()]

        question_text = ""
        choice_start = 0
        for j, line in enumerate(lines):
            if re.match(r'^Réponses? (correctes?|partiellement|incorrectes?)', line):
                choice_start = j
                break
            if not re.match(r'^(Réponse|[A-E]\s)', line):
                question_text += " " + line

        question_text = question_text.strip()

        choices = []
        choice_ids = ["a", "b", "c", "d", "e"]

        for line in lines[choice_start:]:
            m = re.match(r'^([A-E])\s+(☑|■)\s+(☑|■)\s+\S+\s+(.+)$', line)
            if m:
                letter = m.group(1)
                attendue = m.group(2)
                text = m.group(4).strip()
                idx = ord(letter) - ord('A')
                choices.append({
                    "id": choice_ids[idx],
                    "text": text,
                    "correct": attendue == "☑"
                })

        if question_text and choices:
            raw_questions.append({
                "type": types[i],
                "text": question_text,
                "choices": choices,
                "image_url": None
            })

    return raw_questions

# ─────────────────────────────────────────────
# EXTRACTION FORMAT MATÉRIAUX (surbrillance bleue)
# ─────────────────────────────────────────────

def dedouble(text):
    return re.sub(r'(.)\1+', r'\1', text)

def extract_materiaux(pdf_path, supabase=None):
    raw_questions = []

    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            words = page.extract_words()
            page_height = page.height

            # Bonnes réponses via surbrillance bleue
            blue_rects = [r for r in page.rects if r.get("non_stroking_color") == BLUE_HIGHLIGHT]
            highlighted_texts = []
            for rect in blue_rects:
                line_words = [w for w in words
                              if w['top'] >= rect['top'] - 3 and w['bottom'] <= rect['bottom'] + 3]
                if line_words:
                    highlighted_texts.append(' '.join(w['text'] for w in line_words))

            # Positions des séparateurs de questions pour délimiter les zones
            separators = [(m.start(), m.end()) for m in re.finditer(
                r'\uf059\s+Q{1,2}u{1,2}e{1,2}s{1,2}t{1,2}i{1,2}o{1,2}n{1,2}\s+\d+', text
            )]

            blocks = re.split(r'\uf059\s+Q{1,2}u{1,2}e{1,2}s{1,2}t{1,2}i{1,2}o{1,2}n{1,2}\s+\d+', text)
            type_matches = list(re.finditer(
                r'\uf059\s+Q{1,2}u{1,2}e{1,2}s{1,2}t{1,2}i{1,2}o{1,2}n{1,2}\s+\d+\s+(Q{1,2}u{1,2}e{1,2}[^\n]+)', text
            ))

            for i, block in enumerate(blocks[1:]):
                # Détecter le type
                q_type = "single"
                if i < len(type_matches):
                    type_text = dedouble(type_matches[i].group(1)).lower()
                    if "multiple" in type_text:
                        q_type = "multiple"
                    elif "numérique" in type_text or "valeur" in type_text:
                        q_type = "text"

                lines = [l.strip() for l in block.split('\n') if l.strip()]

                start = 0
                if lines and re.match(r'^Q{1,2}u{1,2}', lines[0]):
                    start = 1

                question_lines = []
                choices_raw = []
                in_choices = False

                for line in lines[start:]:
                    if re.match(r'^[A-E]\s*-\s*', line):
                        in_choices = True
                    if in_choices:
                        choices_raw.append(line)
                    else:
                        question_lines.append(line)

                question_text = dedouble(' '.join(question_lines).strip())

                # Questions numériques : extraire la liste et la bonne réponse
                if q_type == "text":
                    numbered_items = re.findall(r'(\d+)-\s*(.+)', block)
                    answer_match = re.search(r'\n\s*(\d+)\s*(?:\n|$)', block)
                    correct_num = answer_match.group(1) if answer_match else None

                    if numbered_items:
                        choices = []
                        choice_ids = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"]
                        for j, (num, item_text) in enumerate(numbered_items):
                            if j >= len(choice_ids):
                                break
                            choices.append({
                                "id": choice_ids[j],
                                "text": dedouble(f"{num}- {item_text.strip()}"),
                                "correct": num == correct_num
                            })
                        if question_text and choices:
                            raw_questions.append({
                                "type": "text",
                                "text": question_text,
                                "choices": choices,
                                "correct_answer": correct_num,
                                "image_url": None
                            })
                        continue

                # Questions normales A/B/C/D/E
                choices = []
                choice_ids = ["a", "b", "c", "d", "e"]
                for line in choices_raw:
                    m = re.match(r'^([A-E])\s*-\s*(.+)$', line)
                    if m:
                        letter = m.group(1)
                        choice_text = m.group(2).strip()
                        idx = ord(letter) - ord('A')
                        is_correct = any(
                            letter in hl[:3] and choice_text[:10] in hl
                            for hl in highlighted_texts
                        )
                        choices.append({
                            "id": choice_ids[idx],
                            "text": dedouble(choice_text),
                            "correct": is_correct
                        })

                if question_text and choices:
                    q_data = {
                        "type": q_type,
                        "text": question_text,
                        "choices": choices,
                        "image_url": None
                    }

                    # Chercher des images dans la zone de cette question
                    if supabase:
                        # Estimer la zone verticale de la question sur la page
                        # On utilise les mots pour trouver la position du texte de la question
                        q_words = [w for w in words if question_text[:20] in ' '.join(
                            ww['text'] for ww in words if abs(ww['top'] - w['top']) < 5
                        )]
                        if q_words:
                            q_top = min(w['top'] for w in q_words) - 10
                            q_bottom = q_top + 500  # Zone de 500px après la question
                            imgs = find_question_images(pdf_path, page_num, q_top, q_bottom)
                            if imgs:
                                print(f"  🖼️  Image trouvée pour une question, upload...")
                                # Prendre l'image la plus significative (la plus grande)
                                best_img = max(imgs, key=lambda x: x['width'] * x['height'])
                                url = extract_and_upload_image(pdf_path, page_num, best_img, supabase)
                                if url:
                                    q_data["image_url"] = url
                                    print(f"  ✅ Image uploadée")

                    raw_questions.append(q_data)

    return raw_questions

# ─────────────────────────────────────────────
# NETTOYAGE VIA OLLAMA (textes uniquement)
# ─────────────────────────────────────────────

def clean_with_ollama(raw_questions, exam_title):
    print(f"\n🤖 Envoi à Llama 3.2 pour nettoyage des textes ({len(raw_questions)} questions)...")

    if not raw_questions:
        return raw_questions

    texts_only = []
    for q in raw_questions:
        texts_only.append({
            "question_text": q["text"],
            "choices_texts": [c["text"] for c in q.get("choices", [])]
        })

    prompt = f"""Tu es un assistant qui corrige uniquement les fautes d'extraction PDF.

Voici des textes extraits de l'examen "{exam_title}". Certains peuvent avoir des caractères bizarres, des apostrophes manquantes, des coupures de ligne ou des espaces en trop.

{json.dumps(texts_only, ensure_ascii=False, indent=2)}

Ta tâche UNIQUEMENT :
1. Corriger les caractères mal extraits (ex: "dune" → "d'une", "lOBS" → "l'OBS")
2. Supprimer les espaces ou sauts de ligne inutiles
3. NE PAS changer le sens, NE PAS reformuler, NE PAS ajouter de contenu
4. Retourner exactement le même nombre d'éléments dans le même ordre

Réponds UNIQUEMENT avec le JSON corrigé dans ce format exact, sans texte avant ou après, sans balises markdown:
[{{"question_text": "...", "choices_texts": ["...", "..."]}}]"""

    response = ollama.chat(
        model="llama3.2",
        messages=[{"role": "user", "content": prompt}]
    )

    content = response['message']['content'].strip()
    content = re.sub(r'^```json\s*', '', content)
    content = re.sub(r'\s*```$', '', content)

    try:
        cleaned_texts = json.loads(content)

        if len(cleaned_texts) != len(raw_questions):
            print("⚠️  Ollama a changé le nombre de questions, on garde l'extraction brute")
            return raw_questions

        result = []
        for i, q in enumerate(raw_questions):
            clean_q = {
                "type": q["type"],
                "text": cleaned_texts[i]["question_text"],
                "choices": [],
                "image_url": q.get("image_url")
            }
            if q.get("correct_answer"):
                clean_q["correct_answer"] = q["correct_answer"]
            for j, choice in enumerate(q.get("choices", [])):
                clean_q["choices"].append({
                    "id": choice["id"],
                    "correct": choice["correct"],  # JAMAIS TOUCHÉ
                    "text": cleaned_texts[i]["choices_texts"][j] if j < len(cleaned_texts[i]["choices_texts"]) else choice["text"]
                })
            result.append(clean_q)

        print(f"✅ Textes nettoyés, bonnes réponses préservées à 100%")
        return result

    except (json.JSONDecodeError, KeyError, IndexError):
        print("⚠️  Ollama a retourné un résultat invalide, on garde l'extraction brute")
        return raw_questions

# ─────────────────────────────────────────────
# CONSTRUCTION DU JSON FINAL
# ─────────────────────────────────────────────

def build_json(questions, title, description="", duration=20):
    result = {
        "title": title,
        "description": description,
        "duration": duration,
        "questions": []
    }

    for i, q in enumerate(questions):
        question = {
            "id": i + 1,
            "type": q.get("type", "multiple"),
            "text": q["text"],
            "choices": q.get("choices", []),
            "image_url": q.get("image_url")
        }
        if q.get("correct_answer"):
            question["correct_answer"] = q["correct_answer"]
        result["questions"].append(question)

    return result

# ─────────────────────────────────────────────
# UPLOAD SUPABASE
# ─────────────────────────────────────────────

def upload_to_supabase(exam_json, supabase):
    print("\n📤 Upload vers Supabase...")

    data = {
        "title": exam_json["title"],
        "description": exam_json["description"],
        "duration": exam_json["duration"],
        "questions": exam_json["questions"],
        "is_active": True
    }

    result = supabase.table("exams").insert(data).execute()
    print(f"✅ Examen uploadé avec succès ! ID: {result.data[0]['id']}")
    return result.data[0]['id']

# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print("Usage: python extract.py <chemin_pdf> [titre] [description] [durée_minutes]")
        print("Exemple: python extract.py pdfs/wbs.pdf 'WBS CPI-A1' 'Examen WBS' 20")
        sys.exit(1)

    pdf_path = sys.argv[1]
    title = sys.argv[2] if len(sys.argv) > 2 else os.path.basename(pdf_path).replace('.pdf', '')
    description = sys.argv[3] if len(sys.argv) > 3 else ""
    duration = int(sys.argv[4]) if len(sys.argv) > 4 else 20

    if not os.path.exists(pdf_path):
        print(f"❌ Fichier non trouvé : {pdf_path}")
        sys.exit(1)

    print(f"\n📄 Traitement : {pdf_path}")

    # Initialiser Supabase (nécessaire pour upload images)
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # 1. Détecter le format
    fmt = detect_format(pdf_path)
    print(f"🔍 Format détecté : {fmt}")

    # 2. Extraire selon le format
    if fmt == "wbs":
        raw_questions = extract_wbs(pdf_path)
    elif fmt == "materiaux":
        raw_questions = extract_materiaux(pdf_path, supabase)
    else:
        print("❌ Format non reconnu")
        sys.exit(1)

    print(f"📝 {len(raw_questions)} questions extraites")

    # 3. Nettoyage avec Ollama
    cleaned_questions = clean_with_ollama(raw_questions, title)

    # 4. Construire le JSON final
    exam_json = build_json(cleaned_questions, title, description, duration)

    # 5. Sauvegarder le JSON localement
    output_path = pdf_path.replace('.pdf', '_output.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(exam_json, f, ensure_ascii=False, indent=2)
    print(f"\n💾 JSON sauvegardé : {output_path}")

    # 6. Aperçu
    print(f"\n📋 Aperçu :")
    print(f"   Titre : {exam_json['title']}")
    print(f"   Questions : {len(exam_json['questions'])}")
    for q in exam_json['questions'][:3]:
        correct = [c['id'].upper() for c in q['choices'] if c['correct']]
        img = "🖼️" if q.get("image_url") else ""
        print(f"   Q{q['id']} {img}: {q['text'][:55]}... → {correct} ({q['type']})")

    # 7. Confirmation upload
    print(f"\n{'='*50}")
    response = input("✅ Voulez-vous uploader vers Supabase ? (o/n) : ")
    if response.lower() in ['o', 'oui', 'y', 'yes']:
        upload_to_supabase(exam_json, supabase)
    else:
        print("Upload annulé. Le JSON est sauvegardé localement.")

if __name__ == "__main__":
    main()