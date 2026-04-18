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
  console.log(
    `✅ Manifest generated: ${Object.keys(manifest).length} subjects, ${Object.values(manifest).reduce((s, a) => s + a.length, 0)} PDFs`
  );
}

main();
