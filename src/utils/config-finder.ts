import fs from "node:fs/promises";
import path, { dirname } from "node:path";
import { logger } from "./logger";
import { fileURLToPath } from "node:url";

const CONFIG_FILE_NAMES = [
  "tsconfig.json",
  "tsconfig.app.json",
  "tsconfig.node.json",
  "jsconfig.json",
];

export interface TSConfig {
  compilerOptions?: Record<string, any>;
  include?: string[];
  exclude?: string[];
  extends?: string;
  files?: string[];
  [key: string]: any;
}

export async function findTSConfigs(projectRoot: string): Promise<string[]> {
  const configFiles: string[] = [];

  async function scanDirectory(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (
        entry.isDirectory() &&
        !entry.name.startsWith(".") &&
        entry.name !== "node_modules"
      ) {
        await scanDirectory(path.join(dir, entry.name));
      } else if (entry.isFile() && CONFIG_FILE_NAMES.includes(entry.name)) {
        configFiles.push(path.join(dir, entry.name));
      }
    }
  }

  await scanDirectory(projectRoot);
  logger.info(
    `Found ${configFiles.length} configuration file(s) in ${projectRoot}`,
  );
  return configFiles;
}

export async function readTSConfig(configPath: string): Promise<TSConfig> {
  try {
    const content = await fs.readFile(configPath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    logger.error(`Error reading or parsing ${configPath}:`, error);
    throw error;
  }
}

export async function mergeConfigs(configPaths: string[]): Promise<TSConfig> {
  const configs: TSConfig[] = [];

  for (const configPath of configPaths) {
    const config = await readTSConfig(configPath);
    configs.push(config);
  }

  const mergedConfig: TSConfig = {};

  // Merge configs in reverse order (last file has highest priority)
  for (const config of configs.reverse()) {
    // Merge compiler options
    if (config.compilerOptions) {
      mergedConfig.compilerOptions = {
        ...mergedConfig.compilerOptions,
        ...config.compilerOptions,
      };
    }

    // Merge include, exclude, and files arrays
    for (const prop of ["include", "exclude", "files"] as const) {
      if (config[prop]) {
        mergedConfig[prop] = [...(mergedConfig[prop] || []), ...config[prop]];
      }
    }

    // Merge other properties
    for (const [key, value] of Object.entries(config)) {
      if (
        !["compilerOptions", "include", "exclude", "files", "extends"].includes(
          key,
        )
      ) {
        mergedConfig[key] = value;
      }
    }
  }

  return mergedConfig;
}

export async function findAndMergeConfigs(
  projectRoot: string,
): Promise<TSConfig> {
  const configFiles = await findTSConfigs(projectRoot);
  const relevantConfigs = determineRelevantConfigs(configFiles);
  return mergeConfigs(relevantConfigs);
}

function determineRelevantConfigs(configFiles: string[]): string[] {
  const relevantConfigs: string[] = [];
  const configPriority = new Map<string, number>(
    CONFIG_FILE_NAMES.map((name, index) => [name, index]),
  );

  for (const configFile of configFiles) {
    const fileName = path.basename(configFile);
    const priority = configPriority.get(fileName) ?? Number.POSITIVE_INFINITY;

    const configPriorityValue = relevantConfigs.length
      ? configPriority.get(path.basename(relevantConfigs[0]))
      : null;

    if (
      relevantConfigs.length === 0 ||
      (configPriorityValue != null && priority < configPriorityValue)
    ) {
      relevantConfigs.unshift(configFile);
    } else {
      relevantConfigs.push(configFile);
    }
  }

  logger.info(
    `Determined ${relevantConfigs.length} relevant configuration file(s)`,
  );
  return relevantConfigs;
}

// Example usage
async function main() {
  const projectRoot = process.cwd();
  try {
    const mergedConfig = await findAndMergeConfigs(projectRoot);
    logger.info("Merged configuration:", mergedConfig);
  } catch (error) {
    logger.error("Failed to find and merge configurations:", error);
  }
}

const __filename = fileURLToPath(import.meta.url);
if (__filename === process.argv[1]) {
  main();
}
