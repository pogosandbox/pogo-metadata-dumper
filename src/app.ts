import * as fs from 'fs-promise';
import * as _ from 'lodash';

let Parser = require('binary-parser').Parser;
import {parsers} from './parser';

async function DumpStringLitterals(data: Buffer, header: any, file: string) {
    let litteralsParser = new Parser()
        .array('litterals', {
            type: parsers.il2CppStringLiteral,
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
}

async function DumpMethods(data: Buffer, header: any, file: string) {
    console.log('Offset: ' + header.methodsOffset);
    console.log('Count: ' + header.methodsCount);
    let methodsParser = new Parser()
        .array('', {
            type: parsers.il2CppMethodDefinition,
            length: header.methodsCount / (12*4+4*2), // divide by size of one element
        });

    console.log('String Offset: ' + header.stringOffset);
    let stringsParser = new Parser()
        .array('', {
            type: (new Parser()).string('', {zeroTerminated: true}),
            length: header.stringCount,
        });
    

    let methods = methodsParser.parse(data.slice(header.methodsOffset));
    console.log(methods.slice(0, 5));
    _.each(methods, method => {
        // method.nameIndex
        
    });
}

async function Main() {
    let data = await fs.readFile('data/global-metadata.dat');
    console.log('Data length: ' + data.length);

    let header = parsers.il2CppGlobalMetadataHeader.parse(data);
    if (header.sanity.toString(16) !== 'fab11baf') throw new Error('Incorrect sanity.');
    console.log('Metadata version: ' + header.version); // 21 ?

    // await DumpStringLitterals(data, header, 'data/string.litterals.txt');

    await DumpMethods(data, header, 'data/methods.txt');
}

Main()
.then(() => console.log('Done.'))
.catch(e => console.error(e));
