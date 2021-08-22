import { Model } from "../core";
import { Collection } from "../core/collection";
import { Reference } from "../core/reference";

export interface DatabaseProvider {
    resolveCollection<T>(collection : Collection<T>) : Promise<T[]>;
    resolveReference<T>(reference : Reference<T>) : Promise<T>;
    persist<T extends Model>(instance : T): Promise<void>;
}

export class Database {
    constructor(
        readonly id : string, 
        readonly isDefault? : boolean,
        readonly provider? : DatabaseProvider
    ) {
    }
}
