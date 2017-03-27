import * as _ from 'lodash';
import * as fs from 'fs-promise';

let Parser = require('binary-parser').Parser;
import {parsers} from '../parsers/metadata';

export default class StringsModifier {
    metadatas: any;
    strings: any[];
    content: Buffer;

    constructor(metadatas: any) {
        this.metadatas = metadatas;
    }

    load(data) {
        this.content = Buffer.from(data);

        let count = this.metadatas.header.stringLiteralCount / parsers.il2CppStringLiteral.sizeOf();
        let litterals = parsers.getLitteralsParser(count)
                            .parse(data.slice(this.metadatas.header.stringLiteralOffset));

        this.strings = [];
        _.each(litterals, litteral => {
            let start = this.metadatas.header.stringLiteralDataOffset + litteral.dataIndex;
            let str = data.slice(start, start + litteral.length).toString('utf8');
            this.strings.push({
                start: start,
                end: start + litteral.length,
                length: litteral.length,
                value: str,
            });
        });
    }

    modify() {
        _.each(this.strings, str => {
            if (_.startsWith(str.value, 'https://sso.pokemon.com')) {
                let newstr = str.value.replace('https://', 'http://') + '#';
                this.content.fill(Buffer.from(newstr, 'utf8'), str.start, str.end);
            }
        });
    }

    async save(filename: string) {
        await fs.writeFile(filename, this.content);
    }
}