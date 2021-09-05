import * as pgt from './testing';
import { Model } from 'datayo';
import { Attribute, Config } from 'datayo';
import { expect } from 'chai';
import { PostgresDatabaseProvider } from './postgres-database-provider';
import { describe, before, delay } from 'razmin';

pgt.describe('PostgresDatabaseProvider', it => {
    describe(': simple persistence', it => {
        class Book extends Model {
            @Attribute() name : string;
        }

        it.only('persists a new item', async () => {
            await pgt.DB.query(`CREATE TABLE books ( name VARCHAR NULL )`);
            let book = Book.new({ name: 'foobar' });

            await book.save();

            let result = await pgt.DB.query('SELECT * FROM books');

            expect(result.rows.length).to.equal(1);
            expect(result.rows[0]).to.eql({ name: 'foobar' });
        });
    });
    describe(': queries', it => {
        class Book extends Model {
            @Attribute() name : string;
        }

        it('can query a simple table', async () => {
            await pgt.DB.query(`CREATE TABLE books ( name VARCHAR NULL )`);
            await pgt.DB.query(`INSERT INTO books (name) VALUES ('foobar')`);
            let book = await Book.first();
            
            expect(book).to.exist;
            expect(book.name).to.equal('foobar');
        });    
        it('respects limit', async () => {
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
        it('respects offset', async () => {
            await pgt.DB.query(`CREATE TABLE books ( name VARCHAR NULL )`);
            await pgt.DB.query(`INSERT INTO books (name) VALUES ('foo'), ('bar'), ('baz'), ('foobar'), ('foobaz')`);

            let books = await Book.all().orderBy({ name: 'asc' }).limit(3).offset(1);
            expect(books.length).to.equal(3);
            expect(books[0].name).to.equal('baz');
            expect(books[1].name).to.equal('foo');
            expect(books[2].name).to.equal('foobar');
        }); 
        it('respects startsWith', async () => {
            await pgt.DB.query(`CREATE TABLE books ( name VARCHAR NULL )`);
            await pgt.DB.query(`INSERT INTO books (name) VALUES ('foo'), ('bar'), ('baz'), ('foobar'), ('foobaz')`);

            let books = await Book.all().where({ name: { startsWith: 'b' }}).orderBy({ name: 'asc' })
            expect(books.length).to.equal(2);
            expect(books[0].name).to.equal('bar');
            expect(books[1].name).to.equal('baz');
        }); 
        it('respects endsWith', async () => {
            await pgt.DB.query(`CREATE TABLE books ( name VARCHAR NULL )`);
            await pgt.DB.query(`INSERT INTO books (name) VALUES ('foo'), ('bar'), ('baz'), ('foobar'), ('foobaz')`);

            let books = await Book.all().where({ name: { endsWith: 'z' }}).orderBy({ name: 'asc' })
            expect(books.length).to.equal(2);
            expect(books[0].name).to.equal('baz');
            expect(books[1].name).to.equal('foobaz');
        }); 
        it('respects includes', async () => {
            await pgt.DB.query(`CREATE TABLE books ( name VARCHAR NULL )`);
            await pgt.DB.query(`INSERT INTO books (name) VALUES ('foo'), ('bar'), ('baz'), ('foobar'), ('foobaz')`);

            let books = await Book.all().where({ name: { includes: 'o' }}).orderBy({ name: 'asc' })
            expect(books.length).to.equal(3);
            expect(books[0].name).to.equal('foo');
            expect(books[1].name).to.equal('foobar');
            expect(books[2].name).to.equal('foobaz');
        }); 
        it('respects not', async () => {
            await pgt.DB.query(`CREATE TABLE books ( name VARCHAR NULL )`);
            await pgt.DB.query(`INSERT INTO books (name) VALUES ('foo'), ('bar'), ('baz'), ('foobar'), ('foobaz')`);

            let books = await Book.all().where({ name: { not: 'baz' }}).orderBy({ name: 'asc' })
            expect(books.length).to.equal(4);
            expect(books[0].name).to.equal('bar');
            expect(books[1].name).to.equal('foo');
            expect(books[2].name).to.equal('foobar');
            expect(books[3].name).to.equal('foobaz');
        }); 
        it('respects where-equal', async () => {
            await pgt.DB.query(`CREATE TABLE books ( name VARCHAR NULL )`);
            await pgt.DB.query(`INSERT INTO books (name) VALUES ('foo'), ('bar'), ('baz'), ('foobar'), ('foobaz')`);

            let books = await Book.all().where({ name: 'baz' }).orderBy({ name: 'asc' })
            expect(books.length).to.equal(1);
            expect(books[0].name).to.equal('baz');
        });
    });
});