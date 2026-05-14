import nextVitals from "eslint-config-next/core-web-vitals"

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "android/**/build/**",
      "android/app/src/main/assets/public/**",
      "node_modules/**",
      "out/**",
    ],
  },
  ...nextVitals,
  {
    rules: {
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]

export default eslintConfig
