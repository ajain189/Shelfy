// Learn more https://docs.expo.io/guides/customizing-metro
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Prefer each package's "browser" export condition. This makes Metro resolve
// @google/genai to its web build (fetch-based, free of node: imports) instead
// of its Node build (which references node:stream). Without this, RN would pull
// in the Node entry and fail to bundle.
config.resolver.unstable_conditionNames = ["browser", "require", "import"];

// Belt-and-suspenders: any package that still reaches for a Node built-in
// (node:fs, node:crypto, …) on a code path we never run gets an empty shim, so
// Metro can always finish bundling for Expo Go.
const EMPTY = path.resolve(__dirname, "src/shims/empty.js");

const NODE_BUILTINS = new Set([
  "fs",
  "fs/promises",
  "path",
  "crypto",
  "stream",
  "stream/promises",
  "util",
  "buffer",
  "child_process",
  "readline",
  "os",
  "net",
  "tls",
  "http",
  "https",
  "zlib",
]);

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const bare = moduleName.startsWith("node:") ? moduleName.slice(5) : moduleName;
  if (moduleName.startsWith("node:") || NODE_BUILTINS.has(bare)) {
    return { type: "sourceFile", filePath: EMPTY };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
