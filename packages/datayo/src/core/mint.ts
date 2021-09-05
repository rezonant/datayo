import { Model } from "../core";
import { markUnchanged, markPersisted } from "./private";

/**
 * "Mint" a single Model (or a record containing multiple Models when utilizing joined collections).
 * Minting produces a new copy of the given object which is identical with respect to its attributes,
 * including $instanceId, and is marked as unchanged.
 * @param obj 
 */
export function mintOne<T>(obj : T): T {
    if (obj instanceof Model)
        return <T><unknown>(<typeof Model>obj.constructor).new(obj.getAttributesAsObject())[markUnchanged]()[markPersisted]();
    else
        return Object.keys(obj).reduce((mint, k) => (mint[k] = this.mintOne(obj[k])), <Record<string,any>>{})
}

export function mint<T>(obj : T[]): T[] {
    return obj.map(x => mintOne(x));
}