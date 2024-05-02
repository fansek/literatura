/**
 * @deprecated remove this when TypeScript 5.5 is released.
 * @template T
 * @param {T | null} value
 * @returns {value is T & {}}
 */
const isNotNull = (value) => value != null;

export default isNotNull;
