const path = require("node:path");
const { defineConfig } = require("vitest/config");

module.exports = defineConfig({
  resolve: {
    // The real api/index.ts declares `joplin` as an ambient global, so importing
    // it outside Joplin throws. Every module under src reaches it. api/types.ts
    // is plain type and enum declarations, so it loads as it ships.
    alias: [
      {
        find: /^api\/types$/,
        replacement: path.resolve(__dirname, "api/types.ts"),
      },
      {
        find: /^api$/,
        replacement: path.resolve(__dirname, "test/joplin-stub.ts"),
      },
    ],
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
