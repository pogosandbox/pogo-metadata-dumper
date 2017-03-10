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
let metadatas = {
    header: null,
    strings: null,
    types: null,
    methods: null,
};
function ExtractStringLitterals(data, file) {
    return __awaiter(this, void 0, void 0, function* () {
        let litteralsParser = new Parser()
            .array('litterals', {
            type: parser_1.parsers.il2CppStringLiteral,
            length: metadatas.header.stringLiteralCount / 8 // sizeof each element
        });
        let litterals = litteralsParser.parse(data.slice(metadatas.header.stringLiteralOffset)).litterals;
        let stream = fs.createWriteStream(file, 'utf8');
        _.each(litterals, litteral => {
            let start = metadatas.header.stringLiteralDataOffset + litteral.dataIndex;
            stream.write(data.slice(start, start + litteral.length).toString('utf8') + '\r\n');
        });
        stream.end();
        console.log(litterals.length + ' string litterals extracted.');
    });
}
function GetString(data, index) {
    let raw = data.slice(metadatas.header.stringOffset + index);
    return (new Parser()).string('str', { zeroTerminated: true }).parse(raw).str;
}
// async function ExtractStrings(data: Buffer, file: string) {
//     console.log('Strings Count: ' + metadatas.header.stringCount);
//     let stringsParser = new Parser()
//         .array('strings', {
//             type: (new Parser()).string('', {zeroTerminated: true}),
//             length: metadatas.header.stringCount,
//         });
//     metadatas.strings = stringsParser.parse(data.slice(metadatas.header.stringOffset)).strings;
//     let stream = fs.createWriteStream(file, 'utf8');
//     _.each(metadatas.strings, text => {
//         stream.write(text + '\r\n');
//     });
//     stream.end();
//     console.log(metadatas.strings.length + ' strings extracted.');
// }
function ExtractTypes(data, file) {
    return __awaiter(this, void 0, void 0, function* () {
        let typesCount = metadatas.header.typeDefinitionsCount / (26 * 4 + 8 * 2);
        console.log('Types Count: ' + typesCount);
        let typesParser = new Parser()
            .array('', {
            type: parser_1.parsers.il2CppTypeDefinition,
            length: typesCount,
        });
        let rawTypes = typesParser.parse(data.slice(metadatas.header.typeDefinitionsOffset));
        console.log(rawTypes.slice(0, 5));
        metadatas.types = _.map(rawTypes, type => {
            return {
                name: GetString(data, type.nameIndex),
                methods: metadatas.methods.slice(type.methodStart, type.methodStart + type.method_count),
            };
        });
        let stream = fs.createWriteStream(file, 'utf8');
        _.each(metadatas.types, type => {
            stream.write(type.name + '\r\n');
            _.each(type.methods, method => {
                stream.write('    ' + method + '\r\n');
            });
            stream.write('\r\n');
        });
        console.log(metadatas.types.length + ' types extracted.');
    });
}
function ExtractMethods(data) {
    return __awaiter(this, void 0, void 0, function* () {
        let methodsParser = new Parser()
            .array('', {
            type: parser_1.parsers.il2CppMethodDefinition,
            length: metadatas.header.methodsCount / (12 * 4 + 4 * 2),
        });
        let methods = methodsParser.parse(data.slice(metadatas.header.methodsOffset));
        metadatas.methods = _.map(methods, method => GetString(data, method.nameIndex));
        console.log(methods.slice(0, 5));
        // let stream = fs.createWriteStream(file, 'utf8');
        // _.each(metadatas.methods, method => {
        //     stream.write(method + '\r\n');
        // });
        console.log(metadatas.methods.length + ' methods extracted.');
    });
}
function Main() {
    return __awaiter(this, void 0, void 0, function* () {
        let data = yield fs.readFile('data/global-metadata.dat');
        console.log('Data length: ' + data.length);
        metadatas.header = parser_1.parsers.il2CppGlobalMetadataHeader.parse(data);
        if (metadatas.header.sanity.toString(16) !== 'fab11baf')
            throw new Error('Incorrect sanity.');
        console.log('Metadata version: ' + metadatas.header.version);
        // await ExtractStringLitterals(data, header, 'data/string.litterals.txt');
        yield ExtractMethods(data);
        yield ExtractTypes(data, 'data/types.txt');
    });
}
Main()
    .then(() => console.log('Done.'))
    .catch(e => console.error(e));
//# sourceMappingURL=app.js.map