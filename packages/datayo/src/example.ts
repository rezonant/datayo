import "reflect-metadata";
import { Attribute, Id } from "./core/attribute";
import { Model } from "./core/model";
import { BelongsTo, HasMany, HasOne, Relation } from "./core/relations";


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

export class User extends Model {
    @Id() id : string;
    @Relation() blog = HasOne(Blog);
}

export class Post extends Model {
    @Id() id : string;
    @Attribute() postName : string;
    @Relation() blog = BelongsTo(Blog);
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

async function main() {
    let blog : Blog;

    Blog.where({ name: { includes: 'foo' }})

    Blog.all()
        .join('blog2')
        .with(Post, 'post', { on: { blog: 'blog2' } })
        .where({ 
            blog2: {
                
            }
        })
    ;

    console.dir('hello');
}

main();