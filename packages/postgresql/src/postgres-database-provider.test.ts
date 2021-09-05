import * as pgt from './testing';
import { Model } from 'datayo';
import { Attribute, Config } from 'datayo';
import { expect } from 'chai';
import { PostgresDatabaseProvider } from './postgres-database-provider';

pgt.describe('PostgresDatabaseProvider', it => {
    it('can query a simple table', async () => {
        await pgt.DB.query(`CREATE TABLE books ( name VARCHAR NULL )`);
        await pgt.DB.query(`INSERT INTO books (name) VALUES ('foobar')`);

        class Book extends Model {
            @Attribute() name : string;
        }

        let book = await Book.first();
        
        expect(book).to.exist;
        expect(book.name).to.equal('foobar');
    });
});