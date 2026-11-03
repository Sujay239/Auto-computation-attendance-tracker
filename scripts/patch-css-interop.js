const fs = require('fs');
const path = require('path');

// 1. Patch render-component.js (prevents LinkingContext crash during upgrade warnings)
const renderComponentPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-css-interop',
  'dist',
  'runtime',
  'native',
  'render-component.js'
);

if (fs.existsSync(renderComponentPath)) {
  let content = fs.readFileSync(renderComponentPath, 'utf8');

  // Replace printUpgradeWarning and stringify to be crash-proof
  if (content.includes('function stringify(object) {') && content.includes('Object.entries(value)')) {
    content = content.replace(
      /function printUpgradeWarning[\s\S]*?function getDebugReplacer\(\)/,
      `function printUpgradeWarning(warning, originalProps) {
    try {
        console.warn('CssInterop upgrade warning: ' + warning);
    } catch {}
}
function stringify(object) {
    return "[Props]";
}
function getDebugReplacer()`
    );
    fs.writeFileSync(renderComponentPath, content, 'utf8');
    console.log('Successfully patched render-component.js');
  } else {
    console.log('render-component.js is already patched.');
  }
}

// 2. Patch wrap-jsx.js (prevents jsx.call undefined crash in dev mode)
const wrapJsxPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-css-interop',
  'dist',
  'runtime',
  'wrap-jsx.js'
);

if (fs.existsSync(wrapJsxPath)) {
  let content = fs.readFileSync(wrapJsxPath, 'utf8');
  if (!content.includes('if (!jsx) {')) {
    content = content.replace(
      'function wrapJSX(jsx) {',
      `function wrapJSX(jsx) {
        if (!jsx) {
            const dev = require("react/jsx-dev-runtime");
            const prod = require("react/jsx-runtime");
            jsx = (dev && dev.jsxDEV) || (prod && (prod.jsx || prod.jsxs));
        }`
    );
    fs.writeFileSync(wrapJsxPath, content, 'utf8');
    console.log('Successfully patched wrap-jsx.js');
  } else {
    console.log('wrap-jsx.js is already patched.');
  }
}

