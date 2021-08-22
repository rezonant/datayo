import "reflect-metadata";
import { Attribute, Id } from "./core/attribute";
import { Model } from "./core/model";
import { BelongsTo, HasMany, HasOne, Relation } from "./core/relations";

export class Post extends Model {
    @Id() id : string;
}

export class User extends Model {
    @Id() id : string;
    @Relation() blog = HasOne(Blog);
}

export class Blog extends Model {
    @Relation() posts = HasMany(Post);
    @Relation() author = BelongsTo(User);
    @Attribute() hits : number;
    @Attribute() name : string;

    static foo() {
        return 123;
    }
}

export class FrogLeg extends Model {
    @Id() id : string;
}

export class FrogArm extends Model {
    @Id() id : string;
}

export class Frog extends Model {
    @Attribute() legs = HasMany(FrogLeg);
    @Attribute() arms = HasOne(FrogArm);
}

async function main() {
    let blog : Blog;

    Blog.where({ name: { includes: 'foo' }})

    //Blog.all().join(Frog, { on: {  } });
    console.dir('hello');
}

main();