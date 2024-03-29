import { DatabaseProvider, Collection, Criteria, Model, Reference } from "datayo";
import * as pg from 'pg';
import { Subject, Observable } from 'rxjs';

export interface PostgresOptions {
    hostname : string;
    database : string;
    password : string;
    username : string;
}

export interface PostgresNotification {
    channel : string;
    payload : string;
}

export class PostgresDatabaseProvider implements DatabaseProvider {
    constructor(options : PostgresOptions | pg.Client) {
        if (options instanceof pg.Client) {
            this.client = options;
            this.connected = true;
            this.connecting = Promise.resolve();
        } else {
            this.client = new pg.Client({
                host: options.hostname,
                password: options.password,
                database: options.database,
                user: options.username
            });
            this.client.addListener('error', error => this._errors.next(error));
            this.client.addListener('end', () => this.onDisconnected())
            this.client.addListener('notification', notif => this._notifications.next(notif));
            this.client.addListener('notice', error => this._notices.next(error));
        }

    }

    client : pg.Client;
    options : PostgresOptions;
    connected = false;
    connecting : Promise<void>;

    private _notifications = new Subject<PostgresNotification>();
    private _notices = new Subject<Error>();
    private _errors = new Subject<Error>();

    get errors() {
        return <Observable<Error>>this._errors;
    }

    get notices() {
        return <Observable<Error>>this._notices;
    }

    get notifications() {
        return <Observable<PostgresNotification>>this._notifications;
    }

    private onDisconnected() {    
        this.connected = false;
        this.connecting = null;
    }

    private async connect() {
        this.connecting = this.connecting || this.client.connect();
    }

    private inferTableName(className : string) {
        let singular = className[0].toLowerCase() + className.slice(1);

        if (singular.endsWith('s'))
            return `${singular}es`;
        else
            return `${singular}s`;
    }

    async resolveCollection<T>(collection: Collection<T, Criteria<T>>): Promise<T[]> {
        await this.connect();
        let tableName = collection.type.options?.tableName || this.inferTableName(collection.type.name);

        let query = `SELECT * FROM ${tableName}`;
        let where = [];
        let params = [];
            
        for (let key of Object.keys(collection.criteria)) {

            if (typeof collection.criteria[key] === 'object') {
                let opers = collection.criteria[key];
                for (let oper of ['includes', 'startsWith', 'endsWith', 'not']) {
                    if (!(oper in opers))
                        continue;
                    if (oper === 'includes') {
                        where.push(`"${key}" LIKE ?`);
                        params.push(`%${opers[oper]}%`);
                    } else if (oper === 'startsWith') {
                        where.push(`"${key}" LIKE ?`);
                        params.push(`${opers[oper]}%`);
                    } else if (oper === 'endsWith') {
                        where.push(`"${key}" LIKE ?`);
                        params.push(`%${opers[oper]}`);
                    } else if (oper === 'not') {
                        where.push(`"${key}" != ?`);
                        params.push(opers[oper]);
                    }
                }
            } else {
                where.push(`"${key}" = ?`);
                params.push(collection.criteria[key]);
            }
        }

        if (where.length > 0) {
            query = `${query} WHERE ${where.join(' AND ')}`;
        }

        if (collection.params?.order) {
            let order = Object.keys(collection.params.order).map(k => `"${k}" ${collection.params.order[k]}`);
            query = `${query} ORDER BY ${order.join(', ')}`;
        }

        if (collection.params?.limit) {
            query = `${query} LIMIT ${collection.params?.limit}`;
        }

        if (collection.params?.offset) {
            query = `${query} OFFSET ${collection.params?.offset}`
        }
        
        for (let i = 0; i < params.length; ++i)
            query = query.replace('?', `$${i+1}`);

        if (process.env.DATAYO_DIAGNOSTICS)
            console.log(`QUERY: ${query}`);
        
        let result = await this.client.query(query, params);

        if (process.env.DATAYO_DIAGNOSTICS) {
            for (let row of result.rows) {
                console.log(`Row:`);
                for (let key of Object.keys(row)) {
                    console.log(` - ${key}: ${row[key]}`);
                }
            }
        }
        return result.rows.map(row => <T><unknown>collection.type.new(row));
    }

    async resolveReference<T extends Model>(reference: Reference<T, any>): Promise<T> {
        await this.connect();

        if (reference.definition?.relation === 'belongs-to') {
            let criteria = Object.keys(reference.definition?.idAttribute)
                .map((foreignKey) => [
                    reference.definition.idAttribute[foreignKey], 
                    reference.context.instance.getAttribute(foreignKey)
                ])
                .reduce((o, [k,v]) => (o[k] = v, o), {})
            ;

            let results = await new Collection<T>(reference.type, { 
                criteria,
                limit: 1
            }).resolve();

            return results[0];
            
        } else if (reference.definition?.relation === 'has-one') {
            // TODO
        }
        
        throw new Error("Method not implemented.");
    }

    async persist<T extends Model>(instance: T): Promise<void> {
        await this.connect();

        // Persist the object itself

        let type = instance.type();
        let tableName = type.options?.tableName || this.inferTableName(type.name);
        let query : string;
        let params : any[] = [];

        if (instance.isPersisted()) {
            if (type.primaryKey.length === 0) {
                throw new Error(`Cannot update instance of model ${type.name}: no primary key is defined`);
            }

            let changes = instance.getChangesAsObject();
            let primaryKey = instance.primaryCriteria();

            let changeClauses = Object.keys(changes).map(k => `${k} = ?`);
            params.push(...Object.values(changes));

            let primaryKeyClauses = Object.keys(primaryKey).map(k => `${k} = ?`);
            params.push(...Object.values(primaryKey));
            
            query = `UPDATE ${tableName} SET ${changeClauses.join(', ')} WHERE ${primaryKeyClauses.join(', ')}`;
        } else {
            let eligibleAttrs = type.attributeDefinitions.filter(x => !x.relation).filter(x => x.name !== '$instanceId');
            let changes = instance.getChangesAsObject();
            let attributeEntries = eligibleAttrs
                .filter(k => k.name in changes)
                .map(k => [k.name, changes[k.name]])
            ;
            let attrs = attributeEntries.map(([k,v]) => k);
            let values = attributeEntries.map(([k,v]) => v);

            query = `INSERT INTO ${tableName} (${attrs.map(x => `"${x}"`).join(', ')}) VALUES (${values.map((x,i) => `$${i+1}`)}) RETURNING *`;
            params = values;
        }

        for (let i = 0; i < params.length; ++i)
            query = query.replace('?', `$${i+1}`);

        if (process.env.DATAYO_DIAGNOSTICS)
            console.log(`PERSIST QUERY: ${query}`);

        let result = await this.client.query(query, params);
        let row = result.rows[0];

        instance.apply(row);
    }
}