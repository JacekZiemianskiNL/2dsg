// Test stand-in for next/font/google: every font loader returns stable class names.
interface FontOptions {
  variable?: string;
}

const loadFont = (options: FontOptions = {}) => ({
  className: "font-stub",
  // Real next/font class names look like `__variable_1a2b3c`, never like a Tailwind utility.
  variable: options.variable ? `__variable${options.variable.replaceAll("-", "_")}` : "",
  style: { fontFamily: "stub" },
});

export const Geist = loadFont;
