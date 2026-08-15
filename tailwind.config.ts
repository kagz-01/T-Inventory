import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#1F3864",
          accent: "#2E75B6",
          light: "#EAF1F8",
        },
      },
    },
  },
  plugins: [],
};
export default config;
