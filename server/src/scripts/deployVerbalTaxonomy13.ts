/**
 * @deprecated Legacy filename retained only for compatibility.
 * Verbal taxonomy V2 is the canonical source: 22 main skills / 76 stable subskills.
 */
export {
  VERBAL_PATH_ID,
  VERBAL_SUBJECT_ID,
  VERBAL_SUBSKILL_TO_MAIN,
  VERBAL_SUBSKILL_TO_SECTION,
  VERBAL_TAXONOMY,
  validateVerbalTaxonomyV2,
} from "./deployVerbalTaxonomy22.js";

import { deploy } from "./deployVerbalTaxonomy22.js";
export { deploy };

if (process.argv[1]?.endsWith("deployVerbalTaxonomy13.ts") || process.argv[1]?.endsWith("deployVerbalTaxonomy13.js")) {
  console.warn("deployVerbalTaxonomy13 is deprecated; running canonical 22-skill V2 deployment.");
  deploy().catch((error) => {
    console.error("Verbal taxonomy V2 deployment failed:", error);
    process.exit(1);
  });
}
