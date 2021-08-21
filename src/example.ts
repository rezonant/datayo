import "reflect-metadata";
import { Attribute, Id } from "./core/attributes";
import { Model } from "./core/model";
import { HasMany, HasOne } from "./core/relations";

export class Post extends Model {
    @Id() id : string;
}

export class User extends Model {
    @Id() id : string;
}

export class Blog extends Model {
    @Attribute() posts = HasMany(Post);
    @Attribute() author = HasOne(User);

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
    console.dir('hello');
}

main();