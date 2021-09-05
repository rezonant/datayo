import * as pg from 'pg';
import { describe as rzDescribe, before, after, TestBuilder } from 'razmin';
import { Config } from 'datayo';
import { PostgresDatabaseProvider } from '../postgres-database-provider';

export let DB : pg.Client;

export async function describe(subject : string, callback : (it: TestBuilder) => void) {
    rzDescribe(subject, async it => {
        let name = `datayo_test_${Math.floor(Math.random() * 1000000)}`;

        before(async () => {
            let client = new pg.Client({ 
                user: process.env.DATAYO_PG_TEST_USER || 'datayo',
                password: process.env.DATAYO_PG_TEST_PASSWORD || 'datayo',
                database: process.env.DATAYO_PG_TEST_DATABSE || 'datayo'
            });
    
            await client.connect();
            await client.query(`CREATE DATABASE "${name}"`);
            await client.end();
            //console.log(`Created test DB ${name}`);

            DB = new pg.Client({
                user: process.env.DATAYO_PG_TEST_USER || 'datayo',
                password: process.env.DATAYO_PG_TEST_PASSWORD || 'datayo',
                database: name
            });

            await DB.connect();

            Config.instance.databases = [
                {
                    id: 'pg',
                    isDefault: true,
                    provider: new PostgresDatabaseProvider(DB)
                }
            ];
        });

        after(async () => {
            await DB.end();

            let client = new pg.Client({ 
                user: process.env.DATAYO_PG_TEST_USER || 'datayo',
                password: process.env.DATAYO_PG_TEST_PASSWORD || 'datayo',
                database: process.env.DATAYO_PG_TEST_DATABSE || 'datayo'
            });
    
            await client.connect();
            await client.query(`DROP DATABASE "${name}"`);
            await client.end();
            
            //console.log(`Deleted test DB ${name}`);
            Config.instance.databases = [];
            DB = null;
        });

        callback(it);
    });
}