/**
 * @template K
 * @template {{}} V
 * @param {Map<K, V>} map
 * @param {K} key
 * @param {V} defaultsTo
 * @returns {V}
 */
const setDefault = (map, key, defaultsTo) => {
  const value = map.get(key);
  if (value != null) {
    return value;
  }
  map.set(key, defaultsTo);
  return defaultsTo;
};

export default setDefault;
