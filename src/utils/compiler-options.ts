import { z } from 'zod';

export const compilerOptionsSchema = z.object({
  target: z.enum(['es3', 'es5', 'es6', 'es2015', 'es2016', 'es2017', 'es2018', 'es2019', 'es2020', 'es2021', 'es2022', 'esnext']).optional(),
  module: z.enum(['none', 'commonjs', 'amd', 'system', 'umd', 'es6', 'es2015', 'es2020', 'es2022', 'esnext', 'node16', 'nodenext']).optional(),
  lib: z.array(z.string()).optional(),
  allowJs: z.boolean().optional(),
  checkJs: z.boolean().optional(),
  jsx: z.enum(['preserve', 'react', 'react-native', 'react-jsx', 'react-jsxdev']).optional(),
  declaration: z.boolean().optional(),
  declarationMap: z.boolean().optional(),
  sourceMap: z.boolean().optional(),
  outFile: z.string().optional(),
  outDir: z.string().optional(),
  rootDir: z.string().optional(),
  composite: z.boolean().optional(),
  removeComments: z.boolean().optional(),
  noEmit: z.boolean().optional(),
  importHelpers: z.boolean().optional(),
  downlevelIteration: z.boolean().optional(),
  isolatedModules: z.boolean().optional(),
  strict: z.boolean().optional(),
  noImplicitAny: z.boolean().optional(),
  strictNullChecks: z.boolean().optional(),
  strictFunctionTypes: z.boolean().optional(),
  strictBindCallApply: z.boolean().optional(),
  strictPropertyInitialization: z.boolean().optional(),
  noImplicitThis: z.boolean().optional(),
  useUnknownInCatchVariables: z.boolean().optional(),
  alwaysStrict: z.boolean().optional(),
  noUnusedLocals: z.boolean().optional(),
  noUnusedParameters: z.boolean().optional(),
  exactOptionalPropertyTypes: z.boolean().optional(),
  noImplicitReturns: z.boolean().optional(),
  noFallthroughCasesInSwitch: z.boolean().optional(),
  noUncheckedIndexedAccess: z.boolean().optional(),
  noImplicitOverride: z.boolean().optional(),
  noPropertyAccessFromIndexSignature: z.boolean().optional(),
  allowUnusedLabels: z.boolean().optional(),
  allowUnreachableCode: z.boolean().optional(),
  skipLibCheck: z.boolean().optional(),
  forceConsistentCasingInFileNames: z.boolean().optional(),
});

export type CompilerOptions = z.infer<typeof compilerOptionsSchema>;

export function validateCompilerOptions(options: unknown): {
  valid: boolean;
  errors: z.ZodIssue[];
} {
  const result = compilerOptionsSchema.safeParse(options);
  return {
    valid: result.success,
    errors: result.success ? [] : result.error.issues,
  };
}