// @ts-check

/**
 * @template T
 * @typedef {(payload: T) => void} PayloadCallback
 **/

/**
 * @template TEventPayload
 * @typedef
 * {{
 *   subscribe: (callback: PayloadCallback<TEventPayload>) => void,
 *   unsubscribe: (callback: PayloadCallback<TEventPayload>) => void,
 *   emit: PayloadCallback<TEventPayload>,
 * }} EventHandler
 */

/**
 * @template TEventPayload
 * @return {EventHandler<TEventPayload>}
 **/
export function makeEventHandler() {
  /** @type {Set<PayloadCallback<TEventPayload>>} */
  let eventTargets = new Set();
  return {
    subscribe: (callback) => { eventTargets.add(callback) },
    unsubscribe: (callback) => { eventTargets.delete(callback) },
    emit: (eventPayload) => eventTargets.forEach((callback) => callback(eventPayload)),
  };
}
