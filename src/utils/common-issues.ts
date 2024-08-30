import { fileURLToPath } from "node:url";
import { TSConfig } from "./config-finder";

interface Issue {
  description: string;
  check: (config: TSConfig) => boolean;
  fix: (config: TSConfig) => TSConfig;
  reason: string;
}

const commonIssues: Issue[] = [
  {
    description: "Strict mode is not enabled",
    check: (config) => !config.compilerOptions?.strict,
    fix: (config) => ({
      ...config,
      compilerOptions: {
        ...config.compilerOptions,
        strict: true,
      },
    }),
    reason:
      "Enabling strict mode helps catch more errors and improves type safety.",
  },
  {
    description: "Target is set to an outdated ECMAScript version",
    check: (config) => {
      const target = config.compilerOptions?.target?.toLowerCase();
      return (
        target &&
        !["es2018", "es2019", "es2020", "es2021", "es2022", "esnext"].includes(
          target,
        )
      );
    },
    fix: (config) => ({
      ...config,
      compilerOptions: {
        ...config.compilerOptions,
        target: "es2022",
      },
    }),
    reason:
      "Using a more modern target allows for better optimizations and newer language features.",
  },
  {
    description: "Module is not set to ESNext",
    check: (config) =>
      config.compilerOptions?.module?.toLowerCase() !== "esnext",
    fix: (config) => ({
      ...config,
      compilerOptions: {
        ...config.compilerOptions,
        module: "ESNext",
      },
    }),
    reason:
      "Using ESNext as the module system enables better tree-shaking and is more future-proof.",
  },
  {
    description: "esModuleInterop is not enabled",
    check: (config) => !config.compilerOptions?.esModuleInterop,
    fix: (config) => ({
      ...config,
      compilerOptions: {
        ...config.compilerOptions,
        esModuleInterop: true,
      },
    }),
    reason:
      "Enabling esModuleInterop improves compatibility with CommonJS modules.",
  },
  {
    description: "forceConsistentCasingInFileNames is not enabled",
    check: (config) =>
      !config.compilerOptions?.forceConsistentCasingInFileNames,
    fix: (config) => ({
      ...config,
      compilerOptions: {
        ...config.compilerOptions,
        forceConsistentCasingInFileNames: true,
      },
    }),
    reason:
      "Enforcing consistent casing in file names helps prevent issues on case-insensitive file systems.",
  },
  {
    description: "skipLibCheck is not enabled",
    check: (config) => !config.compilerOptions?.skipLibCheck,
    fix: (config) => ({
      ...config,
      compilerOptions: {
        ...config.compilerOptions,
        skipLibCheck: true,
      },
    }),
    reason:
      "Enabling skipLibCheck can significantly improve compilation speed, especially in large projects.",
  },
  {
    description: "noImplicitAny is not enabled",
    check: (config) => !config.compilerOptions?.noImplicitAny,
    fix: (config) => ({
      ...config,
      compilerOptions: {
        ...config.compilerOptions,
        noImplicitAny: true,
      },
    }),
    reason:
      "Enabling noImplicitAny helps catch potential type errors and improves code quality.",
  },
  {
    description: "strictNullChecks is not enabled",
    check: (config) => !config.compilerOptions?.strictNullChecks,
    fix: (config) => ({
      ...config,
      compilerOptions: {
        ...config.compilerOptions,
        strictNullChecks: true,
      },
    }),
    reason:
      "Enabling strictNullChecks helps prevent null and undefined errors.",
  },
  {
    description: "noUnusedLocals is not enabled",
    check: (config) => !config.compilerOptions?.noUnusedLocals,
    fix: (config) => ({
      ...config,
      compilerOptions: {
        ...config.compilerOptions,
        noUnusedLocals: true,
      },
    }),
    reason:
      "Enabling noUnusedLocals helps identify and remove unused variables, improving code cleanliness.",
  },
  {
    description: "noUnusedParameters is not enabled",
    check: (config) => !config.compilerOptions?.noUnusedParameters,
    fix: (config) => ({
      ...config,
      compilerOptions: {
        ...config.compilerOptions,
        noUnusedParameters: true,
      },
    }),
    reason:
      "Enabling noUnusedParameters helps identify and remove unused function parameters, improving code cleanliness.",
  },
  {
    description: "sourceMap is not enabled",
    check: (config) => !config.compilerOptions?.sourceMap,
    fix: (config) => ({
      ...config,
      compilerOptions: {
        ...config.compilerOptions,
        sourceMap: true,
      },
    }),
    reason:
      "Enabling sourceMap generation improves debugging experience by mapping compiled code back to the original TypeScript source.",
  },
  {
    description: "declaration is not enabled",
    check: (config) => !config.compilerOptions?.declaration,
    fix: (config) => ({
      ...config,
      compilerOptions: {
        ...config.compilerOptions,
        declaration: true,
      },
    }),
    reason:
      "Enabling declaration file generation is crucial for libraries and improves IDE support for consumers of your code.",
  },
  {
    description: "resolveJsonModule is not enabled",
    check: (config) => !config.compilerOptions?.resolveJsonModule,
    fix: (config) => ({
      ...config,
      compilerOptions: {
        ...config.compilerOptions,
        resolveJsonModule: true,
      },
    }),
    reason:
      "Enabling resolveJsonModule allows for importing JSON files as modules, which can be useful for configuration files or data.",
  },
];

export function analyzeCommonIssues(
  config: TSConfig,
): { description: string; fix: TSConfig; reason: string }[] {
  return commonIssues
    .filter((issue) => issue.check(config))
    .map((issue) => ({
      description: issue.description,
      fix: issue.fix(config),
      reason: issue.reason,
    }));
}

export function applyFix(config: TSConfig, fixIndex: number): TSConfig {
  const issues = analyzeCommonIssues(config);
  if (fixIndex >= 0 && fixIndex < issues.length) {
    return issues[fixIndex].fix;
  }
  return config;
}

// Example usage
function main() {
  const exampleConfig: TSConfig = {
    compilerOptions: {
      target: "es5",
      module: "commonjs",
      strict: false,
    },
  };

  const issues = analyzeCommonIssues(exampleConfig);
  console.log("Detected issues:");
  issues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue.description}`);
    console.log(`   Reason: ${issue.reason}`);
    console.log(
      "   Suggested fix:",
      JSON.stringify(issue.fix.compilerOptions, null, 2),
    );
    console.log();
  });
}

const __filename = fileURLToPath(import.meta.url);
if (__filename === process.argv[1]) {
  main();
}
