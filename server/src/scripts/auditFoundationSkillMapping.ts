import mongoose from "mongoose";
import { env } from "../config/env.js";

type EmbeddedSubSkill = {
  id?: string;
  name?: string;
};

type SkillDocument = {
  _id: string;
  id?: string;
  pathId?: string;
  subjectId?: string;
  sectionId?: string;
  name?: string;
  subSkills?: EmbeddedSubSkill[];
};

type TopicDocument = {
  _id: string;
  id?: string;
  pathId?: string;
  subjectId?: string;
  sectionId?: string | null;
  parentId?: string | null;
  title?: string;
  skillId?: string | null;
  lessonIds?: string[];
  quizIds?: string[];
};

type QuestionDocument = {
  _id: unknown;
  pathId?: string;
  subjectId?: string;
  subject?: string;
  skillIds?: string[];
};

const normalizeTitle = (value: unknown) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");

const stringId = (value: unknown) => String(value ?? "").trim();

const main = async () => {
  await mongoose.connect(env.MONGODB_URI);
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB connection has no database handle");

  try {
    const [allSkills, topics, quizzes, questions] = await Promise.all([
      db
        .collection<SkillDocument>("skills")
        .find({})
        .project({
          _id: 1,
          id: 1,
          pathId: 1,
          subjectId: 1,
          sectionId: 1,
          name: 1,
          subSkills: 1,
        })
        .toArray(),
      db
        .collection<TopicDocument>("topics")
        .find({ parentId: { $ne: null } })
        .project({
          _id: 1,
          id: 1,
          pathId: 1,
          subjectId: 1,
          sectionId: 1,
          parentId: 1,
          title: 1,
          skillId: 1,
          lessonIds: 1,
          quizIds: 1,
        })
        .toArray(),
      db
        .collection("quizzes")
        .find({})
        .project({ _id: 1, id: 1 })
        .toArray(),
      db
        .collection<QuestionDocument>("questions")
        .find({})
        .project({ _id: 1, pathId: 1, subjectId: 1, subject: 1, skillIds: 1 })
        .toArray(),
    ]);

    const skills = allSkills.filter((skill) => Array.isArray(skill.subSkills) && skill.subSkills.length > 0);

    const quizIdentifiers = new Set<string>();
    for (const quiz of quizzes) {
      quizIdentifiers.add(stringId(quiz._id));
      if (quiz.id) quizIdentifiers.add(stringId(quiz.id));
    }

    const skillIdentifiers = new Map<
      string,
      { pathId: string; subjectId: string; kind: "main" | "sub"; parentSkillId?: string }
    >();
    for (const skill of allSkills) {
      const mainId = stringId(skill.id || skill._id);
      const pathId = stringId(skill.pathId);
      const subjectId = stringId(skill.subjectId);
      if (mainId) {
        skillIdentifiers.set(mainId, { pathId, subjectId, kind: "main" });
      }
      for (const subSkill of skill.subSkills || []) {
        const subSkillId = stringId(subSkill.id);
        if (subSkillId) {
          skillIdentifiers.set(subSkillId, {
            pathId,
            subjectId,
            kind: "sub",
            parentSkillId: mainId,
          });
        }
      }
    }

    const topicIndex = new Map<string, TopicDocument[]>();
    for (const topic of topics) {
      const key = [
        stringId(topic.pathId),
        stringId(topic.subjectId),
        stringId(topic.sectionId),
        normalizeTitle(topic.title),
      ].join("|");
      const bucket = topicIndex.get(key) || [];
      bucket.push(topic);
      topicIndex.set(key, bucket);
    }

    const mappings: Array<{
      subSkillId: string;
      parentSkillId: string;
      pathId: string;
      subjectId: string;
      sectionId: string;
      topicId: string;
      topicObjectId: string;
      lessonCount: number;
      quizIds: string[];
    }> = [];
    const missing: Array<Record<string, string>> = [];
    const ambiguous: Array<Record<string, unknown>> = [];
    const conflicts: Array<Record<string, string>> = [];
    const missingQuizDocuments: Array<Record<string, string>> = [];

    for (const skill of skills) {
      const parentSkillId = stringId(skill.id || skill._id);
      const pathId = stringId(skill.pathId);
      const subjectId = stringId(skill.subjectId);
      const sectionId = stringId(skill.sectionId);

      for (const subSkill of skill.subSkills || []) {
        const subSkillId = stringId(subSkill.id);
        const subSkillName = normalizeTitle(subSkill.name);
        if (!subSkillId || !subSkillName) continue;

        const key = [pathId, subjectId, sectionId, subSkillName].join("|");
        const candidates = topicIndex.get(key) || [];

        if (candidates.length === 0) {
          missing.push({ subSkillId, parentSkillId, pathId, subjectId, sectionId, subSkillName });
          continue;
        }
        if (candidates.length > 1) {
          ambiguous.push({
            subSkillId,
            parentSkillId,
            pathId,
            subjectId,
            sectionId,
            subSkillName,
            topicIds: candidates.map((topic) => stringId(topic.id || topic._id)),
          });
          continue;
        }

        const topic = candidates[0];
        const topicId = stringId(topic.id || topic._id);
        const existingSkillId = stringId(topic.skillId);
        if (existingSkillId && existingSkillId !== subSkillId) {
          conflicts.push({ topicId, existingSkillId, expectedSkillId: subSkillId });
          continue;
        }

        const topicQuizIds = (topic.quizIds || []).map(stringId).filter(Boolean);
        for (const quizId of topicQuizIds) {
          if (!quizIdentifiers.has(quizId)) {
            missingQuizDocuments.push({ subSkillId, topicId, quizId });
          }
        }

        mappings.push({
          subSkillId,
          parentSkillId,
          pathId,
          subjectId,
          sectionId,
          topicId,
          topicObjectId: stringId(topic._id),
          lessonCount: (topic.lessonIds || []).length,
          quizIds: topicQuizIds,
        });
      }
    }

    let orphanQuestionSkillReferences = 0;
    let scopeMismatchQuestionSkillReferences = 0;
    let questionsWithoutSkillIds = 0;

    for (const question of questions) {
      const ids = Array.isArray(question.skillIds)
        ? question.skillIds.map(stringId).filter(Boolean)
        : [];
      if (ids.length === 0) {
        questionsWithoutSkillIds += 1;
        continue;
      }
      const effectiveSubjectId = stringId(question.subjectId || question.subject);
      const questionPathId = stringId(question.pathId);
      for (const id of ids) {
        const skill = skillIdentifiers.get(id);
        if (!skill) {
          orphanQuestionSkillReferences += 1;
          continue;
        }
        if (
          (skill.pathId && questionPathId && skill.pathId !== questionPathId) ||
          (skill.subjectId && effectiveSubjectId && skill.subjectId !== effectiveSubjectId)
        ) {
          scopeMismatchQuestionSkillReferences += 1;
        }
      }
    }

    const mappingsWithoutDrill = mappings.filter((item) => item.quizIds.length === 0).length;
    const mappingsWithLessons = mappings.filter((item) => item.lessonCount > 0).length;
    const expectedSubSkillCount = skills.reduce(
      (total, skill) => total + (skill.subSkills || []).filter((subSkill) => stringId(subSkill.id)).length,
      0,
    );

    const canApply =
      expectedSubSkillCount > 0 &&
      mappings.length === expectedSubSkillCount &&
      missing.length === 0 &&
      ambiguous.length === 0 &&
      conflicts.length === 0 &&
      missingQuizDocuments.length === 0 &&
      mappingsWithoutDrill === 0 &&
      orphanQuestionSkillReferences === 0 &&
      scopeMismatchQuestionSkillReferences === 0;

    const applyRequested = env.ALMEAA_APPLY_FOUNDATION_SKILL_MAPPING;
    let updatedTopics = 0;

    if (applyRequested) {
      if (!canApply) {
        throw new Error("Foundation skill mapping write refused because integrity preconditions did not pass");
      }

      const operations = mappings.map((mapping) => ({
        updateOne: {
          filter: {
            _id: mapping.topicObjectId,
            $or: [
              { skillId: { $exists: false } },
              { skillId: null },
              { skillId: "" },
              { skillId: mapping.subSkillId },
            ],
          },
          update: { $set: { skillId: mapping.subSkillId } },
        },
      }));

      if (operations.length > 0) {
        const result = await db.collection("topics").bulkWrite(operations, { ordered: false });
        updatedTopics = result.modifiedCount;
      }
    }

    const bySubject = new Map<
      string,
      { subSkills: number; mapped: number; withLessons: number; withDrills: number }
    >();
    for (const skill of skills) {
      const subjectId = stringId(skill.subjectId);
      const row = bySubject.get(subjectId) || {
        subSkills: 0,
        mapped: 0,
        withLessons: 0,
        withDrills: 0,
      };
      row.subSkills += (skill.subSkills || []).filter((subSkill) => stringId(subSkill.id)).length;
      bySubject.set(subjectId, row);
    }
    for (const mapping of mappings) {
      const row = bySubject.get(mapping.subjectId);
      if (!row) continue;
      row.mapped += 1;
      if (mapping.lessonCount > 0) row.withLessons += 1;
      if (mapping.quizIds.length > 0) row.withDrills += 1;
    }

    console.log(
      JSON.stringify(
        {
          mode: applyRequested ? "APPLY" : "DRY_RUN",
          canApply,
          modernSkillDocuments: skills.length,
          expectedSubSkillCount,
          mappedSubSkills: mappings.length,
          missingMappings: missing.length,
          ambiguousMappings: ambiguous.length,
          conflictingExistingMappings: conflicts.length,
          mappingsWithoutDrill,
          missingQuizDocuments: missingQuizDocuments.length,
          mappingsWithLessons,
          questions: questions.length,
          questionsWithoutSkillIds,
          orphanQuestionSkillReferences,
          scopeMismatchQuestionSkillReferences,
          updatedTopics,
          bySubject: Object.fromEntries(bySubject),
          details: {
            missing,
            ambiguous,
            conflicts,
            missingQuizDocuments,
          },
        },
        null,
        2,
      ),
    );

    if (!canApply) {
      process.exitCode = 1;
    }
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
