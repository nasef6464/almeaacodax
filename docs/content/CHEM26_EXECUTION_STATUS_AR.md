# CHEM26 — كيمياء تحصيلي 26

## المصدر المعتمد
- كتاب التأسيس: `كتاب تأسيس يلو للكيمياء 26.pdf` — مرجع الشرح وبصمة المفاهيم فقط.
- كتاب الأسئلة: `كتاب تجميعات يلو للكيمياء 26 - المعدل.pdf` — مصدر الأسئلة.
- النطاق: القسم الأول + القسم الثاني كاملين.

## Taxonomy المعتمدة V1
- 27 مهارة رئيسية.
- 99 مهارة فرعية.
- كل مهارة فرعية مصممة كوحدة فيديو تأسيس ≈ 10 دقائق ثم تدريب مباشر من الأسئلة المرتبطة بها.

## الجرد
- 32 درسًا في كتاب التجميعات.
- القسم الأول: 1,022 سؤالًا.
- القسم الثاني: 689 سؤالًا.
- التغطية المصدرية: 1,711 سؤالًا.
- Question -> SubSkill mapping: 1,711 / 1,711.
- جميع 99 SubSkills مستخدمة فعليًا في الربط.

## القص
- قاعدة القص: سؤال واحد / صورة واحدة / كود واحد.
- لا يظهر رقم السؤال أو السنة أو النجوم/شارة التجميع داخل الصورة.
- رقم السؤال والصفحة والقسم محفوظة في metadata.
- تم توليد 1,711 WebP lossless.
- unique image hashes = 1,711.
- تم تنفيذ vertical whitespace trim مع إبقاء عرض السؤال ثابتًا.
- QA بصري موزع على جميع الدروس الـ32: السؤال + الرسم/المعادلة + A/B/C/D ظاهرة في العينات.

## الإجابات
- 1,709 إجابة مأخوذة من جداول الإجابة الأصلية لنفس الصفحات.
- سؤالان فقط لم يطبع المصدر مفتاحهما:
  - PDF p12 / Q9 — D (البروتونات والنيوترونات) — expert_verified_source_key_missing.
  - PDF p129 / Q1 — B (الأنود/المصعد) — expert_verified_source_key_missing.
- الإجمالي: 1,711 / 1,711 correctOptionIndex.

## ربط التأسيس والذكاء الاصطناعي
- 33 Topic تأسيس مرتبطة بالـMainSkills.
- كل سؤال يحمل foundationRefs + MainSkill/SubSkill + topicHeading + source page/question.
- AI Context جاهز 1,711 / 1,711.
- Video Briefs جاهزة 99 / 99.
- الشرح الفردي النهائي لكل سؤال لم يعتمد بعد؛ حالته READY_FOR_AI_GENERATION ولا يتم اختلاق شرح غير موثق.

## Dedupe
- تغطية المصدر = 1,711.
- canonical new records = 1,710.
- alias = 1.
- التكرار الحقيقي:
  - `TAH-CHEM-COL26-P117-Q034` -> alias إلى `TAH-CHEM-COL26-P117-Q033`.
- زوج آخر له نفس صياغة السؤال لكن رسمان كيميائيان مختلفان، لذلك بقي كسؤالين مستقلين.

## الحالة
- CHEM-0 Source/Taxonomy: CLOSED.
- CHEM-1 Inventory: CLOSED.
- CHEM-2 Question-to-Skill: CLOSED.
- CHEM-3 Full crops: CLOSED locally.
- CHEM-4 Answer mapping: CLOSED.
- CHEM-5 AI context + foundation links: CLOSED.
- CHEM-6 Dedupe: CLOSED.
- المتبقي قبل Production: final crop-wide automated QA + individual explanation generation/review + Draft canary/import + Live E2E.
