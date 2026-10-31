const http = require('http');
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

// Expo serves the web HTML document before Metro middleware, so Metro headers
// never reach the page. SharedArrayBuffer (required by expo-sqlite on web)
// needs these on the document response. The same pair is set in app.config.ts
// for hosted web exports.
const originalEnd = http.ServerResponse.prototype.end;
http.ServerResponse.prototype.end = function (...args) {
  if (!this.headersSent) {
    this.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    this.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  }
  return originalEnd.apply(this, args);
};

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('sql');
// Dose limits, the audit score, and the outcome maths live in ../shared so the Worker and the app agree.
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, '../shared')];

if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

const enhanceMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, metroServer) => {
  const enhancedMiddleware = enhanceMiddleware ? enhanceMiddleware(middleware, metroServer) : middleware;
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    return enhancedMiddleware(req, res, next);
  };
};

module.exports = config;
