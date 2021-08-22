import { expect } from "chai";
import { suite } from "razmin";
import { Attribute, Model, Reference } from ".";
import { Database, DatabaseProvider } from "../config";
import { Collection } from "./collection";
import { Generate } from "./generate";

suite(describe => {
    describe ('@Generate()', it => {
        it('should run generate while saving', async () => {
            let observed : string;

            class Test extends Model {
                @Generate({ type: 'uuid' }) id : string;
                static database(): Database {
                    let provider : DatabaseProvider = {
                        async resolveCollection<T>(collection : Collection<T>) : Promise<T[]> {
                            return [];
                        },
                        async resolveReference<T>(reference : Reference<T>) : Promise<T> {
                            return null;
                        },
                        async persist<T extends Model>(instance : T): Promise<void> {
                            observed = instance['id']
                        }
                    }

                    return new Database('fake', true, provider);
                }
            }

            let test = Test.new();

            expect(test.id).not.to.exist;
            await test.save();
            expect(observed).to.exist.and.to.equal(test.id);
        });
        it('should run generate while creating a new instance', async () => {
            class Test extends Model {
                @Generate({ type: 'uuid', on: 'new' }) id : string;
            }

            let test = Test.new();
            let test2 = Test.new();

            expect(test.id).to.exist;
            expect(test2.id).to.exist;
            expect(test.id).not.to.equal(test2.id);
        });
        it('should work alongside @Attribute()', async () => {
            let observed : string;

            class Test extends Model {
                @Generate({ type: 'uuid' }) @Attribute() id : string;
                static database(): Database {
                    let provider : DatabaseProvider = {
                        async resolveCollection<T>(collection : Collection<T>) : Promise<T[]> {
                            return [];
                        },
                        async resolveReference<T>(reference : Reference<T>) : Promise<T> {
                            return null;
                        },
                        async persist<T extends Model>(instance : T): Promise<void> {
                            observed = instance.getAttribute('id');
                        }
                    }

                    return new Database('fake', true, provider);
                }
            }

            let test = Test.new();

            expect(test.id).not.to.exist;
            await test.save();
            expect(observed).to.exist.and.to.equal(test.id);
            expect(test.id).to.equal(test.getAttribute('id'));
        });
    });
})