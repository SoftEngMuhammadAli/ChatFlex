const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const srcPath = path.join(rootDir, "src", "widget.js");
const testPagePath = path.join(rootDir, "test", "widget-test.html");
const distDir = path.join(rootDir, "dist");
const distPath = path.join(distDir, "widget.js");
const serverPublicPath = path.resolve(rootDir, "..", "chatflex-server", "public", "widget.js");
const serverWidgetTestPath = path.resolve(
  rootDir,
  "..",
  "chatflex-server",
  "public",
  "widget-test.html"
);
const watchMode = process.argv.includes("--watch");

const ensureDir = (targetDir) => {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
};

const build = () => {
  const source = fs.readFileSync(srcPath, "utf8");
  const testPage = fs.readFileSync(testPagePath, "utf8");
  ensureDir(distDir);
  fs.writeFileSync(distPath, source, "utf8");
  ensureDir(path.dirname(serverPublicPath));
  fs.writeFileSync(serverPublicPath, source, "utf8");
  fs.writeFileSync(serverWidgetTestPath, testPage, "utf8");
  console.log(`[chatflex-widget] built -> ${distPath}`);
  console.log(`[chatflex-widget] synced -> ${serverPublicPath}`);
  console.log(`[chatflex-widget] synced -> ${serverWidgetTestPath}`);
};

build();

if (watchMode) {
  console.log("[chatflex-widget] watch mode enabled");
  fs.watch(path.join(rootDir, "src"), { recursive: true }, (_eventType, filename) => {
    if (!filename || !filename.endsWith(".js")) {
      return;
    }
    try {
      build();
    } catch (error) {
      console.error("[chatflex-widget] build failed:", error.message);
    }
  });
}
