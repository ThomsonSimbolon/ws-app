import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./store/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds (flat structure)
        app: "var(--bg-app)",
        surface: "var(--bg-surface)",
        card: "var(--bg-card)",
        elevated: "var(--bg-elevated)",
        secondary: "var(--bg-secondary)",

        // Primary colors (flat structure for better v4 compatibility)
        primary: "var(--primary)",
        "primary-hover": "var(--primary-hover)",
        "primary-soft": "var(--primary-soft)",

        // Text colors (flat structure)
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",

        // Borders (flat structure)
        border: "var(--border)",
        divider: "var(--divider)",

        // Status colors (flat structure)
        danger: "var(--danger)",
        "danger-soft": "var(--danger-soft)",
        success: "var(--success)",
        "success-soft": "var(--success-soft)",
        warning: "var(--warning)",
        "warning-soft": "var(--warning-soft)",
        info: "var(--info)",
        "info-soft": "var(--info-soft)",
      },
      backgroundColor: {
        // Explicitly generate background utilities
        app: "var(--bg-app)",
        card: "var(--bg-card)",
        elevated: "var(--bg-elevated)",
        secondary: "var(--bg-secondary)",
        primary: "var(--primary)",
        "primary-hover": "var(--primary-hover)",
        "primary-soft": "var(--primary-soft)",
      },
      textColor: {
        // Explicitly generate text utilities
        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        muted: "var(--text-muted)",
      },
      borderColor: {
        // Explicitly generate border utilities
        border: "var(--border)",
        divider: "var(--divider)",
      },
      screens: {
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
    },
  },
  plugins: [],
};

export default config;
