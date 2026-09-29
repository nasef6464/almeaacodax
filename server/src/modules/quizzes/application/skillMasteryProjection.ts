import mongoose from "mongoose";
import { SkillModel } from "../../../models/Skill.js";
import { summarizeRecentSkillEvidence } from "../analytics/skillAnalytics.js";

const uniqueStrings = (values: unknown[]) =>
  [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];

const buildSkillQuery = (skillIds: string[]) => {
  const ids = uniqueStrings(skillIds);
  const objectIds = ids
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  return {
    $or: [
      { id: { $in: ids } },
      { _id: { $in: ids } },
      { "subSkills.id": { $in: ids } },
      ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
    ],
  };
};

export type SkillTaxonomyProjection = {
  skillId: string;
  skill: string;
  level: "main" | "sub";
  parentSkillId: string;
  parentSkill: string;
  pathId: string;
  subjectId: string;
  sectionId: string;
};

export async function buildSkillTaxonomyProjection(skillIds: string[]) {
  const ids = uniqueStrings(skillIds);
  if (!ids.length) return new Map<string, SkillTaxonomyProjection>();

  const docs = await SkillModel.find(buildSkillQuery(ids)).lean();
  const requested = new Set(ids);
  const projection = new Map<string, SkillTaxonomyProjection>();

  for (const raw of docs as any[]) {
    const parentSkillId = String(raw.id || raw._id || "").trim();
    if (parentSkillId && requested.has(parentSkillId)) {
      projection.set(parentSkillId, {
        skillId: parentSkillId,
        skill: String(raw.name || "").trim(),
        level: "main",
        parentSkillId: "",
        parentSkill: "",
        pathId: String(raw.pathId || "").trim(),
        subjectId: String(raw.subjectId || "").trim(),
        sectionId: String(raw.sectionId || "").trim(),
      });
    }

    for (const subSkill of Array.isArray(raw.subSkills) ? raw.subSkills : []) {
      const subSkillId = String(subSkill?.id || "").trim();
      if (!subSkillId || !requested.has(subSkillId)) continue;
      projection.set(subSkillId, {
        skillId: subSkillId,
        skill: String(subSkill?.name || "").trim(),
        level: "sub",
        parentSkillId,
        parentSkill: String(raw.name || "").trim(),
        pathId: String(raw.pathId || "").trim(),
        subjectId: String(raw.subjectId || "").trim(),
        sectionId: String(raw.sectionId || "").trim(),
      });
    }
  }

  return projection;
}

export async function projectSkillProgressRows<T extends Record<string, any>>(rows: T[]) {
  const taxonomy = await buildSkillTaxonomyProjection(rows.map((row) => String(row.skillId || "")));

  return rows.flatMap((row) => {
    const skillId = String(row.skillId || "").trim();
    const canonical = taxonomy.get(skillId);
    if (!skillId || !canonical) {
      return [{
        ...row,
        unresolvedTaxonomy: true,
        recent: summarizeRecentSkillEvidence(
          Array.isArray(row.recentEvidence) ? row.recentEvidence : [],
        ),
      }];
    }

    return [{
      ...row,
      skillId,
      skill: canonical.skill,
      level: canonical.level,
      parentSkillId: canonical.parentSkillId,
      parentSkill: canonical.parentSkill,
      pathId: canonical.pathId || String(row.pathId || ""),
      subjectId: canonical.subjectId || String(row.subjectId || ""),
      sectionId: canonical.sectionId || String(row.sectionId || ""),
      unresolvedTaxonomy: false,
      recent: summarizeRecentSkillEvidence(
        Array.isArray(row.recentEvidence) ? row.recentEvidence : [],
      ),
    }];
  });
}
