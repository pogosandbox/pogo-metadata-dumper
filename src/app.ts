import * as fs from 'fs-promise';
import * as _ from 'lodash';
// import * as logger from 'winston';

let Parser = require('binary-parser').Parser;

import {parsers} from './parser';
import ProtosGeneration from './protos';

// logger.remove(logger.transports.Console);
// logger.add(logger.transports.Console, {
//     'colorize': true,
//     'level': 'debug',
// });

let logger = {
    debug: console.log,
    info: console.log,
    error: console.error,
}

let metadatas = {
    header: null,
    strings: [],
    interfaces: [],
    types: [],
    methods: [],
}

function ExtractStringLitterals(data: Buffer, file: string) {
    logger.info('Begin extract string litterals...');

    let litterals = parsers.getLitteralsParser(metadatas.header.stringLiteralCount)
                        .parse(data.slice(metadatas.header.stringLiteralOffset));

    let stream = fs.createWriteStream(file, 'utf8');
    _.each(litterals, litteral => {
        let start = metadatas.header.stringLiteralDataOffset + litteral.dataIndex;
        stream.write(data.slice(start, start + litteral.length).toString('utf8') + '\r\n');
    });
    stream.end();

    logger.info('  ' + litterals.length + ' string litterals extracted.');
}

function GetString(data: Buffer, index: number): string {
    let raw = data.slice(metadatas.header.stringOffset + index);
    return parsers.string.parse(raw);
}

function ExtractInterfaces(data: Buffer) {
    logger.info('Begin extract interfaces...');

    let interfacesCount = metadatas.header.interfacesCount / (26 * 4 + 8 * 2);
    metadatas.interfaces = parsers.getTypesParser(interfacesCount)
                            .parse(data.slice(metadatas.header.interfacesOffset));

    logger.info('  extract name and methods...');
    _.each(metadatas.interfaces, type => {
        type.name = GetString(data, type.nameIndex);
        type.interfaces = [];
        type.methods = metadatas.methods.slice(type.methodStart, type.methodStart + type.method_count);
    });

    logger.info('  ' + metadatas.interfaces.length + ' interfaces extracted.');
}

function ExtractTypes(data: Buffer, file: string) {
    logger.info('Begin extract types...');

    let typesCount = metadatas.header.typeDefinitionsCount / (26 * 4 + 8 * 2);
    metadatas.types = parsers.getTypesParser(typesCount)
                            .parse(data.slice(metadatas.header.typeDefinitionsOffset));

    logger.info('  extract name and methods...');
    _.each(metadatas.types, type => {
        type.name = GetString(data, type.nameIndex);
        type.nameSpace = GetString(data, type.namespaceIndex);
        type.interfaces = [];
        type.methods = metadatas.methods.slice(type.methodStart, type.methodStart + type.method_count);
    });

    // logger.info('  extract nested types...');
    // _.each(metadatas.types, type => {
    //     if (type.nested_type_count > 0) {
    //         type.nestedTypes = metadatas.types.slice(type.nestedTypesStart, type.nestedTypesStart + type.nested_type_count)
    //     } else {
    //         type.nestedTypes = [];
    //     }
    // });

    logger.info('  extract more infos...');
    _.each(metadatas.types, type => {
        if (type.parentIndex >= 0) {
            type.parent = metadatas.types[type.parentIndex];
        }
        if (type.interfaces_count > 0) {
            // let rawInterfaces: any[] = parsers.getTypesParser(type.interfaces_count)
            //     .parse(data.slice(metadatas.header.interfacesOffset + type.interfacesStart * (26 * 4 + 8 * 2)));
            // type.interfaces = _.map(rawInterfaces, i => {
            //     let interf = _.find(metadatas.types, t => t.nameIndex === i.nameIndex);
            //     if (!interf) {
            //         interf = i;
            //         interf.name = GetString(data, interf.nameIndex);
            //     }
            //     return interf;
            // });
            type.interfaces = []; // metadatas.interfaces.slice(type.interfacesStart, type.interfacesStart + type.interfaces_count);
        } else {
            type.interfaces = [];
        }
    });

    logger.info('  saving to text...');
    let stream = fs.createWriteStream(file, 'utf8');
    _.each(metadatas.types, type => {
        stream.write(type.nameSpace + '.' + type.name);
        if (type.parent) {
            stream.write(' extends ' + type.parent.name);
        }
        // if (type.nestedTypes.length > 0) {
        //     stream.write(' extends ');
        //     _.each(type.nestedTypes, nested => {
        //         stream.write(nested.name + ' ');
        //     });
        // }
        if (type.interfaces.length > 0) {
            stream.write(' implements ');
            _.each(type.interfaces, i => {
                stream.write(i.name + ' ');
            });
        }
        stream.write('\r\n');
        _.each(type.methods, method => {
            stream.write('    ' + method.name + '\r\n');
        });
        stream.write('\r\n');
    });

    logger.info('  ' + metadatas.types.length + ' types extracted.');
}

function ExtractMethods(data: Buffer) {
    logger.info('Begin extract methods...');

    metadatas.methods = parsers.getMethodsParser(metadatas.header.methodsCount)
                            .parse(data.slice(metadatas.header.methodsOffset));

    _.each(metadatas.methods, method => {
        method.name = GetString(data, method.nameIndex);
    });

    logger.info('  ' + metadatas.methods.length + ' methods extracted.');
}

async function Main() {
    let data = await fs.readFile('data/global-metadata.dat');
    try {
        metadatas.header = parsers.il2CppGlobalMetadataHeader.parse(data);
        if (metadatas.header.sanity.toString(16) !== 'fab11baf') throw new Error('Incorrect sanity.');
        logger.info('Metadata version: ' + metadatas.header.version);

        ExtractStringLitterals(data, 'data/string.litterals.txt');
        ExtractMethods(data);
        ExtractInterfaces(data);
        ExtractTypes(data, 'data/types.txt');

        logger.info('Exporting protos...');
        let protos = new ProtosGeneration(metadatas);
        protos.export('data/pogo.protos');
    } catch (e) {
        logger.error(e);
    }
}

Main()
.then(() => logger.info('Done.'))
.catch(e => logger.error(e));
