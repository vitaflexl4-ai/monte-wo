// Optional local Chromium executable. CI can keep using Playwright's installed browser.
// Browser security defaults are unchanged; no cross-origin or certificate bypass flags.
export const browserOptions = {
  headless: true,
  ...(process.env.BROWSER_EXECUTABLE_PATH
    ? {executablePath: process.env.BROWSER_EXECUTABLE_PATH}
    : {}),
};
