const path = require('node:path');
const {getDefaultConfig} = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
// Native and backend share the workout contract, not an independent rank engine.
config.watchFolders = [...(config.watchFolders || []), path.resolve(__dirname, '../../shared')];
module.exports = config;
