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
    it('respects limit', async () => {
        class Book extends Model {
            @Attribute() name : string;
        }

        await pgt.DB.query(`CREATE TABLE books ( name VARCHAR NULL )`);
        await pgt.DB.query(`INSERT INTO books (name) VALUES ('foo'), ('bar')`);

        let books = await Book.all().limit(3);
        expect(books.length).to.equal(2);

        await pgt.DB.query(`INSERT INTO books (name) VALUES ('foo'), ('bar'), ('baz'), ('foobar'), ('foobaz')`);

        books = await Book.all().limit(3);
        expect(books.length).to.equal(3);

        await pgt.DB.query(`DELETE FROM books`);

        books = await Book.all().limit(3);
        expect(books.length).to.equal(0);
    }); 
    it('respects order', async () => {
        class Book extends Model {
            @Attribute() name : string;
        }

        await pgt.DB.query(`CREATE TABLE books ( name VARCHAR NULL )`);
        await pgt.DB.query(`INSERT INTO books (name) VALUES ('foo'), ('bar'), ('baz'), ('foobar'), ('foobaz')`);

        let books = await Book.all().orderBy({ name: 'asc' });
        
        expect(books.length).to.equal(5);
        expect(books[0].name).to.equal('bar');
        expect(books[1].name).to.equal('baz');
        expect(books[2].name).to.equal('foo');
        expect(books[3].name).to.equal('foobar');
        expect(books[4].name).to.equal('foobaz');

        books = await Book.all().orderBy({ name: 'desc' });
        
        expect(books.length).to.equal(5);
        expect(books[4].name).to.equal('bar');
        expect(books[3].name).to.equal('baz');
        expect(books[2].name).to.equal('foo');
        expect(books[1].name).to.equal('foobar');
        expect(books[0].name).to.equal('foobaz');
    });
    it.only('respects offset', async () => {
        class Book extends Model {
            @Attribute() name : string;
        }

        await pgt.DB.query(`CREATE TABLE books ( name VARCHAR NULL )`);
        await pgt.DB.query(`INSERT INTO books (name) VALUES ('foo'), ('bar'), ('baz'), ('foobar'), ('foobaz')`);

        let books = await Book.all().orderBy({ name: 'asc' }).limit(3).offset(1);
        expect(books.length).to.equal(3);
        expect(books[0].name).to.equal('baz');
        expect(books[1].name).to.equal('foo');
        expect(books[2].name).to.equal('foobar');
        
    }); 
});