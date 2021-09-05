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
            let oper = '=';

            where.push(`"${key}" ${oper} ?`);
            params.push(collection.criteria[key]);
        }

        if (where.length > 0) {
            query = `${query} WHERE ${where.join(' AND ')}`;
        }

        if (collection.params?.order) {
            let order = Object.keys(collection.params.order).map(k => `${k} ${collection.params.order[k]}`);
            query = `${query} ORDER BY ${order.join(', ')}`;
        }

        if (collection.params?.limit) {
            query = `${query} LIMIT ${collection.params?.limit}`;
        }

        if (collection.params?.offset) {
            query = `${query} OFFSET ${collection.params?.offset}`
        }
        
        //console.log(`QUERY: ${query}`);
        let result = await this.client.query(query);
        let models: Model[] = [];

        return result.rows.map(row => <T><unknown>collection.type.new(row));
    }

    async resolveReference<T extends Model>(reference: Reference<T, any>): Promise<T> {
        await this.connect();
        throw new Error("Method not implemented.");
    }

    async persist<T extends Model>(instance: T): Promise<void> {
        await this.connect();
        throw new Error("Method not implemented.");
    }
}