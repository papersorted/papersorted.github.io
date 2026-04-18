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

// Heavily trim out useless grammatical noise to keep the JSON payload microscopic
const stopWords = new Set([
  "the","and","for","that","this","with","from","your","what","how","why",
  "are","you","will","not","can","all","has","have","had","any","but","was",
  "were","which","who","their","there","these","those","been","much","many",
  "some","such","only","than","then","page","questions","marks","exam","university",
  "kathmandu","ku","faculty","student","course","program","answer"
]);

async function processPDF(filePath, subject, fileBasename, invertedIndex) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    // Render text with pdf-parse
    const data = await pdf(dataBuffer);
    
    // Clean text: Make lowercase, strip punctuation entirely, collapse whitespace
    const cleanText = data.text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ");
    
    // Tokenize
    const words = new Set(cleanText.split(" "));

    // The destination coordinate: /subject/COMP201/2019.pdf/
    // To save bytes, we just store `subject/fileBasename`
    const docId = `${subject}/${fileBasename}`;

    words.forEach(word => {
      if (word.length < 4 || stopWords.has(word) || !isNaN(word)) return;
      if (!invertedIndex[word]) invertedIndex[word] = [];
      // Prevent duplicates if by chance pdf-parse parsed same word
      if (!invertedIndex[word].includes(docId)) {
        invertedIndex[word].push(docId);
      }
      // If a word maps to over 100 papers, it's virtually a stop word, clamp it.
      if (invertedIndex[word].length > 60) {
        invertedIndex[word] = invertedIndex[word].slice(0, 60);
      }
    });

  } catch (error) {
    console.error(`⚠️ Failed parsing ${filePath}: ${error.message}`);
  }
}

async function main() {
  console.log(`🔍 Beginning Full-Text PDF Extraction Phase in: ${subjectsDir}`);
  console.log(`⏱️  WARNING: Parsing 2,000+ PDFs may take 15 minutes. Please wait...`);

  const invertedIndex = {};
  
  const subjects = fs.readdirSync(subjectsDir).filter((d) => {
    const full = path.join(subjectsDir, d);
    return fs.statSync(full).isDirectory() && /^[A-Z]{2,}[0-9]+$/.test(d);
  });

  let totalParsed = 0;

  for (const subject of subjects) {
    const subjectPath = path.join(subjectsDir, subject);
    const pdfs = fs.readdirSync(subjectPath).filter((f) => f.toLowerCase().endsWith(".pdf"));

    console.log(`-> Parsing ${subject} (${pdfs.length} papers)...`);
    
    for (const file of pdfs) {
      const fullPath = path.join(subjectPath, file);
      await processPDF(fullPath, subject, file, invertedIndex);
      totalParsed++;
    }
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
  console.log(`📄 Total PDFs Deep-scanned: ${totalParsed}`);
  console.log(`🧠 Total Unique Searchable Neural Terms Saved: ${Object.keys(invertedIndex).length}`);
  console.log(`The 'Cmd+K' Palette God Mode is officially active!`);
}

main();
