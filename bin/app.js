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
const fs = require("fs-promise");
const _ = require("lodash");
let Parser = require('binary-parser').Parser;
const parser_1 = require("./parser");
function DumpStringLitterals(data, header, file) {
    return __awaiter(this, void 0, void 0, function* () {
        let litteralsParser = new Parser()
            .array('litterals', {
            type: parser_1.parsers.il2CppStringLiteral,
            length: header.stringLiteralCount / 8 // sizeof each element
        });
        let litterals = litteralsParser.parse(data.slice(header.stringLiteralOffset)).litterals;
        let stream = fs.createWriteStream(file, 'utf8');
        _.each(litterals, (litteral, idx) => {
            let start = header.stringLiteralDataOffset + litteral.dataIndex;
            stream.write(data.slice(start, start + litteral.length).toString('utf8') + '\r\n');
        });
        stream.end();
        console.log(litterals.length + ' strings extracted.');
    });
}
function DumpMethods(data, header, file) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Offset: ' + header.methodsOffset);
        console.log('Count: ' + header.methodsCount);
        let methodsParser = new Parser()
            .array('', {
            type: parser_1.parsers.il2CppMethodDefinition,
            length: header.methodsCount / (12 * 4 + 4 * 2),
        });
        console.log('String Offset: ' + header.stringOffset);
        let stringsParser = new Parser()
            .array('', {
            type: (new Parser()).string('', { zeroTerminated: true }),
            length: header.stringCount,
        });
        let methods = methodsParser.parse(data.slice(header.methodsOffset));
        console.log(methods.slice(0, 5));
        _.each(methods, method => {
            // method.nameIndex
        });
    });
}
function Main() {
    return __awaiter(this, void 0, void 0, function* () {
        let data = yield fs.readFile('data/global-metadata.dat');
        console.log('Data length: ' + data.length);
        let header = parser_1.parsers.il2CppGlobalMetadataHeader.parse(data);
        if (header.sanity.toString(16) !== 'fab11baf')
            throw new Error('Incorrect sanity.');
        console.log('Metadata version: ' + header.version); // 21 ?
        // await DumpStringLitterals(data, header, 'data/string.litterals.txt');
        yield DumpMethods(data, header, 'data/methods.txt');
    });
}
Main()
    .then(() => console.log('Done.'))
    .catch(e => console.error(e));
//# sourceMappingURL=app.js.map