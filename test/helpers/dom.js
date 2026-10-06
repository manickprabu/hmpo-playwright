import { JSDOM } from 'jsdom';

export function installDom(markup, url = 'http://localhost/') {
  const dom = new JSDOM(markup, { url });
  const previous = {
    document: globalThis.document,
    history: globalThis.history,
    window: globalThis.window,
  };
  globalThis.document = dom.window.document;
  globalThis.history = dom.window.history;
  globalThis.window = dom.window;

  return {
    dom,
    restore() {
      dom.window.close();
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete globalThis[key];
        else globalThis[key] = value;
      }
    },
  };
}

export function jsonResponse(body, options = {}) {
  const { ok = true, status = 200, statusText = 'OK' } = options;
  return {
    ok,
    status,
    statusText,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  };
}

export function flushEvents() {
  return new Promise((resolve) => setImmediate(resolve));
}
