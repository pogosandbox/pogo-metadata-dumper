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
        _.each(this.strings, (str, idx) => {
            if (_.startsWith(str.value, 'https://sso.pokemon.com') || str.value === 'https://' || str.value === 'https://{0}/{1}') {
                let newstr = str.value.replace('https://', 'http://');
                let newBuf = Buffer.from(newstr, 'utf8');
                this.content.fill(newBuf, str.start, str.end);

                let lengthOffset = this.metadatas.header.stringLiteralOffset;
                lengthOffset += parsers.il2CppStringLiteral.sizeOf() * idx;
                this.content.writeInt32LE(newBuf.length, lengthOffset);
            }
        });
    }

    async save(filename: string) {
        await fs.writeFile(filename, this.content);
    }
}