import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Support two locations:
//  1. public/papers (used in CI / when PDFs are copied into repo)
//  2. ../../Subjects_batch_all_auto (local dev with external folder)
const candidates = [
  path.resolve(__dirname, "../public/papers"),
  path.resolve(__dirname, "../../Subjects_batch_all_auto"),
];

const subjectsDir = candidates.find(
  (d) => fs.existsSync(d) && fs.statSync(d).isDirectory()
);

if (!subjectsDir) {
  console.error("❌ No PDF source directory found. Tried:");
  candidates.forEach((c) => console.error(`   ${c}`));
  process.exit(1);
}

console.log(`📂 Using: ${subjectsDir}`);

const outFile = path.resolve(__dirname, "../src/data/manifest.json");
const internalMetaFile = path.resolve(__dirname, "../src/data/internalPapers.json");
const internalPapersDir = path.resolve(__dirname, "../public/internal-papers");
const allowedInternalExams = new Set(["first-internal", "second-internal", "third-internal"]);
const allowedInternalAssetExtensions = new Set([".pdf", ".jpg", ".jpeg", ".png", ".webp"]);

function extractDate(filename, subjectCode) {
  let name = filename.replace(/\.pdf$/i, "");
  if (name.startsWith(subjectCode + "_")) {
    name = name.slice(subjectCode.length + 1);
  }
  const dateMatch = name.match(
    /^([A-Za-z]+(?:-[A-Za-z]+)?_\d{4})/
  );
  if (dateMatch) {
    return dateMatch[1].replace(/_/g, " ");
  }
  return name.replace(/_/g, " ");
}

function readInternalEntries() {
  if (!fs.existsSync(internalMetaFile)) return [];

  const raw = fs.readFileSync(internalMetaFile, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("internalPapers.json must export a JSON array.");
  }

  return parsed;
}

function getFileExtension(file) {
  return path.extname(file).toLowerCase();
}

function validateInternalEntries(entries, manifest) {
  const seenKeys = new Set();
  const semesterKeys = new Set(
    Object.entries(manifest).flatMap(([subjectCode, papers]) =>
      papers.map((paper) => `${subjectCode}::${paper.file}`)
    )
  );

  for (const [index, entry] of entries.entries()) {
    const prefix = `internalPapers.json entry #${index + 1}`;

    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`${prefix} must be an object.`);
    }

    const { subjectCode, exam, year, file, teacher, label } = entry;

    if (typeof subjectCode !== "string" || !/^[A-Z]{2,}[0-9]+$/.test(subjectCode)) {
      throw new Error(`${prefix} has an invalid subjectCode.`);
    }

    if (typeof exam !== "string" || !allowedInternalExams.has(exam)) {
      throw new Error(
        `${prefix} must use exam "first-internal", "second-internal", or "third-internal".`
      );
    }

    if (!Number.isInteger(year) || year < 1900 || year > 3000) {
      throw new Error(`${prefix} has an invalid year.`);
    }

    if (typeof file !== "string" || !allowedInternalAssetExtensions.has(getFileExtension(file))) {
      throw new Error(
        `${prefix} must point to a supported file (.pdf, .jpg, .jpeg, .png, .webp).`
      );
    }

    if (teacher !== undefined && teacher !== null && typeof teacher !== "string") {
      throw new Error(`${prefix} has a non-string teacher value.`);
    }

    if (label !== undefined && label !== null && typeof label !== "string") {
      throw new Error(`${prefix} has a non-string label value.`);
    }

    const key = `${subjectCode}::${file}`;
    if (seenKeys.has(key)) {
      throw new Error(`${prefix} duplicates the file key ${key}.`);
    }
    if (semesterKeys.has(key)) {
      throw new Error(`${prefix} conflicts with an existing semester paper named ${file}.`);
    }
    seenKeys.add(key);

    const assetPath = path.join(internalPapersDir, subjectCode, file);
    if (!fs.existsSync(assetPath)) {
      throw new Error(`${prefix} points to a missing internal file: ${assetPath}`);
    }
  }
}

function main() {
  const manifest = {};

  const subjects = fs
    .readdirSync(subjectsDir)
    .filter((d) => {
      const full = path.join(subjectsDir, d);
      return fs.statSync(full).isDirectory() && /^[A-Z]{2,}[0-9]+$/.test(d);
    })
    .sort();

  for (const subject of subjects) {
    const subjectPath = path.join(subjectsDir, subject);
    const pdfs = fs
      .readdirSync(subjectPath)
      .filter((f) => f.toLowerCase().endsWith(".pdf"))
      .sort();

    if (pdfs.length === 0) continue;

    manifest[subject] = pdfs.map((file) => ({
      date: extractDate(file, subject),
      file,
    }));
  }

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(manifest, null, 2));

  const internalEntries = readInternalEntries();
  validateInternalEntries(internalEntries, manifest);

  console.log(
    `✅ Manifest generated: ${Object.keys(manifest).length} subjects, ${Object.values(manifest).reduce((s, a) => s + a.length, 0)} PDFs`
  );
  console.log(`🧾 Internal paper metadata validated: ${internalEntries.length} entries`);
}

main();
