/**
 * bus.js — a tiny synchronous event bus.
 *
 * Systems announce; nothing reaches across modules to poke at another
 * module's internals. Keeps prompt 2 and 3 able to subscribe to anything
 * without editing the emitter.
 */

const handlers = new Map();

export const bus = {
  on(event, fn) {
    if (!handlers.has(event)) handlers.set(event, new Set());
    handlers.get(event).add(fn);
    return () => bus.off(event, fn);
  },

  once(event, fn) {
    const off = bus.on(event, (...a) => { off(); fn(...a); });
    return off;
  },

  off(event, fn) {
    const s = handlers.get(event);
    if (s) s.delete(fn);
  },

  emit(event, payload) {
    const s = handlers.get(event);
    if (s) for (const fn of [...s]) {
      try { fn(payload); } catch (e) { console.error('[bus]', event, e); }
    }
    const all = handlers.get('*');
    if (all) for (const fn of [...all]) {
      try { fn(event, payload); } catch (e) { console.error('[bus] *', e); }
    }
  },

  clear() { handlers.clear(); },
};

export default bus;
