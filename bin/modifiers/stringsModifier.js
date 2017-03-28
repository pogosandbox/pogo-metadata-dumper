"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
const fs = require("fs-promise");
let Parser = require('binary-parser').Parser;
const metadata_1 = require("../parsers/metadata");
class StringsModifier {
    constructor(metadatas) {
        this.metadatas = metadatas;
    }
    load(data) {
        this.content = Buffer.from(data);
        let count = this.metadatas.header.stringLiteralCount / metadata_1.parsers.il2CppStringLiteral.sizeOf();
        let litterals = metadata_1.parsers.getLitteralsParser(count)
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
                lengthOffset += metadata_1.parsers.il2CppStringLiteral.sizeOf() * idx;
                this.content.writeInt32LE(newBuf.length, lengthOffset);
            }
        });
    }
    save(filename) {
        return __awaiter(this, void 0, void 0, function* () {
            yield fs.writeFile(filename, this.content);
        });
    }
}
exports.default = StringsModifier;
//# sourceMappingURL=stringsModifier.js.map