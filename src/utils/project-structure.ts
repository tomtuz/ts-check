import fs from 'node:fs/promises';
import path from 'node:path';
import { logger } from './logger';

export interface ProjectStructure {
  files: string[];
  directories: string[];
}

export async function scanProjectStructure(projectRoot: string): Promise<ProjectStructure> {
  const structure: ProjectStructure = {
    files: [],
    directories: [],
  };

  async function scan(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(projectRoot, fullPath);

      if (entry.isDirectory()) {
        structure.directories.push(relativePath);
        await scan(fullPath);
      } else if (entry.isFile()) {
        structure.files.push(relativePath);
      }
    }
  }

  try {
    await scan(projectRoot);
    logger.info(`Scanned project structure at ${projectRoot}`);
  } catch (error) {
    logger.error(`Error scanning project structure at ${projectRoot}:`, error);
    throw error;
  }

  return structure;
}

export function analyzeProjectStructure(structure: ProjectStructure, tsconfig: any): string[] {
  const messages: string[] = [];

  const { include, exclude, files } = tsconfig;

  if (files) {
    const missingFiles = files.filter((file: string) => !structure.files.includes(file));
    if (missingFiles.length > 0) {
      messages.push(`The following files specified in 'files' are missing from the project:`);
      messages.push(...missingFiles.map((file: string) => `  - ${file}`));
    }
  }

  if (include) {
    const includedFiles = structure.files.filter((file) =>
      include.some((pattern: string) => minimatch(file, pattern))
    );
    messages.push(`Found ${includedFiles.length} files matching 'include' patterns.`);
  }

  if (exclude) {
    const excludedFiles = structure.files.filter((file) =>
      exclude.some((pattern: string) => minimatch(file, pattern))
    );
    if (excludedFiles.length > 0) {
      messages.push(`Warning: Found ${excludedFiles.length} files matching 'exclude' patterns.`);
    }
  }

  return messages;
}

// Simple implementation of minimatch for demo purposes
function minimatch(filename: string, pattern: string): boolean {
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(filename);
}