import * as fs from 'fs-extra';
import * as path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export interface ParsedResume {
  fileName: string;
  filePath: string;
  content: string;
  fileType: 'pdf' | 'doc' | 'docx';
}

/**
 * Parse PDF file and extract text content
 */
async function parsePDF(filePath: string): Promise<string> {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    throw new Error(`Failed to parse PDF ${filePath}: ${error}`);
  }
}

/**
 * Parse PDF buffer and extract text content (for uploaded files)
 */
async function parsePDFBuffer(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    throw new Error(`Failed to parse PDF buffer: ${error}`);
  }
}

/**
 * Parse DOCX file and extract text content
 */
async function parseDOCX(filePath: string): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    throw new Error(`Failed to parse DOCX ${filePath}: ${error}`);
  }
}

/**
 * Parse DOCX buffer and extract text content (for uploaded files)
 */
async function parseDOCXBuffer(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    throw new Error(`Failed to parse DOCX buffer: ${error}`);
  }
}

/**
 * Parse DOC file (converted to text - basic implementation)
 * Note: DOC files require additional libraries like antiword or LibreOffice
 * For now, we'll attempt to read as text or skip
 */
async function parseDOC(filePath: string): Promise<string> {
  try {
    // DOC files are binary format, we'll need a library like antiword
    // For now, return a placeholder message
    // In production, you might want to use LibreOffice or antiword CLI
    throw new Error('DOC file parsing requires additional tools. Please convert to DOCX or PDF.');
  } catch (error) {
    throw new Error(`Failed to parse DOC ${filePath}: ${error}`);
  }
}

/**
 * Check if file is a supported resume format
 */
function isResumeFile(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  return ['.pdf', '.doc', '.docx'].includes(ext);
}

/**
 * Parse a single resume file based on its extension
 */
async function parseResumeFile(filePath: string): Promise<ParsedResume> {
  const fileName = path.basename(filePath);
  const ext = path.extname(fileName).toLowerCase();
  
  let content: string;
  let fileType: 'pdf' | 'doc' | 'docx';

  if (ext === '.pdf') {
    content = await parsePDF(filePath);
    fileType = 'pdf';
  } else if (ext === '.docx') {
    content = await parseDOCX(filePath);
    fileType = 'docx';
  } else if (ext === '.doc') {
    content = await parseDOC(filePath);
    fileType = 'doc';
  } else {
    throw new Error(`Unsupported file format: ${ext}`);
  }

  return {
    fileName,
    filePath,
    content: content.trim(),
    fileType,
  };
}

/**
 * Parse all resume files from a folder
 */
export async function parseResumeFolder(folderPath: string): Promise<ParsedResume[]> {
  try {
    // Check if folder exists
    const exists = await fs.pathExists(folderPath);
    if (!exists) {
      throw new Error(`Folder does not exist: ${folderPath}`);
    }

    const stats = await fs.stat(folderPath);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${folderPath}`);
    }

    // Read all files in the folder
    const files = await fs.readdir(folderPath);
    const resumeFiles = files.filter(isResumeFile);

    if (resumeFiles.length === 0) {
      return [];
    }

    // Parse all resume files
    const parsedResumes: ParsedResume[] = [];
    
    for (const file of resumeFiles) {
      try {
        const filePath = path.join(folderPath, file);
        const parsed = await parseResumeFile(filePath);
        parsedResumes.push(parsed);
      } catch (error) {
        console.error(`Error parsing ${file}:`, error);
        // Continue with other files even if one fails
      }
    }

    return parsedResumes;
  } catch (error) {
    throw new Error(`Failed to parse resume folder: ${error}`);
  }
}

/**
 * Parse uploaded resume files from Express Multer files
 */
export async function parseUploadedFiles(files: Express.Multer.File[]): Promise<ParsedResume[]> {
  const parsedResumes: ParsedResume[] = [];

  for (const file of files) {
    try {
      const fileName = file.originalname;
      const ext = path.extname(fileName).toLowerCase();
      
      if (!isResumeFile(fileName)) {
        console.warn(`Skipping unsupported file: ${fileName}`);
        continue;
      }

      let content: string;
      let fileType: 'pdf' | 'doc' | 'docx';

      if (ext === '.pdf') {
        content = await parsePDFBuffer(file.buffer);
        fileType = 'pdf';
      } else if (ext === '.docx') {
        content = await parseDOCXBuffer(file.buffer);
        fileType = 'docx';
      } else if (ext === '.doc') {
        throw new Error('DOC file parsing requires additional tools. Please convert to DOCX or PDF.');
      } else {
        throw new Error(`Unsupported file format: ${ext}`);
      }

      parsedResumes.push({
        fileName,
        filePath: fileName, // For uploaded files, we don't have a path
        content: content.trim(),
        fileType,
      });
    } catch (error) {
      console.error(`Error parsing ${file.originalname}:`, error);
      // Continue with other files even if one fails
    }
  }

  return parsedResumes;
}

