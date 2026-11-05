const path = require('node:path');
const {getDefaultConfig} = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
// Native and backend share the workout contract AND the one Strength Index engine (server/strength/engine.js);
// the app never ships an independent rank engine.
config.watchFolders = [...(config.watchFolders || []), path.resolve(__dirname, '../../shared'), path.resolve(__dirname, '../../server/strength')];
module.exports = config;
