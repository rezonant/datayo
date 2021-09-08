# datayo [![CircleCI](https://circleci.com/gh/rezonant/datayo/tree/main.svg?style=svg)](https://circleci.com/gh/rezonant/datayo/tree/main)

> ⚠ **Alpha Quality**  
> This library is **Alpha quality** in the `0.0.x` series (no automatic updates 
> by semver). Using this library in its current iteration may result in data loss. 
> **It is critical that you do not use this library for use cases where data loss 
> is unacceptable.** No warranty of any kind is provided, please see LICENSE for details.
> We welcome PRs for fixes and smaller features/improvements,
> but development of the library is happening very quickly.

_An ActiveRecord-inspired ORM for Typescript_

## Introduction

Datayo aims to provide a Typescript-native ORM experience using the Active Record pattern,
inspired by the ActiveRecord library provided in Ruby on Rails. It is a spiritual port of that library in the same sense that Doctrine is a spiritual port of Hibernate from Java to PHP.

## Models

The core functionality of Datayo is exposed by declaring a class which extends `Model`. Instances
of such classes can participate in persistence using a number of persistence plugins. Model classes
have a number of properties marked as "attributes" which are stored by the underlying persistence 
plugin. 

For instance:

```typescript
export class Phrase extends Model {
    @Attribute() type : 'proverb' | 'spiritual' | 'practical';
    @Attribute() message : string;
}
```

Given the above model, you can persist a new `Phrase` via:

```typescript
let phrase = await Phrase.create({ 
    type: 'proverb',
    message: 'An apple a day keeps the doctor away' 
});
```

You can then query for practical phrases with:

```typescript
let phrases = await Phrase.where({ type: 'proverb' });
```

Here `phrases` will contain all matching phrases which have `type` set to `'proverb'`.

You can limit, offset, and order such a query:

```typescript
let phrases = await Phrase.where({ type: 'proverb' }).orderBy({ message: 'asc' }).limit(2).offset(3);
```

Here `phrases` will be `Phrase[]` which has a maximum length of `2` containing the 3rd and 4th phrases when ordering the list by the `message` alphabetically (ascending).

## Constructing Instances

You construct new (initially unpersisted) instances of model classes using the `new()` method. You should not use the object constructor directly as this does not allow the initialization lifecycle to run. Model classes should _always_ have a single bare parameterless constructor which does nothing more than prepare the object. In almost all cases you should not declare your own constructor (see `init()` below). The `new()` method can optionally receive an object containing properties that should be set on the new instance, for instance:

```typescript
let phrase = Phrase.new({ message: 'He who stands on toilet is high on pot' })
```

## Initializing Instances (`init()`)

When a new instance of a Model is constructed by Datayo (or via `new()`), the `init()` method is called after the relevant lifecycle methods of the model instance have been run. If you want to run code when a new instance of your class is created, you should override `init()`. 

## Persisting an Instance

After a new unpersisted Model instance is created, you can persist it to be retrieved later by calling `save()`. 

```typescript
await phrase.save();
```

After this operation completes, any attributes generated by the persistence layer (such as auto generated IDs, UUIDs, dates, etc) will be automatically applied on to the instance.

## Creating and Persisting an Instance in One Shot

The `create()` method lets you create a new instance and immediately persist it as if you had invoked `save()`.

```typescript
let phrase = Phrase.create({ message: 'All dogs go to heaven' });
```

## Collections

The core querying logic of Datayo is captured by the `Collection<Model, Criteria>` class. Whenever Datayo exposes more than a single object it is done via `Collection`. You typically do not directly construct instances of `Collection`, instead such instances are provided to you by static methods of the `Model` class. Examples of static methods that provide `Collection` include `.all()`, `.where({ ... })`, `.limit(N)` etc. Most such static methods are also instance methods on `Collection` allowing you to chain them.

## Resolving Collections

Collections can be in one of two states: unresolved or resolved. An unresolved collection will contact the persistence backend to resolve itself, and a resolved collection will always return its cached resolution. This is similar to a `Promise`, and in fact collections can be treated directly like `Promise`, despite being objects with their own methods:

```typescript
let ordered = await Phrase.orderBy('message', 'asc');
let allOrdered = await ordered;
let firstTwo = await ordered.limit(2);
```

Once an instance of `Collection` is resolved, it will always return the same result if it is awaited in the future, unless `reload()` is used:

```typescript
let collection = await Phrase.all();
let results1a = await collection;
let results1b = await collection;
// here the content of `results1a/b` will be identical

// (persisted collection is modified elsewhere)

let results2 = await collection.reload();
// here the content of `results1a/b` may differ from `results2`
```

## Collections (and the criteria that define them) are immutable

Modifying a collection using a criteria method will produce a _new_ collection which 
does not share the same resolution state as its parent.

```typescript
let collection = Phrase.all();
let results1 = await collection;
let collection2 = collection.limit(2);
let results2 = await collection2;

// here collection/collection2 are distinct objects with distinct resolution states.
// results1 will not necessarily have the same content as results2 
```

To put it another way, the following will not result in a limited result set, instead returning _all_ results:

```typescript
let collection = Phrase.all();
collection.limit(2);
let result = await collection
```

This is because the `.limit()` method _returns a new collection_ which contains the "limit 2" criteria- the original collection is unmodified. Thus the above call to `.limit()` has no effect.

Understanding the basics of collections is important for working with the library in more complex use cases, such as those described below.

## Attributes

Models are regular Javascript objects, but they contain a special set of property values called "attributes" which are specially tracked. The only values that are guaranteed to persist between multiple copies of a single persisted model instance are properties that are marked as attributes.

> **Important**: Properties defined on an object which are not marked as attributes will be ignored when saving and fetching the object from the persistence backend.

You mark a property as an attribute using the `@Attribute()` decorator. When you do this, the property is replaced with a getter/setter combo that handles keeping the internal attribute state up to date with your assignments. This includes tracking whether the attribute value has changed as you work with the object and conforming values to the intended design type that you have specified.

First, consider this example:

```typescript
import { Model, Attribute } from 'datayo';
import { expect } from 'chai';

class Phrase extends Model { 
    @Attribute() message : string;
    @Attribute() type : string;
}

let phrase = Phrase.new({ message: 'When life gives you lemons, make lemonade' });

// All unpersisted objects are considered "changed", as well as any
// attributes changed since the object was last persisted (in this case, never)

expect(phrase.isChanged()).to.be.true;
expect(phrase.isAttributeChanged('message')).to.be.true;
expect(phrase.isAttributeChanged('type')).to.be.false;

// If we save the model instance, it will be marked as unchanged since all changes
// have been persisted

await phrase.save();

expect(phrase.isChanged()).to.be.false;
expect(phrase.isAttributeChanged('message')).to.be.false;
expect(phrase.isAttributeChanged('type')).to.be.false;

// If we then modify "message"...

phrase.message = 'A fish always rots from the head down';

// The change to that property is tracked

expect(phrase.isChanged()).to.be.true;
expect(phrase.isAttributeChanged('message')).to.be.true;
expect(phrase.isAttributeChanged('type')).to.be.false;

// Furthermore, the value set to the property is "coerced" to the proper value.
// This ensures that persistence backends that are untyped are handled correctly

phrase.message = 123;
expect(phrase.message).to.equal('123'); // because the design type of this attribute is String
```

Attributes typically correspond with properties, but not always. This is particularly the case when using Relations. See below.

## Relations

Datayo supports creating rich relationships between model types. For instance, consider a model for a novel author:

```typescript
import { Model } from 'datayo';

export class Author extends Model {
    @Id() id : number;
    @Attribute() name : string;
    @Relation() books = HasMany(Book);
}
```

You may then declare a class to hold books written by the author:

```typescript
import { Model } from 'datayo';

export class Book extends Model {
    @Id() id : number;
    @Relation() author = BelongsTo(Author);
}
```

Here, when using the PostgreSQL persistence backend, the `Author` class represents 
rows of the `authors` table, and the `Book` class represents rows of the `books` table.

The `Book` class expects to store the primary key of `Author` in an `authorId` column,
and the `Author` class understands that it can find books belonging to a particular author 
by looking up those with a matching `authorId`. 

Note that `authorId` is not explicitly specified within these classes; the library understands that `authorId` is the linking column via _convention_. This is a familiar pattern in the Ruby on Rails world, where the ActiveRecord library infers similar facts based on the conventions of the library.

You are free to override the conventions by configuring the relevant relations. For instance, if you want to use the property `ownerId` on the `Book` class you may do so:

```typescript
import { Model } from 'datayo';

export class Author extends Model {
    @Id() id : number;
    @Relation() books = HasMany(Book).via('ownerId');
}

export class Book extends Model {
    @Id() id : number;
    @Relation() author = BelongsTo(Author).via('ownerId');
}
```

In the above example, we've specified that the linking column is `ownerId` on both models.


## Manipulating Relations

You can then use these "relation" properties to manipulate instances of the object:

## Composite Primary Keys

One place where Datayo differs from ActiveRecord is that composite primary keys are fully supported. This has some implications for how you interact with Datayo when specifying primary keys. Take for instance this example:

```typescript
export class Author extends Model {
    @Id() id : number;
    @Relation() books = HasMany(Book).via({ authorCountry: 'country', authorName: 'name' });
}

export class Book extends Model {
    @Id() id : number;
    @Relation() author = BelongsTo(Author).via({ authorCountry: 'country', authorName: 'name' })
}
```

In this case, it is expected that `Book` has both `authorCountry` and `authorName` attributes, and that the related `Author` can be identified by locating an `Author` which has a `country` attribute matching `Book#authorCountry` and a `name` attribute matching `Book#authorName`. As you modify the author associated with a `Book` Datayo will automatically keep `authorCountry` and `authorName` up to date to match, and the same is true when you add a new `Book` to the `books` collection via the `Author` instance.

When specifying the relationship between composite foreign keys and composite primary keys using Datayo, you always specify the foreign key name as the "key" of the property and the primary key name as the "value" of the property. This consistency needs to be internalized to use the library without error, but the consistency helps ensure that once the rule is understood and well executed mistakes are minimized.