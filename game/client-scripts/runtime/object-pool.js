export function createObjectPool({ create, activate, deactivate }) {
  const available = [];
  const active = new Set();
  let created = 0;

  const make = () => {
    created += 1;
    return create();
  };

  return Object.freeze({
    warm(count) {
      while (available.length + active.size < count) {
        const item = make();
        deactivate(item);
        available.push(item);
      }
    },
    acquire(...args) {
      const item = available.pop() || make();
      active.add(item);
      activate(item, ...args);
      return item;
    },
    release(item) {
      if (!active.delete(item)) return false;
      deactivate(item);
      available.push(item);
      return true;
    },
    stats: () => ({
      available: available.length,
      active: active.size,
      created,
    }),
  });
}
