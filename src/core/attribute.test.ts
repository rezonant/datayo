import { expect } from "chai";
import { suite } from "razmin";
import { Model } from ".";
import { Attribute } from "./attribute";

suite(describe => {
    describe('@Attribute()', it => {
        it('should wrap getAttribute()/setAttribute()', () => {
            class Test extends Model {
                @Attribute() foobar : number;
            }

            let test = Test.new();

            expect(test.hasAttributeValue('foobar')).to.equal(false);
            test.foobar = 123;
            expect(test.hasAttributeValue('foobar')).to.equal(true);
            expect(test.getAttribute('foobar')).to.equal(123);
        });

        it('should register its attribute definition', () => {
            class Test extends Model {
                @Attribute() foobar : number;
            }

            expect(Test.attributeDefinitions.length).to.equal(1);
            expect(Test.attributeDefinitions[0].name).to.equal('foobar');
            expect(Test.attributeDefinitions[0].designType).to.equal(Number);

            expect(Test.attributes.foobar).to.exist;
            expect(Test.attributes.foobar.name).to.equal('foobar');
            expect(Test.attributes.foobar.designType).to.equal(Number);
        });

        it('should pass primaryKey into the attribute definition', () => {
            class Test extends Model {
                @Attribute() defaultPrimary : number;
                @Attribute({ primaryKey: true }) primary : number;
                @Attribute({ primaryKey: false }) notPrimary : number;
            }

            expect(Test.attributes.defaultPrimary.primaryKey).to.be.false;
            expect(Test.attributes.primary.primaryKey).to.be.true;
            expect(Test.attributes.notPrimary.primaryKey).to.be.false;
        });
    });
});