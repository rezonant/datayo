import { expect } from "chai";
import { suite } from "razmin";
import { Config, Database } from "../config";
import { Attribute, BelongsTo, Criteria, HasMany, Model, Relation } from "../core";
import { MemoryDatabaseProvider } from "./memory";

suite(describe => {
    describe('MemoryDatabaseProvider', it => {
        it('supports simple persistence and querying', async () => {

            Config.instance.databases = [
                new Database('default', true, new MemoryDatabaseProvider())
            ];

            try {
                class Author extends Model {
                    @Attribute() name : string;
                    @Attribute() country : string;
                    @Relation() books = HasMany(Book, { idAttribute: { authorName: 'name', country: 'country' }})
                }

                class Book extends Model {
                    @Attribute() authorName : string;
                    @Attribute() country : string;
                    @Relation() author = BelongsTo(Author, { idAttribute: { authorName: 'name', country: 'country' } });
                }

                await Promise.all([
                    Author.create({
                        name: 'Bob',
                        country: 'UK'
                    }),
                    Book.create({
                        authorName: 'Bob',
                        country: 'UK'
                    })
                ]);

                let book = await Book.first();
                expect(book).to.exist;

                let author = await book.author;

                expect(author).to.exist;
                expect(author.name).to.equal('Bob');
                expect(author.country).to.equal('UK');
            } finally {
                Config.instance.databases = undefined;
            }
        });
        describe('objectMatchesCriteria', it => {
            it('matches all objects when no criteria is provided', () => {

                class Test extends Model {
                    @Attribute() foo : number;
                    @Attribute() baz : number;
                }

                let dbp = new MemoryDatabaseProvider();
                expect(dbp.objectMatchesCriteria(Test.new({ foo: 123 }), Test, {})).to.be.true;
                expect(dbp.objectMatchesCriteria(Test.new({ baz: 123 }), Test, {})).to.be.true;
                expect(dbp.objectMatchesCriteria(Test.new({ }), Test, {})).to.be.true;
            });
            it('matches objects with a single value criteria', () => {
                class Test extends Model {
                    @Attribute() foo : number;
                    @Attribute() baz : number;
                }

                let dbp = new MemoryDatabaseProvider();
                expect(dbp.objectMatchesCriteria<any>(Test.new({ foo: 123 }), Test, { foo: 123 })).to.be.true;
                expect(dbp.objectMatchesCriteria<any>(Test.new({ foo: 123, baz: 321 }), Test, { foo: 123 })).to.be.true;
                expect(dbp.objectMatchesCriteria<any>(Test.new({ foo: 123 }), Test, { foo: 321 })).to.be.false;
                expect(dbp.objectMatchesCriteria<any>(Test.new({ baz: 123 }), Test, { foo: 123 })).to.be.false;
                expect(dbp.objectMatchesCriteria<any>(Test.new({ }), Test, { foo: 123 })).to.be.false;
            });
            it('matches objects with a multiple value criteria', () => {
                class Test extends Model {
                    @Attribute() foo : number;
                    @Attribute() bar : number;
                    @Attribute() baz : string;
                }

                let dbp = new MemoryDatabaseProvider();
                let crit : Criteria<any> = { foo: 123, bar: 321 };

                expect(dbp.objectMatchesCriteria<any>(Test.new({ foo: 123, bar: 321 }), Test, crit)).to.be.true;
                expect(dbp.objectMatchesCriteria<any>(Test.new({ foo: 123, bar: 321, baz: 'foobar' }), Test, crit)).to.be.true;
                expect(dbp.objectMatchesCriteria<any>(Test.new({ foo: 123 }), Test, crit)).to.be.false;
                expect(dbp.objectMatchesCriteria<any>(Test.new({ bar: 321 }), Test, crit)).to.be.false;
                expect(dbp.objectMatchesCriteria<any>(Test.new({ foo: 123, bar: 322 }), Test, crit)).to.be.false;
                expect(dbp.objectMatchesCriteria<any>(Test.new({ foo: 124, bar: 321 }), Test, crit)).to.be.false;
                expect(dbp.objectMatchesCriteria<any>(Test.new({ baz: 'barfoo' }), Test, crit)).to.be.false;
                expect(dbp.objectMatchesCriteria<any>(Test.new({ }), Test, crit)).to.be.false;
            });
            it('matches objects with NumberCriteria greaterThan', () => {
                class Test extends Model {
                    @Attribute() foo : number;
                    @Attribute() bar : number;
                }

                let dbp = new MemoryDatabaseProvider();
                expect(dbp.objectMatchesCriteria(Test.new({ foo: 123, bar: 321 }), Test, { foo: { greaterThan: 100 } })).to.be.true;
                expect(dbp.objectMatchesCriteria(Test.new({ foo: 123, bar: 321 }), Test, { foo: { greaterThan: 122 } })).to.be.true;
                expect(dbp.objectMatchesCriteria(Test.new({ foo: 123, bar: 321 }), Test, { foo: { greaterThan: 123 } })).to.be.false;
                expect(dbp.objectMatchesCriteria(Test.new({ foo: 123, bar: 321 }), Test, { foo: { greaterThan: 124 } })).to.be.false;
            });
            it('matches objects with NumberCriteria lessThan', () => {
                class Test extends Model {
                    @Attribute() foo : number;
                    @Attribute() bar : number;
                }

                let dbp = new MemoryDatabaseProvider();
                expect(dbp.objectMatchesCriteria(Test.new({ foo: 123, bar: 321 }), Test, { foo: { lessThan: 200 } })).to.be.true;
                expect(dbp.objectMatchesCriteria(Test.new({ foo: 123, bar: 321 }), Test, { foo: { lessThan: 124 } })).to.be.true;
                expect(dbp.objectMatchesCriteria(Test.new({ foo: 123, bar: 321 }), Test, { foo: { lessThan: 123 } })).to.be.false;
                expect(dbp.objectMatchesCriteria(Test.new({ foo: 123, bar: 321 }), Test, { foo: { lessThan: 122 } })).to.be.false;
            });
            it('matches objects with NumberCriteria between', () => {                
                class Test extends Model {
                    @Attribute() foo : number;
                    @Attribute() bar : number;
                }

                let dbp = new MemoryDatabaseProvider();
                expect(dbp.objectMatchesCriteria(Test.new({ foo: 123, bar: 321 }), Test, { foo: { between: [120, 130] } })).to.be.true;
                expect(dbp.objectMatchesCriteria(Test.new({ foo: 123, bar: 321 }), Test, { foo: { between: [123, 123] } })).to.be.true;
                expect(dbp.objectMatchesCriteria(Test.new({ foo: 123, bar: 321 }), Test, { foo: { between: [130, 134] } })).to.be.false;
                expect(dbp.objectMatchesCriteria(Test.new({ foo: 123, bar: 321 }), Test, { foo: { between: [110, 120] } })).to.be.false;
            });
            it('matches objects with NumberCriteria not', () => {                
                class Test extends Model {
                    @Attribute() foo : number;
                    @Attribute() bar : number;
                }

                let dbp = new MemoryDatabaseProvider();
                expect(dbp.objectMatchesCriteria(Test.new({ foo: 123, bar: 321 }), Test, { foo: { not: 100 } })).to.be.true;
                expect(dbp.objectMatchesCriteria(Test.new({ foo: 123, bar: 321 }), Test, { foo: { not: 125 } })).to.be.true;
                expect(dbp.objectMatchesCriteria(Test.new({ foo: 123, bar: 321 }), Test, { foo: { not: 123 } })).to.be.false;
            });
        });
    });
})