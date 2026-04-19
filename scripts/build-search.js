import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pdf from "pdf-parse";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const candidates = [
  path.resolve(__dirname, "../public/papers"),
  path.resolve(__dirname, "../../Subjects_batch_all_auto"),
];

const subjectsDir = candidates.find(
  (d) => fs.existsSync(d) && fs.statSync(d).isDirectory()
);

if (!subjectsDir) {
  console.error("❌ No PDF source directory found.");
  process.exit(1);
}

const outFile = path.resolve(__dirname, "../public/search_index.json");
const internalMetaFile = path.resolve(__dirname, "../src/data/internalPapers.json");
const internalPapersDir = path.resolve(__dirname, "../public/internal-papers");
const internalExamLabels = {
  "first-internal": "First Internal",
  "second-internal": "Second Internal",
  "third-internal": "Third Internal",
};

// Heavily trim out useless grammatical noise to keep the JSON payload microscopic
const stopWords = new Set([
  "the","and","for","that","this","with","from","your","what","how","why",
  "are","you","will","not","can","all","has","have","had","any","but","was",
  "were","which","who","their","there","these","those","been","much","many",
  "some","such","only","than","then","page","questions","marks","exam","university",
  "kathmandu","ku","faculty","student","course","program","answer"
]);

function readInternalEntries() {
  if (!fs.existsSync(internalMetaFile)) return [];

  const raw = fs.readFileSync(internalMetaFile, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

function getFileExtension(file) {
  return path.extname(file).toLowerCase();
}

function getInternalAssetType(file) {
  return getFileExtension(file) === ".pdf" ? "pdf" : "image";
}

function buildInternalSearchText(entry) {
  const examLabel = internalExamLabels[entry.exam] || "Internal";
  const teacher = typeof entry.teacher === "string" ? entry.teacher.trim() : "";
  const label = typeof entry.label === "string" ? entry.label.trim() : "";
  const fileStem = typeof entry.file === "string"
    ? entry.file.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ")
    : "";
  const pieces = [
    typeof entry.subjectCode === "string" ? entry.subjectCode.trim() : "",
    examLabel,
    examLabel.replace(/ /g, "-"),
    label,
    teacher,
    fileStem,
    String(entry.year || ""),
  ];
  return pieces.filter(Boolean).join(" ");
}

function addTextToIndex(text, docId, invertedIndex) {
  const cleanText = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ");
  const words = new Set(cleanText.split(" "));

  words.forEach(word => {
    if (word.length < 4 || stopWords.has(word) || !isNaN(word)) return;
    if (!invertedIndex[word]) invertedIndex[word] = [];
    if (!invertedIndex[word].includes(docId)) {
      invertedIndex[word].push(docId);
    }
    if (invertedIndex[word].length > 60) {
      invertedIndex[word] = invertedIndex[word].slice(0, 60);
    }
  });
}

async function processPDF(filePath, subject, fileBasename, invertedIndex, extraText = "") {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    const docId = `${subject}/${fileBasename}`;
    addTextToIndex(`${data.text} ${extraText}`, docId, invertedIndex);
  } catch (error) {
    console.error(`⚠️ Failed parsing ${filePath}: ${error.message}`);
  }
}

async function main() {
  console.log(`🔍 Beginning full-text extraction phase in: ${subjectsDir}`);
  console.log(`⏱️  Parsing semester PDFs and internal metadata. This can take a while...`);

  const invertedIndex = {};
  
  const subjects = fs.readdirSync(subjectsDir).filter((d) => {
    const full = path.join(subjectsDir, d);
    return fs.statSync(full).isDirectory() && /^[A-Z]{2,}[0-9]+$/.test(d);
  });

  let totalIndexed = 0;
  let pdfParsedCount = 0;
  let imageMetadataCount = 0;

  for (const subject of subjects) {
    const subjectPath = path.join(subjectsDir, subject);
    const pdfs = fs.readdirSync(subjectPath).filter((f) => f.toLowerCase().endsWith(".pdf"));

    console.log(`-> Parsing ${subject} (${pdfs.length} papers)...`);
    
    for (const file of pdfs) {
      const fullPath = path.join(subjectPath, file);
      await processPDF(fullPath, subject, file, invertedIndex);
      totalIndexed++;
      pdfParsedCount++;
    }
  }

  const internalEntries = readInternalEntries();
  if (internalEntries.length > 0) {
    console.log(`-> Parsing internal papers (${internalEntries.length} files)...`);
  }

  for (const entry of internalEntries) {
    if (!entry || typeof entry !== "object") continue;
    const subject = typeof entry.subjectCode === "string" ? entry.subjectCode.trim() : "";
    const file = typeof entry.file === "string" ? entry.file : "";
    if (!subject || !file) continue;

    const fullPath = path.join(internalPapersDir, subject, file);
    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️ Missing internal file for search indexing: ${fullPath}`);
      continue;
    }

    const metadataText = buildInternalSearchText(entry);
    if (getInternalAssetType(file) === "pdf") {
      await processPDF(fullPath, subject, file, invertedIndex, metadataText);
      pdfParsedCount++;
    } else {
      addTextToIndex(metadataText, `${subject}/${file}`, invertedIndex);
      imageMetadataCount++;
    }

    totalIndexed++;
  }

  // To prevent the JSON from becoming larger than 2MB, we drop extremely rare words (single occurrences)
  // that are usually just OCR garbage noise or typos, maximizing searching speed.
  console.log('🧹 Compressing inverted index algorithmically...');
  Object.keys(invertedIndex).forEach(word => {
    if (invertedIndex[word].length < 2) delete invertedIndex[word];
  });

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(invertedIndex));
  
  console.log(`\n✅ HUGE SUCCESS! Built Deep Search Engine Index.`);
  console.log(`📄 Total documents indexed: ${totalIndexed}`);
  console.log(`📘 PDFs parsed with text extraction: ${pdfParsedCount}`);
  console.log(`🖼️ Image internals indexed from metadata: ${imageMetadataCount}`);
  console.log(`🧠 Total Unique Searchable Neural Terms Saved: ${Object.keys(invertedIndex).length}`);
  console.log(`The 'Cmd+K' Palette God Mode is officially active!`);
}

main();
