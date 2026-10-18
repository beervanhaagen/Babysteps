// The design-system components (design/design-system/components/bundle.js) rendered to HTML
// at build time, so the page looks exactly like the boards without sending React to visitors.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const designSystem = fileURLToPath(new URL('../../../design/design-system/', import.meta.url));

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
globalThis.window = { React };
new Function(readFileSync(`${designSystem}components/bundle.js`, 'utf8'))();
const components = globalThis.window.TeddySteps;

/** One component as HTML, e.g. ui('Button', { href: '#start' }, 'Hou me op de hoogte'). */
export function ui(name, props = {}, children) {
  if (!components[name]) throw new Error(`No component ${name} in bundle.js`);
  return renderToStaticMarkup(React.createElement(components[name], props, children));
}
