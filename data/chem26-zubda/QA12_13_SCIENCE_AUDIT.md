# CHEM26 Zubda — Editorial science and provenance audit: modules 12–13

Date: 2026-10-09. Branch: `codex/chem26-zubda-batch01`. PR: #477.

## Delivered in this batch

- `v1/polarity-12.json`: 1 main skill, 3 subskills (12.1–12.3), 4 concept maps, 3 worked examples, 9 original explained review questions.
- `v1/states-matter-13.json`: 1 main skill, 4 subskills (13.1–13.4), 5 concept maps, 4 worked examples, 12 original explained review questions.
- Combined addition: 2 main skills, 7 subskills, 9 maps, 7 worked examples, 21 original questions.
- Repository read-back structural verification: **PASS** on all 13 editorial JSON modules, 13 main skills, 50 subskills, 63 maps, 150 distinct questions, with canonical frozen taxonomy ID/title/order alignment and valid map edges, options, answer indices and metadata. This is an editorial data check, not a substitute for GitHub Actions or independent specialist certification.

## Focused scientific review and teaching traps

**12.1 Bond vs molecular polarity.** CO₂ contains polar C=O bonds but its linear geometry cancels bond dipoles; H₂O has a bent shape and a net dipole. “Like dissolves like” is a heuristic, not a universal solubility law; hydration of NaCl includes ion–dipole interactions and an energy/entropy balance.

**12.2 Dispersion and dipoles.** London dispersion exists in all atoms and molecules, including polar HCl and nonpolar argon. HCl also has permanent dipole–dipole forces. Comparing Cl₂ and Br₂ or methane and propane illustrates polarizability, but boiling point comparisons should not be made solely by naming a force without controlling for molecular size and structure.

**12.3 Hydrogen bonding.** A typical donor has H covalently bonded to N/O/F and an acceptor has a suitable lone pair; methanol and ethanol can both donate and accept. Dimethyl ether accepts hydrogen bonds from water but cannot donate to identical ether molecules. Intermolecular hydrogen bonds must not be confused with intramolecular covalent O−H bonds.

**13.1 Gas motion.** At the same absolute temperature, ideal gases have equal average translational kinetic energy, not equal molecular speed. Graham's law is applied to effusion at matched conditions: for H₂ (M=2) and O₂ (M=32), r(H₂)/r(O₂)=√(32/2)=4; for M_A=4 M_B, r_A/r_B=1/2. Distinguish diffusion from effusion.

**13.2 Gas pressure.** Dalton: P_total=ΣP_i for ideal-gas mixtures. For gas collected over water, P_dry=P_total−P_water_vapor at the collection temperature. Example: 101−30−25=46 kPa; separate practice 100−3=97 kPa. Manometer sign depends on relative liquid-column heights; do not guess without diagram.

**13.3 Liquids.** Cohesion is within the liquid, adhesion is to another surface. Viscosity resists flow, whereas surface tension is an interfacial energy/force concept. Clean glass produces a concave water meniscus but a convex mercury meniscus under ordinary conditions; this is a comparison of cohesion versus adhesion.

**13.4 Solids and phase changes.** Crystalline order differs from amorphous solids. Fusion/vaporization/sublimation are endothermic; freezing/condensation/deposition are exothermic. Pure-substance phase-change temperature remains constant on a heating-curve plateau at constant pressure during equilibrium. Triple point is coexistence of three phases; critical point terminates the liquid–vapor coexistence curve. Water's solid–liquid boundary is unusual.

## Reference and intellectual-property boundaries

- The canonical taxonomy has `foundationPages=33` for module 12 and `foundationPages=35|37|38` for module 13. These are **INDEX-LEVEL PAGE HINTS ONLY**; the assignment of page 35 to 13.1–13.2, 37 to 13.3 and 37–38 to 13.4 is **editorial provisional mapping**, not verified by a direct page comparison.
- The linked Drive folder `16MxCawzmvMOCzPz4ZsqJD1bLyH96WSjT` was accessible, but its direct listing returned no files. **No claim is made that the Yellow Chemistry 2026 PDF was read in this run.**
- All concept-map relationships, Arabic explanations, worked examples and multiple-choice questions are original. No book pages, illustrations, or long passages were reproduced.
- `editorialExtensions` explicitly marks interpretive additions and advanced caveats beyond the indexed topic names.

## Release gates and next action

- Verify the dedicated `CHEM26 Zubda Editorial Integrity` GitHub Actions workflow on the **final** SHA after the checkpoint documentation commit. Record exact pass/pending/fail rather than extrapolating from older SHA.
- Obtain independent chemistry subject review, direct visual comparison of the cited source pages, and RTL display checks for formula subscripts, radicals, arrows, Greek symbols, Arabic punctuation and units.
- No merge, production import, pricing changes, or changes to the frozen 1708 canonical questions, 139 drills or 35 tests.
- Next batch: main skill 14 (thermochemistry, 3 subskills) followed by 15 (reaction kinetics, 3 subskills), unless current HEAD shows newer completed modules.
