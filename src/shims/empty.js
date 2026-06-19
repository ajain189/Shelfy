// Empty shim for Node.js built-in modules that the model SDK references but that
// don't exist in React Native's runtime (node:fs, node:stream, etc.).
//
// We resolve @google/genai to its "browser" build (fetch-based, no node:
// imports), so this is a belt-and-suspenders fallback for any remaining Node
// builtin reached on a code path we never run from the app.
module.exports = {};
