import mongoose from "mongoose";
import { connectToDatabase } from "../config/db.js";
import { SkillModel } from "../models/Skill.js";
import { SkillProgressModel } from "../models/SkillProgress.js";

const APPLY = process.argv.includes("--apply");
const PLACEHOLDERS = new Set(["", "مهارة غير مسماة", "مهارة غير معروفة"]);

type Canonical = {
  skillId: string;
  skill: string;
  level: "main" | "sub";
  parentSkillId: string;
  parentSkill: string;
  pathId: string;
  subjectId: string;
  sectionId: string;
};

const canonicalMap = async () => {
  const skills = await SkillModel.find({})
    .select("id _id name pathId subjectId sectionId subSkills")
    .lean();

  const map = new Map<string, Canonical>();
  for (const raw of skills as any[]) {
    const mainId = String(raw.id || raw._id || "").trim();
    if (!mainId) continue;
    map.set(mainId, {
      skillId: mainId,
      skill: String(raw.name || "").trim(),
      level: "main",
      parentSkillId: "",
      parentSkill: "",
      pathId: String(raw.pathId || "").trim(),
      subjectId: String(raw.subjectId || "").trim(),
      sectionId: String(raw.sectionId || "").trim(),
    });

    for (const sub of Array.isArray(raw.subSkills) ? raw.subSkills : []) {
      const subId = String(sub?.id || "").trim();
      if (!subId) continue;
      map.set(subId, {
        skillId: subId,
        skill: String(sub?.name || "").trim(),
        level: "sub",
        parentSkillId: mainId,
        parentSkill: String(raw.name || "").trim(),
        pathId: String(raw.pathId || "").trim(),
        subjectId: String(raw.subjectId || "").trim(),
        sectionId: String(raw.sectionId || "").trim(),
      });
    }
  }
  return map;
};

const differs = (row: any, canonical: Canonical) =>
  String(row.skill || "").trim() !== canonical.skill ||
  String(row.level || "").trim() !== canonical.level ||
  String(row.parentSkillId || "").trim() !== canonical.parentSkillId ||
  String(row.parentSkill || "").trim() !== canonical.parentSkill ||
  String(row.pathId || "").trim() !== canonical.pathId ||
  String(row.subjectId || "").trim() !== canonical.subjectId ||
  String(row.sectionId || "").trim() !== canonical.sectionId;

const main = async () => {
  await connectToDatabase();
  try {
    const [taxonomy, rows] = await Promise.all([
      canonicalMap(),
      SkillProgressModel.find({})
        .select("_id userId skillId skill level parentSkillId parentSkill pathId subjectId sectionId mastery evidenceCount attempts")
        .lean(),
    ]);

    const resolved: any[] = [];
    const unresolved: any[] = [];
    for (const row of rows as any[]) {
      const skillId = String(row.skillId || "").trim();
      const canonical = taxonomy.get(skillId);
      if (!canonical) {
        unresolved.push({
          id: String(row._id || ""),
          userId: String(row.userId || ""),
          skillId,
          currentSkill: String(row.skill || ""),
          mastery: Number(row.mastery || 0),
          evidenceCount: Number(row.evidenceCount || row.attempts || 0),
        });
        continue;
      }
      if (!differs(row, canonical)) continue;
      resolved.push({
        id: row._id,
        userId: String(row.userId || ""),
        skillId,
        from: {
          skill: String(row.skill || ""),
          level: String(row.level || ""),
          parentSkillId: String(row.parentSkillId || ""),
          parentSkill: String(row.parentSkill || ""),
          pathId: String(row.pathId || ""),
          subjectId: String(row.subjectId || ""),
          sectionId: String(row.sectionId || ""),
        },
        to: canonical,
        placeholder: PLACEHOLDERS.has(String(row.skill || "").trim()),
        mastery: Number(row.mastery || 0),
        evidenceCount: Number(row.evidenceCount || row.attempts || 0),
      });
    }

    let modified = 0;
    if (APPLY && resolved.length > 0) {
      const result = await SkillProgressModel.bulkWrite(
        resolved.map((item) => ({
          updateOne: {
            filter: { _id: item.id, skillId: item.skillId },
            update: {
              $set: {
                skill: item.to.skill,
                level: item.to.level,
                parentSkillId: item.to.parentSkillId,
                parentSkill: item.to.parentSkill,
                pathId: item.to.pathId,
                subjectId: item.to.subjectId,
                sectionId: item.to.sectionId,
              },
            },
          },
        })),
        { ordered: false },
      );
      modified = Number(result.modifiedCount || 0);
    }

    const report = {
      generatedAt: new Date().toISOString(),
      mode: APPLY ? "apply" : "dry-run",
      safety: {
        masteryChanged: false,
        evidenceChanged: false,
        attemptsChanged: false,
        unresolvedRowsChanged: false,
      },
      totals: {
        skillProgress: rows.length,
        taxonomyResolvable: rows.length - unresolved.length,
        metadataMismatches: resolved.length,
        placeholderMismatches: resolved.filter((item) => item.placeholder).length,
        unresolvedLegacy: unresolved.length,
        modified,
      },
      resolvableChanges: resolved.slice(0, 100).map(({ id: _id, ...item }) => item),
      unresolvedLegacy: unresolved.slice(0, 100),
    };

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
