import { DatabaseProvider } from "../config";
import { AttributeCriteria, Collection, Criteria, Model, Reference, NumberOperator, StringOperator, DateOperator } from "../core";

export class MemoryDatabaseProvider implements DatabaseProvider {
    private objects = new Map<Function, Map<string, Object>>();

    private getStore(modelClass : Function) {
        if (!this.objects.has(modelClass)) {
            this.objects.set(modelClass, new Map<string, Object>());
        }
        return this.objects.get(modelClass);
    }

    valueMatchesCriteria<T>(value : T, designType : Function, criteria : AttributeCriteria<T>): boolean {
        let typeOfCriteria = typeof criteria;
        let typeOfValue = typeof value;

        if (typeOfCriteria === 'undefined')
            return true;

        if (designType === Number) {
            if (typeOfCriteria === 'number')
                return value === criteria;
            
            if (typeOfValue !== 'number')
                return false;
            
            let v = <Number><unknown>value;
            let c = <NumberOperator>criteria;
            let passes = true;

            // order cheapest to most expensive

            if (passes && 'greaterThan' in c)
                passes = v > c.greaterThan;
            if (passes && 'lessThan' in c)
                passes = v < c.lessThan;
            if (passes && 'not' in c)
                passes = v !== c.not;
            if (passes && 'between' in c)
                passes = v >= c.between[0] && v <= c.between[1];

            return passes;
        } else if (designType === String) {
            if (typeOfCriteria === 'string')
                return value === criteria;
            if (typeOfValue !== 'string')
                return false;
            
            let v = <string><unknown>value;
            let c = <StringOperator>criteria;

            let passes = true;

            // order cheapest to most expensive

            if (passes && 'not' in c)
                passes = v !== c.not;
            if (passes && 'startsWith' in c)
                passes = v.startsWith(c.startsWith);
            if (passes && 'endsWith' in c)
                passes = v.endsWith(c.endsWith);
            if (passes && 'includes' in c)
                passes = v.includes(c.includes);
            if (passes && 'matches' in c) {
                if (c.matches instanceof RegExp) {
                    passes = c.matches.test(String(v));
                } else {
                    throw new Error(`Only regular expressions are supported for in-memory persistence layer`);
                }
            }

            return passes;
        } else if (designType === Date) {
            let v : Date;

            if (typeOfValue === 'number')
                v = new Date(Number(value));
            else if (typeOfValue === 'string')
                v = new Date(String(value));
            else if (value instanceof Date)
                v = value;
            else if (value === null || value === undefined)
                v = <null>value;
            else
                return false;
            
            if (v === criteria) // handles null/undefined
                return true;
            
            if (criteria instanceof Date)
                return v.getTime() === criteria.getTime();
            
            let vt = v.getTime();
            let c : DateOperator = <DateOperator>criteria;
            let passes = true;

            if (passes && 'not' in c)
                passes = vt !== c.not.getTime();
            if (passes && 'greaterThan' in c)
                passes = vt > c.greaterThan.getTime();
            if (passes && 'lessThan' in c)
                passes = vt < c.lessThan.getTime();
            if (passes && 'between' in c)
                passes = vt >= c.between[0].getTime() && vt <= c.between[1].getTime();
            
            return passes;
        } else {
            return value === criteria;
        }
    }

    objectMatchesCriteria<T>(object : T, $schema : typeof Model, criteria : Criteria<T>) {
        return Object.keys(criteria).every(key => this.valueMatchesCriteria(object[key], $schema.attributes[key]?.designType, criteria[key]));
    }

    async resolveCollection<T>(collection: Collection<T>): Promise<T[]> {
        let store = this.getStore(collection.type);
        let results = <T[]>Array.from(store.values())
        let params = collection.params;

        // Criteria

        let defn = collection.context?.definition;

        if (defn?.relation === 'has-many') {
            // This is a relation on the context model
            // The other model has the foreign reference

            let criteria : Criteria<any> = {};
            for (let key of Object.keys(defn.idAttribute)) {
                criteria[key] = collection.context.instance.getAttribute(defn.idAttribute[key]);
            }

            results = results.filter(x => this.objectMatchesCriteria(x, collection.type, criteria))
        }

        if (params?.criteria)
            results = results.filter(x => this.objectMatchesCriteria(x, collection.type, params.criteria))

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
        } else if (reference.definition.relation === 'belongs-to') {
            // foreign reference is on local object
            let idAttribute = reference.definition.idAttribute;
            let criteria : Criteria<T> = {};

            for (let foreignKey of Object.keys(idAttribute))
                criteria[idAttribute[foreignKey]] = reference.context.instance.getAttribute(foreignKey);

            let result = await new Collection<T>(reference.type, { criteria }).first();

            return result;
        } else {
            throw new Error(`This should not be reached`);
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