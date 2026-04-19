# Internal Papers

Use `public/internal-papers/<SUBJECT_CODE>/` for internal paper files.

Add metadata in `src/data/internalPapers.json` with this shape:

```json
[
  {
    "subjectCode": "COMP101",
    "exam": "first-internal",
    "year": 2026,
    "file": "COMP101_First_Internal_2026.pdf",
    "teacher": "Dr. Example"
  },
  {
    "subjectCode": "COMP101",
    "exam": "second-internal",
    "year": 2026,
    "file": "COMP101_Second_Internal_2026.jpeg",
    "teacher": "Dr. Example"
  }
]
```

Rules:

- `exam` must be `first-internal` or `second-internal`
- `file` can be `.pdf`, `.jpg`, `.jpeg`, `.png`, or `.webp`
- `file` must match a real file inside `public/internal-papers/<SUBJECT_CODE>/`
- filenames must be unique within a subject
- do not reuse a semester-paper filename for an internal paper
- `teacher` is optional
- `label` is optional if you want to override the default title
- image-based internals render directly in the normal viewer route
- deep search indexes image internals from metadata only; no OCR is applied

The build validates this file automatically during `npm run dev` and `npm run build`.
