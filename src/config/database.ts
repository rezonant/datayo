import { Collection } from "../core/collection";
import { Reference } from "../core/reference";

export interface DatabaseProvider {
    resolveCollection<T>(collection : Collection<T>) : Promise<T[]>;
    resolveReference<T>(reference : Reference<T>) : Promise<T>;
}

export class Database {
    id : string;
    default? : boolean;
    provider : DatabaseProvider;
}
