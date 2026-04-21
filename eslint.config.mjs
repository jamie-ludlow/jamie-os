import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import missionControlRules from "./eslint-rules/index.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Custom design pattern enforcement rules
  // See training/quality-standards.md for rationale
  {
    plugins: {
      "mission-control": missionControlRules,
    },
    rules: {
      // No hardcoded colours — use design tokens (bg-background, text-foreground, etc.)
      "mission-control/no-hardcoded-colours": "warn",
      // No native title tooltips — use <Tooltip> component
      "mission-control/no-native-title-tooltip": "warn",
      // Enforce standard opacity tiers (text-muted-foreground: /30, /60; border-border: /20)
      "mission-control/no-non-standard-opacity": "warn",
      // No native <select> etc. — use design system components
      "mission-control/no-native-form-elements": "warn",
    },
  },
]);

export default eslintConfig;
