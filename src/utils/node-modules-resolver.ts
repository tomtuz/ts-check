import fs from "node:fs/promises";
import path from "node:path";
import { logger } from "./logger";
import { TSConfig, readTSConfig } from "./config-finder";
import { fileURLToPath } from "node:url";

interface PackageJson {
  name: string;
  version: string;
  types?: string;
  typings?: string;
  [key: string]: any;
}

export async function scanNodeModules(
  projectRoot: string,
): Promise<Map<string, TSConfig>> {
  const nodeModulesPath = path.join(projectRoot, "node_modules");
  const dependencyConfigs = new Map<string, TSConfig>();

  try {
    const entries = await fs.readdir(nodeModulesPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith("@")) {
        const packagePath = path.join(nodeModulesPath, entry.name);
        const config = await resolvePackageConfig(packagePath);
        if (config) {
          dependencyConfigs.set(entry.name, config);
        }
      } else if (entry.isDirectory() && entry.name.startsWith("@")) {
        const scopePath = path.join(nodeModulesPath, entry.name);
        const scopedEntries = await fs.readdir(scopePath, {
          withFileTypes: true,
        });
        for (const scopedEntry of scopedEntries) {
          if (scopedEntry.isDirectory()) {
            const packagePath = path.join(scopePath, scopedEntry.name);
            const config = await resolvePackageConfig(packagePath);
            if (config) {
              dependencyConfigs.set(
                `${entry.name}/${scopedEntry.name}`,
                config,
              );
            }
          }
        }
      }
    }
  } catch (error) {
    logger.error("Error scanning node_modules:", error);
  }

  logger.info(
    `Found configurations for ${dependencyConfigs.size} dependencies`,
  );
  return dependencyConfigs;
}

async function resolvePackageConfig(
  packagePath: string,
): Promise<TSConfig | null> {
  try {
    const packageJsonPath = path.join(packagePath, "package.json");
    const packageJsonContent = await fs.readFile(packageJsonPath, "utf-8");
    const packageJson: PackageJson = JSON.parse(packageJsonContent);

    const tsConfigPath = await findTSConfig(packagePath, packageJson);
    if (tsConfigPath) {
      const config = await readTSConfig(tsConfigPath);
      return config;
    }
  } catch (error) {
    logger.error(
      `Error resolving configuration for package at ${packagePath}:`,
      error,
    );
  }

  return null;
}

async function findTSConfig(
  packagePath: string,
  packageJson: PackageJson,
): Promise<string | null> {
  const possiblePaths = [
    path.join(packagePath, "tsconfig.json"),
    packageJson.types && path.join(packagePath, packageJson.types),
    packageJson.typings && path.join(packagePath, packageJson.typings),
  ].filter(Boolean) as string[];

  for (const configPath of possiblePaths) {
    try {
      await fs.access(configPath);
      return configPath;
    } catch {
      // File doesn't exist, continue to the next possible path
    }
  }

  return null;
}

export function incorporateDependencyConfigs(
  projectConfig: TSConfig,
  dependencyConfigs: Map<string, TSConfig>,
): TSConfig {
  const updatedConfig: TSConfig = { ...projectConfig };

  // Merge compiler options
  if (!updatedConfig.compilerOptions) {
    updatedConfig.compilerOptions = {};
  }

  for (const [dependencyName, dependencyConfig] of dependencyConfigs) {
    if (dependencyConfig.compilerOptions) {
      // Merge paths
      if (dependencyConfig.compilerOptions.paths) {
        if (!updatedConfig.compilerOptions.paths) {
          updatedConfig.compilerOptions.paths = {};
        }
        for (const [key, value] of Object.entries(
          dependencyConfig.compilerOptions.paths,
        )) {
          if (value) {
            updatedConfig.compilerOptions.paths[`${dependencyName}/${key}`] = (
              value as string[]
            ).map((p) => `node_modules/${dependencyName}/${p}`);
          }
        }
      }

      // Merge types
      if (dependencyConfig.compilerOptions.types) {
        if (!updatedConfig.compilerOptions.types) {
          updatedConfig.compilerOptions.types = [];
        }
        updatedConfig.compilerOptions.types.push(
          ...dependencyConfig.compilerOptions.types,
        );
      }
    }
  }

  return updatedConfig;
}

// Example usage
async function main() {
  const projectRoot = process.cwd();
  try {
    const dependencyConfigs = await scanNodeModules(projectRoot);
    logger.info("Dependency configurations:", dependencyConfigs);
  } catch (error) {
    logger.error("Failed to scan node_modules:", error);
  }
}

const __filename = fileURLToPath(import.meta.url);
if (__filename === process.argv[1]) {
  main();
}
