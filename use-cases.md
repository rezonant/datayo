# Record as a Session

```typescript
class Page extends Model {
    @Relation() book = BelongsTo(Book);
}

class Book extends Model {
    @Relation() pages = HasMany(Page);
}

let aBook = await Book.create();
let page = Page.new();

aBook.pages.add(page);

expect(book.isChanged()).to.be.true;
expect(page.isPersisted()).to.be.false;

await aBook.save(); // saves the Book, and then the new Page.

expect(page.isPersisted()).to.be.true;

aBook.pages.remove(page);
await aBoo.save(); // removes the page
```

# Save Parent record to save Children records

```typescript
class Page extends Model {
    @Relation() book = BelongsTo(Book);
    @Attribute() pageNumber : number;
}

class Book extends Model {
    @Relation() pages = HasMany(Page);
}

let aBook = await Book.first();
let aPage = await aBook.pages.first();

aPage.number = 123;

aBook.save(); // saves aPage
```

# Change out two pages


```typescript
class Page extends Model {
    @Relation() book = BelongsTo(Book);
    @Attribute() pageNumber : number;
}

class Book extends Model {
    @Relation() pages = HasMany(Page);
}

let aBook = await Book.first();
let aPage = await aBook.pages.first();

aBook.pages.remove(aPage);
aBook.pages.add(Page.new({ pageNumber: 4 }));
```