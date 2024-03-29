import { describe } from "razmin";
import { mint, mintOne } from "./mint";
import { Attribute, Model } from ".";
import { expect } from "chai";

describe('mint()', it => {
    it('makes a copy of the passed model instance', () => {
        class Book extends Model {
            @Attribute() name : string;
        }

        let book = Book.new({ name: 'foo' });
        let minted = mintOne(book);

        expect(book).not.to.equal(minted);
        expect(book.$instanceId).to.equal(minted.$instanceId);
        expect(book.name).to.equal(minted.name);
    });
    it('returns a model which is marked unchanged', () => {
        class Book extends Model {
            @Attribute() name : string;
        }

        let book = Book.new({ name: 'foo' });
        expect(book.isChanged()).to.be.true;
        let minted = mintOne(book);

        expect(minted.isChanged()).to.be.false;
    });
});