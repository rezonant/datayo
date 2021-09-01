import { Config } from "../config";
import { Collection } from "./collection";
import { Reference } from "./reference";
import { Model } from ".";

export async function resolveCollection<T extends Model>(collection : Collection<T>) {
    let model = collection.context.instance.$schema;
    let db = model.database();

    if (model.options.database)
        db = Config.instance.databases.find(x => x.id === model.options.database);
    
    if (!db)
        throw new Error(`Cannot resolve collection: No matching database found`);

    return db.provider.resolveCollection<T>(collection);
}

export async function resolveReference<T extends Model>(reference : Reference<T>) {
    let model = reference.context.instance.$schema;
    let db = model.database();

    if (model.options.database)
        db = Config.instance.databases.find(x => x.id === model.options.database);
    
    if (!db)
        throw new Error(`Cannot resolve reference: No matching database found`);

    return db.provider.resolveReference<T>(reference);
}
