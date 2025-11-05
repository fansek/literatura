const staticReplacements = new Map([
  ['%%', '%'],
  ['%t', '\t'],
  ['%n', '\n'],
]);

/**
 * @param {string | number | undefined} value
 * @param {string | undefined} alignSign
 * @param {string | undefined} maxLength
 */
const sprintfToken = (value, alignSign, maxLength) => {
  const v = String(value ?? '');
  if (maxLength === undefined) {
    return v;
  }
  const l = Number(maxLength);
  return alignSign === '-' ? v.padStart(l) : v.padEnd(l);
};

const TOKEN = /%(?:%|t|n|(-)?(\d+)?(weight|src|dst|ci))/g;

/**
 * @param {string} format
 * @param {Partial<Record<'weight' | 'src'| 'dst' | 'ci', string | number>>} args
 */
const sprintf = (format, args) =>
  format.replaceAll(
    TOKEN,
    (
      substring,
      /** @type {string | undefined} */ alignSign,
      /** @type {string | undefined} */ maxLength,
      /** @type {'weight' | 'src' | 'dst' | 'ci'} */ key,
    ) => {
      const r = staticReplacements.get(substring);
      return r != null ? r : sprintfToken(args[key], alignSign, maxLength);
    },
  );

export default sprintf;
