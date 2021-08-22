import { expect } from "chai";
import { suite } from "razmin";
import { Attribute, Model, Reference } from ".";
import { Database, DatabaseProvider } from "../config";
import { Collection } from "./collection";
import { resolveReference } from "./resolvers";

suite(describe => {
    describe('Model', it => {
        it('correctly handles attributes', () => {
            class Book extends Model {
                @Attribute() name : string;
            }

            let book = Book.new({ name: 'foo' });
            expect(book.name).to.equal('foo');
        });
        it('should produce the correct primaryKey definition', () => {
            class Book extends Model {
                @Attribute({ primaryKey: true }) id : number;
                @Attribute({ primaryKey: true }) customerId : number;
                @Attribute() name : string;
            }

            let id = Book.primaryKey.find(x => x.name === 'id');
            let customerId = Book.primaryKey.find(x => x.name === 'customerId');

            expect(Book.primaryKey.length).to.equal(2);
            expect(id).to.exist;
            expect(customerId).to.exist;
        })
        it('should produce the correct primaryKey on an instance', () => {
            class Book extends Model {
                @Attribute({ primaryKey: true }) id : number;
                @Attribute({ primaryKey: true }) customerId : number;
                @Attribute() name : string;
            }

            let book = Book.new();

            book.id = 123;
            book.customerId = 321;
            
            expect(book.primaryCriteria().id).to.equal(123);
            expect(book.primaryCriteria().customerId).to.equal(321);
            expect(Object.keys(book.primaryCriteria()).length).to.equal(2);
        })
        describe ('hooks', it => {
            it('should run onNewInstance before calling init', () => {
                let log = '';

                class Test extends Model {
                    init() {
                        log += 'i';
                    }
                }

                Test.onNewInstance().subscribe(() => log += 'h');
                Test.new();

                expect(log).to.equal('hi');
            })
            it('should run hooks while saving', async () => {
                let log = '';
                class Test extends Model {
                    static database(): Database {
                        let provider : DatabaseProvider = {
                            async resolveCollection<T>(collection : Collection<T>) : Promise<T[]> {
                                return [];
                            },
                            async resolveReference<T>(reference : Reference<T>) : Promise<T> {
                                return null;
                            },
                            async persist<T extends Model>(instance : T): Promise<void> {
                                log += '(p)';
                            }
                        }

                        return new Database('fake', true, provider);
                    }
                }

                let test = Test.new();
                test.lifecycle().beforeSaving.subscribe(() => log += 'bS');
                test.lifecycle().beforePersisting.subscribe(() => log += 'bP');
                test.lifecycle().afterSaving.subscribe(() => log += 'aS');
                test.lifecycle().afterPersisting.subscribe(() => log += 'aP');
                await test.save();

                expect(log).to.equal('bPbS(p)aPaS');
            });
            it('should call onNewInstance for all new instances', () => {
                let log = '';
                class Test extends Model {}

                Test.onNewInstance().subscribe(i => log += 'n');

                Test.new();
                Test.new();
                Test.new();

                expect(log).to.equal('nnn');
            });
            it('should have independent onNewInstance() observables for each class', () => {
                class Test extends Model {}
                class Test2 extends Model {}

                expect(Test.onNewInstance()).not.to.equal(Test2.onNewInstance());
            });
            it('should have independent onNewInstance() observables for each subclass', () => {
                class Test extends Model {}
                class Test2 extends Test {}

                expect(Test.onNewInstance()).not.to.equal(Test2.onNewInstance());
            });

            it('should have independent onNewInstance() subscription sets for each class', () => {
                let log = '';
                class Test extends Model {}
                class Test2 extends Model {}

                Test.onNewInstance().subscribe(i => log += '1');
                Test2.onNewInstance().subscribe(i => log += '2');

                Test.new();
                Test2.new();
                Test.new();
                Test2.new();

                expect(log).to.equal('1212');
            });
            it('should call hook() callback for all new instances', () => {
                let log = '';
                class Test extends Model {}

                Test.hook(i => log += 'n');

                Test.new();
                Test.new();
                Test.new();

                expect(log).to.equal('nnn');
            });
            it('should have independent hook()s for each class', () => {
                let log = '';
                class Test extends Model {}
                class Test2 extends Model {}

                Test.hook(i => log += '1');
                Test2.hook(i => log += '2');

                Test.new();
                Test2.new();
                Test.new();
                Test2.new();

                expect(log).to.equal('1212');
            });
            it('should pass the instance in to onNewInstance/hook callback each time', () => {
                let instances = [];
                class Test extends Model {}

                Test.hook(i => instances.push(i));

                let instances2 = [];
                instances2.push(Test.new());
                instances2.push(Test.new());
                instances2.push(Test.new());

                expect(instances[0]).to.equal(instances[0]);
                expect(instances[1]).to.equal(instances[1]);
                expect(instances[2]).to.equal(instances[2]);
            });
        });
    });
})