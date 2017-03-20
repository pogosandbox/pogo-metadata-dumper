import * as fs from 'fs-promise';

let elfy = require('elfy');

export default class ElfParser {
    constructor() {};

    async load(file: string) {
        let content = await fs.readFile(file);
        let elf = elfy.parse(content);
        console.log(elf);
    }
}
