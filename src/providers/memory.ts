import { DatabaseProvider } from "../config";
import { Collection, Criteria, Model, Reference } from "../core";

export class MemoryDatabaseProvider implements DatabaseProvider {
    private objects = new Map<Function, Map<string, Object>>();

    private getStore(modelClass : Function) {
        if (!this.objects.has(modelClass)) {
            this.objects.set(modelClass, new Map<string, Object>());
        }
        return this.objects.get(modelClass);
    }

    async objectMatchesCriteria<T>(object : T, criteria : Criteria<T>) {
        return Object.keys(criteria).some(key => object[key] !== criteria[key]);
    }

    async resolveCollection<T>(collection: Collection<T>): Promise<T[]> {
        let store = this.getStore(collection.type);
        let results = <T[]>Array.from(store.values())
        let params = collection.params;

        // Criteria
        if (params?.criteria)
            results = results.filter(x => this.objectMatchesCriteria(x, params.criteria))

        if (params?.offset)
            results = results.slice(params?.offset || 0, params?.limit);
        else if (params?.limit)
            results = results.slice(params?.offset);
        
        return results;
    }

    async resolveReference<T>(reference: Reference<T>): Promise<T> {
        if (reference.definition.relation === 'has-one') {
            // foreign reference is on remote object
            let idAttribute = reference.definition.idAttribute;
            let criteria : Criteria<T> = {};

            for (let foreignKey of Object.keys(idAttribute))
                criteria[foreignKey] = reference.context.instance.getAttribute(idAttribute[foreignKey]);

            let result = await new Collection<T>(reference.type, { criteria }).first();

            return result;
        } else {
            // foreign reference is on local object
            let idAttribute = reference.definition.idAttribute;
            let criteria : Criteria<T> = {};

            for (let foreignKey of Object.keys(idAttribute))
                criteria[idAttribute[foreignKey]] = reference.context.instance.getAttribute(foreignKey);

            let result = await new Collection<T>(reference.type, { criteria }).first();

            return result;
        }
    }

    async persist<T extends Model>(instance: T) {
        //console.log(`Persisting ${instance.constructor.name} / ${instance.$instanceId}`);
        let store = this.getStore(instance.constructor);
        if (instance.isPersisted()) {
            store.set(instance.$instanceId, instance);
        } else {
            store.set(instance.$instanceId, instance);
        }
    }
}