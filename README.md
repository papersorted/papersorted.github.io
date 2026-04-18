# KU Exam Archives

A web archive for Kathmandu University exam papers. 

## Overview
This is a static site built to help Kathmandu University students easily find past exam papers. It maps a collection of PDF files to specific engineering and science programs, allowing students to filter subjects based on their enrolled program and current semester.

## Features
- **Search**: Search for specific subjects by their course code or name.
- **Program Filter**: Select your specific program (e.g., Computer Science, Civil Engineering) to see only relevant subjects. 
- **Semester Filter**: Narrow down the subject list by specific semesters.
- **File System Based**: The site automatically generates its catalog based on the PDFs placed in the `public/papers/` directory during the build process. No separate database is required.

## Local Development
1. Ensure Node.js is installed on your computer.
2. Install the necessary dependencies: `npm install` 
3. Start the development server: `npm run dev`

### Adding New Papers
To add new papers to the archive, simply put the PDF files into the `public/papers/` directory. Name the file using the exact subject code (e.g., `COMP116.pdf`). The application will automatically detect and list them the next time it builds.
