import { suite } from "razmin";
import { Config, Database } from "./config";
import { Attribute, BelongsTo, HasMany, Model, ModelOptions, Relation } from "./core";
import { MemoryDatabaseProvider } from "./providers/memory";
import { expect } from 'chai';

suite(describe => {
    describe('integration:', it => {
        it('works', async () => {

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
    })
});