// @ts-check

/**
 * @typedef {Object} ComplexTableInfo
 * @property {string} queryToWrap
 * @property {string[]} idVars
 **/

/**
 * @return {ComplexTableInfo}
 */
export function makeDefaultInfo() {
  return {
    idVars: [],
    queryToWrap: "",
  };
}

const complexTableInfoKey = "complexTableInfo";

/**
 * @param {ComplexTableInfo} complexTableInfo
 */
export function setComplexTableInfoSession(complexTableInfo) {
  Session.set(complexTableInfoKey, complexTableInfo);
}

/**
 * @return {ComplexTableInfo | undefined}
 */
export function maybeGetComplexTableInfoSession() {
  return Session.get(complexTableInfoKey);
}

/**
 * @return {ComplexTableInfo}
 */
export function getComplexTableInfoSession() {
  const maybeRes = Session.get(complexTableInfoKey);
  if (maybeRes) return maybeRes;

  const res = makeDefaultInfo();
  setComplexTableInfoSession(res);
  return res;
}
