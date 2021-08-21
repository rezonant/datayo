import "reflect-metadata";
import { Attribute, HasMany, HasOne } from "./decorators";
import { Model, ModelOptions } from "./model";
import { Collection, Reference } from "./relation";

export class Post {

}

export class User {

}

export class Blog extends Model {
    @Attribute() posts = HasMany(Post);
    @Attribute() author = HasOne(User);

    static foo() {
        return 123;
    }
}

export class Frog extends Model {
    @Attribute() legs = HasMany(Post);
    @Attribute() other = HasOne(User);
}

async function main() {
    let blogSchema = Blog.attributes;
    let frogSchema = Frog.attributes;

    console.dir('hello');
}

main();