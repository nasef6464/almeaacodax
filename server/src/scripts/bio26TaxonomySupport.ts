import fs from "node:fs";
import path from "node:path";

export type SubSkill = {
  sourceSubSkillId: string;
  id: string;
  code: string;
  name: string;
  order: number;
  targetFoundationVideoMinutes: number;
  sourceQuestionOccurrences: number;
};

export type MainSkill = {
  sourceMainSkillId: string;
  id: string;
  name: string;
  order: number;
  sectionId: string;
  sourceQuestionOccurrences: number;
  subSkills: SubSkill[];
};

export type TaxonomyFile = {
  project: string;
  status: string;
  pathId: string;
  subjectId: string;
  subjectName: string;
  protectedLegacySubjectId: string;
  mainSkillCount: number;
  subSkillCount: number;
  sourceQuestionOccurrences: number;
  canonicalQuestionCount: number;
  items: MainSkill[];
};

export const locateTaxonomy = () => {
  const candidates = [
    path.resolve(process.cwd(), "../ops/bio26/BIO26_TAXONOMY_PRODUCTION.json"),
    path.resolve(process.cwd(), "ops/bio26/BIO26_TAXONOMY_PRODUCTION.json"),
    path.resolve(process.cwd(), "../../ops/bio26/BIO26_TAXONOMY_PRODUCTION.json"),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error(`BIO26 production taxonomy not found. Checked: ${candidates.join(", ")}`);
  return found;
};

export const unique = (values: string[]) => new Set(values).size === values.length;
