import * as fs from 'fs-promise';
import * as _ from 'lodash';

let Parser = require('binary-parser').Parser;
import {parsers} from './parser';

let metadatas = {
    header: null,
    strings: null,
    types: null,
    methods: null,
}

async function ExtractStringLitterals(data: Buffer, file: string) {
    let litteralsParser = new Parser()
        .array('litterals', {
            type: parsers.il2CppStringLiteral,
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
}

function GetString(data: Buffer, index: number): string {
    let raw = data.slice(metadatas.header.stringOffset + index);
    return (new Parser()).string('str', {zeroTerminated: true}).parse(raw).str;
}

async function ExtractTypes(data: Buffer, file: string) {
    let typesCount = metadatas.header.typeDefinitionsCount / (26 * 4 + 8 * 2);
    console.log('Types Count: ' + typesCount);

    let typesParser = new Parser()
        .array('', {
            type: parsers.il2CppTypeDefinition,
            length: typesCount,
        });

    let rawTypes: any[] = typesParser.parse(data.slice(metadatas.header.typeDefinitionsOffset));

    console.log(rawTypes.slice(0, 5));

    metadatas.types = _.map(rawTypes, type => {
        return {
            name: GetString(data, type.nameIndex),
            methods: metadatas.methods.slice(type.methodStart, type.methodStart + type.method_count),
        }
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
}

async function ExtractMethods(data: Buffer) {
    let methodsParser = new Parser()
        .array('', {
            type: parsers.il2CppMethodDefinition,
            length: metadatas.header.methodsCount / (12 * 4 + 4 * 2), // divide by size of one element
        });

    let methods: any[] = methodsParser.parse(data.slice(metadatas.header.methodsOffset));
    metadatas.methods = _.map(methods, method => GetString(data, method.nameIndex));

    // console.log(methods.slice(0, 5));

    console.log(metadatas.methods.length + ' methods extracted.');
}

async function Main() {
    let data = await fs.readFile('data/global-metadata.dat');
    console.log('Data length: ' + data.length);

    metadatas.header = parsers.il2CppGlobalMetadataHeader.parse(data);
    if (metadatas.header.sanity.toString(16) !== 'fab11baf') throw new Error('Incorrect sanity.');
    console.log('Metadata version: ' + metadatas.header.version);

    await ExtractStringLitterals(data, 'data/string.litterals.txt');

    await ExtractMethods(data);

    await ExtractTypes(data, 'data/types.txt');
}

Main()
.then(() => console.log('Done.'))
.catch(e => console.error(e));
