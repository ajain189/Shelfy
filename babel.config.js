module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // The worklets plugin (used by react-native-reanimated v4) MUST be last.
    plugins: ["react-native-worklets/plugin"],
  };
};
