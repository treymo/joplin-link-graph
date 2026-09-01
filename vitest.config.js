const path = require("node:path");
const { defineConfig } = require("vitest/config");

module.exports = defineConfig({
  resolve: {
    // The real api/index.ts declares `joplin` as an ambient global, so importing
    // it outside Joplin throws. Every module under src/data reaches it.
    alias: { api: path.resolve(__dirname, "test/joplin-stub.ts") },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
