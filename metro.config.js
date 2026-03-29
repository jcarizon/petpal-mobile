const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');

const config = getDefaultConfig(__dirname);

config.resolver.blockList = exclusionList([
  /.*\/android\/\.cxx\/.*/,
  /.*\/android\/build\/.*/,
]);

module.exports = config;
