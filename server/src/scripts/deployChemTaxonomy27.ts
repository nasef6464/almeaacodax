import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import { env } from "../config/env.js";

const EXPECTED_PATH_ID = "p_1777779653351";
const EXPECTED_SUBJECT_ID = "sub_1784980728386";
const EXPECTED_MAIN = 27;
const EXPECTED_SUB = 99;

type SubSkill = {
  id: string; code: string; name: string; description: string; order: number;
  videoTitle: string; videoGoal10Min: string;
  foundationLessons: string; foundationPages: string; foundationTitles: string;
};
type MainSkill = {
  id: string; name: string; order: number; sectionId: string;
  foundationLessons: string; foundationPages: string; foundationTitles: string;
  subSkills: SubSkill[];
};
type TaxonomyFile = {
  project: string; status: string; pathId: string; subjectId: string;
  mainSkillCount: number; subSkillCount: number; items: MainSkill[];
};

const locateTaxonomy = () => {
  const candidates = [
    path.resolve(process.cwd(), "../ops/chem26/CHEM26_TAXONOMY_FINAL.json"),
    path.resolve(process.cwd(), "ops/chem26/CHEM26_TAXONOMY_FINAL.json"),
    path.resolve(process.cwd(), "../../ops/chem26/CHEM26_TAXONOMY_FINAL.json"),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error(`CHEM26 taxonomy file not found. Checked: ${candidates.join(", ")}`);
  return found;
};

const unique = (values: string[]) => new Set(values).size === values.length;

const validateTaxonomy = (taxonomy: TaxonomyFile) => {
  if (taxonomy.project !== "CHEM26" || taxonomy.status !== "FROZEN") {
    throw new Error("CHEM26 taxonomy must be project=CHEM26 and status=FROZEN");
  }
  if (taxonomy.pathId !== EXPECTED_PATH_ID || taxonomy.subjectId !== EXPECTED_SUBJECT_ID) {
    throw new Error("CHEM26 taxonomy scope does not match the verified production chemistry scope");
  }
  if (!Array.isArray(taxonomy.items) || taxonomy.items.length !== EXPECTED_MAIN) {
    throw new Error(`CHEM26 must contain exactly ${EXPECTED_MAIN} main skills`);
  }
  const subCount = taxonomy.items.reduce((sum, item) => sum + item.subSkills.length, 0);
  if (subCount !== EXPECTED_SUB) throw new Error(`CHEM26 must contain exactly ${EXPECTED_SUB} subskills`);
  if (taxonomy.mainSkillCount !== EXPECTED_MAIN || taxonomy.subSkillCount !== EXPECTED_SUB) {
    throw new Error("CHEM26 taxonomy declared counts do not match frozen counts");
  }
  const mainIds = taxonomy.items.map((item) => item.id);
  const sectionIds = taxonomy.items.map((item) => item.sectionId);
  const subIds = taxonomy.items.flatMap((item) => item.subSkills.map((sub) => sub.id));
  if (!unique(mainIds) || !unique(sectionIds) || !unique(subIds)) {
    throw new Error("CHEM26 taxonomy contains duplicate main, section, or subskill IDs");
  }
  taxonomy.items.forEach((item, index) => {
    if (item.order !== index + 1) throw new Error(`Unexpected main skill order for ${item.id}`);
    if (!item.id.startsWith("skill_tah_chem_")) throw new Error(`Invalid main skill id ${item.id}`);
    if (!item.sectionId.startsWith("sec_sub_chemistry_")) throw new Error(`Invalid section id ${item.sectionId}`);
    item.subSkills.forEach((sub, subIndex) => {
      if (sub.order !== subIndex + 1) throw new Error(`Unexpected subskill order for ${sub.id}`);
      if (!sub.id.startsWith("sub_tah_chem_")) throw new Error(`Invalid subskill id ${sub.id}`);
      if (!sub.name.trim() || !sub.videoTitle.trim() || !sub.videoGoal10Min.trim()) {
        throw new Error(`Incomplete learning-unit metadata for ${sub.id}`);
      }
    });
  });
};

export async function deployChem26Taxonomy(options: { apply?: boolean } = {}) {
  const apply = options.apply === true;
  const taxonomyPath = locateTaxonomy();
  const taxonomy = JSON.parse(fs.readFileSync(taxonomyPath, "utf8")) as TaxonomyFile;
  validateTaxonomy(taxonomy);

  await mongoose.connect(env.MONGODB_URI);
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB connection has no database handle");

  try {
    const subjects = db.collection("subjects");
    const sections = db.collection("sections");
    const skills = db.collection("skills");
    const topics = db.collection("topics");
    const questions = db.collection("questions");

    const subject = await subjects.findOne({ _id: EXPECTED_SUBJECT_ID as any });
    if (!subject) throw new Error("Verified CHEM26 subject does not exist");
    if (String(subject.pathId || "") !== EXPECTED_PATH_ID || !String(subject.name || "").includes("كيمياء")) {
      throw new Error("Refusing CHEM26 taxonomy mutation: subject/path identity mismatch");
    }

    const [questionCount, existingSections, existingSkills, existingTopics] = await Promise.all([
      questions.countDocuments({ $or: [{ subject: EXPECTED_SUBJECT_ID }, { subjectId: EXPECTED_SUBJECT_ID }] }),
      sections.find({ subjectId: EXPECTED_SUBJECT_ID }).toArray(),
      skills.find({ subjectId: EXPECTED_SUBJECT_ID }).toArray(),
      topics.find({ subjectId: EXPECTED_SUBJECT_ID }).toArray(),
    ]);
    const currentSubCount = existingSkills.reduce(
      (sum: number, item: any) => sum + (Array.isArray(item.subSkills) ? item.subSkills.length : 0), 0,
    );

    console.log(JSON.stringify({
      project: "CHEM26",
      mode: apply ? "APPLY" : "DRY_RUN",
      taxonomyPath,
      scope: { pathId: EXPECTED_PATH_ID, subjectId: EXPECTED_SUBJECT_ID, subjectName: subject.name },
      current: { questions: questionCount, sections: existingSections.length, mainSkills: existingSkills.length, subSkills: currentSubCount, topics: existingTopics.length },
      target: { sections: EXPECTED_MAIN, mainSkills: EXPECTED_MAIN, subSkills: EXPECTED_SUB, topics: EXPECTED_MAIN + EXPECTED_SUB },
    }, null, 2));

    const expectedMainIds = new Set(taxonomy.items.map((item) => item.id));
    const existingMainIds = new Set(existingSkills.map((item: any) => String(item.id || item._id || "")));
    const currentParentTopics = existingTopics.filter((item: any) => !item.parentId).length;
    const currentChildTopics = existingTopics.filter((item: any) => Boolean(item.parentId)).length;
    const alreadyApplied =
      existingSections.length === EXPECTED_MAIN &&
      existingSkills.length === EXPECTED_MAIN &&
      currentSubCount === EXPECTED_SUB &&
      existingTopics.length === EXPECTED_MAIN + EXPECTED_SUB &&
      currentParentTopics === EXPECTED_MAIN &&
      currentChildTopics === EXPECTED_SUB &&
      [...expectedMainIds].every((id) => existingMainIds.has(id));

    if (!apply) {
      console.log(alreadyApplied ? "CHEM26_TAXONOMY_DRY_RUN_ALREADY_APPLIED" : "CHEM26_TAXONOMY_DRY_RUN_PASS");
      return;
    }
    if (alreadyApplied) {
      console.log("CHEM26_TAXONOMY_APPLY_ALREADY_COMPLETE");
      return;
    }
    if (questionCount !== 0) {
      throw new Error(`CHEM26 taxonomy apply requires zero chemistry questions before first import; found ${questionCount}`);
    }

    const timestamp = new Date();
    const snapshotId = `chem26-taxonomy-${timestamp.toISOString()}`;
    await db.collection("content_snapshots").insertOne({
      _id: snapshotId as any, kind: "CHEM26_TAXONOMY_PRE_APPLY",
      pathId: EXPECTED_PATH_ID, subjectId: EXPECTED_SUBJECT_ID, createdAt: timestamp,
      sections: existingSections, skills: existingSkills, topics: existingTopics,
    });

    await Promise.all([
      sections.deleteMany({ subjectId: EXPECTED_SUBJECT_ID }),
      skills.deleteMany({ subjectId: EXPECTED_SUBJECT_ID }),
      topics.deleteMany({ subjectId: EXPECTED_SUBJECT_ID }),
    ]);

    const sectionDocs = taxonomy.items.map((item) => ({
      _id: item.sectionId, id: item.sectionId, subjectId: EXPECTED_SUBJECT_ID,
      name: item.name, order: item.order, createdAt: timestamp, updatedAt: timestamp,
    }));
    const skillDocs = taxonomy.items.map((item) => ({
      _id: item.id, id: item.id, pathId: EXPECTED_PATH_ID, subjectId: EXPECTED_SUBJECT_ID,
      sectionId: item.sectionId, name: item.name,
      description: `CHEM26 frozen main skill. Foundation: ${item.foundationTitles}`,
      order: item.order, lessonIds: [], questionIds: [],
      subSkills: item.subSkills.map((sub) => ({
        id: sub.id, name: sub.name, code: sub.code, description: sub.description, order: sub.order,
      })),
      createdAt: timestamp, updatedAt: timestamp,
    }));

    const topicDocs: any[] = [];
    for (const item of taxonomy.items) {
      const mainTopicId = `top_tah_chem_main_${String(item.order).padStart(2, "0")}`;
      topicDocs.push({
        _id: mainTopicId, id: mainTopicId, title: item.name, pathId: EXPECTED_PATH_ID,
        subjectId: EXPECTED_SUBJECT_ID, sectionId: item.sectionId,
        skillId: item.id, skillIds: [item.id], parentId: null, order: item.order,
        showOnPlatform: true, isLocked: false, lessonIds: [], quizIds: [], libraryItemIds: [],
        sourceMeta: { project: "CHEM26", foundationLessons: item.foundationLessons, foundationPages: item.foundationPages, foundationTitles: item.foundationTitles },
        createdAt: timestamp, updatedAt: timestamp,
      });
      for (const sub of item.subSkills) {
        const subTopicId = `top_tah_chem_sub_${sub.id.replace("sub_tah_chem_", "")}`;
        topicDocs.push({
          _id: subTopicId, id: subTopicId, title: sub.name, pathId: EXPECTED_PATH_ID,
          subjectId: EXPECTED_SUBJECT_ID, sectionId: item.sectionId,
          skillId: sub.id, skillIds: [item.id, sub.id], parentId: mainTopicId, order: sub.order,
          showOnPlatform: true, isLocked: false, lessonIds: [], quizIds: [], libraryItemIds: [],
          sourceMeta: { project: "CHEM26", mainSkillId: item.id, subSkillId: sub.id, videoTitle: sub.videoTitle, videoGoal10Min: sub.videoGoal10Min, foundationLessons: sub.foundationLessons, foundationPages: sub.foundationPages, foundationTitles: sub.foundationTitles },
          createdAt: timestamp, updatedAt: timestamp,
        });
      }
    }

    await sections.insertMany(sectionDocs, { ordered: true });
    await skills.insertMany(skillDocs, { ordered: true });
    await topics.insertMany(topicDocs, { ordered: true });

    const [finalSections, finalSkills, finalTopics] = await Promise.all([
      sections.countDocuments({ subjectId: EXPECTED_SUBJECT_ID }),
      skills.find({ subjectId: EXPECTED_SUBJECT_ID }).toArray(),
      topics.find({ subjectId: EXPECTED_SUBJECT_ID }).toArray(),
    ]);
    const finalSubCount = finalSkills.reduce(
      (sum: number, item: any) => sum + (Array.isArray(item.subSkills) ? item.subSkills.length : 0), 0,
    );
    const parentTopics = finalTopics.filter((item: any) => !item.parentId).length;
    const childTopics = finalTopics.filter((item: any) => Boolean(item.parentId)).length;
    const badChildLinks = finalTopics.filter(
      (item: any) => item.parentId && (!item.skillId || !Array.isArray(item.skillIds) || item.skillIds.length !== 2),
    );
    if (finalSections !== EXPECTED_MAIN || finalSkills.length !== EXPECTED_MAIN || finalSubCount !== EXPECTED_SUB ||
        finalTopics.length !== EXPECTED_MAIN + EXPECTED_SUB || parentTopics !== EXPECTED_MAIN ||
        childTopics !== EXPECTED_SUB || badChildLinks.length !== 0) {
      throw new Error("CHEM26 taxonomy post-apply verification failed");
    }

    console.log(JSON.stringify({
      status: "PASS", snapshotId,
      final: { sections: finalSections, mainSkills: finalSkills.length, subSkills: finalSubCount, parentTopics, childTopics, topics: finalTopics.length, badChildLinks: badChildLinks.length },
    }, null, 2));
    console.log("CHEM26_TAXONOMY_APPLY_PASS");
  } finally {
    await mongoose.disconnect();
  }
}

const invokedDirectly = Boolean(process.argv[1]?.match(/deployChemTaxonomy27\.(?:ts|js)$/));

if (invokedDirectly) {
  deployChem26Taxonomy({ apply: process.argv.includes("--apply") }).catch((error) => {
    console.error("CHEM26_TAXONOMY_FAILED", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
