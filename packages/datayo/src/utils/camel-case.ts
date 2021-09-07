export function lowerCamelCase(name : string) {
    if (!name)
        return name;
    
    return name[0].toLowerCase() + name.slice(1);
}

export function upperCamelCase(name : string) {
    if (!name)
        return name;
    
    return name[0].toUpperCase() + name.slice(1);
}