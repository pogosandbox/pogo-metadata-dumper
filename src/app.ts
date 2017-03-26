import * as fs from 'fs-promise';
import * as _ from 'lodash';
import * as logger from 'winston';

logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
    'colorize': true,
    'level': 'debug',
});

let Parser = require('binary-parser').Parser;
import {parsers} from './parser';

let metadatas = {
    header: null,
    strings: null,
    types: null,
    methods: null,
}

async function ExtractStringLitterals(data: Buffer, file: string) {
    logger.info('Begin extract string litterals...');

    let litterals = parsers.getLitteralsParser(metadatas.header.stringLiteralCount)
                        .parse(data.slice(metadatas.header.stringLiteralOffset)).litterals;

    let stream = fs.createWriteStream(file, 'utf8');
    _.each(litterals, litteral => {
        let start = metadatas.header.stringLiteralDataOffset + litteral.dataIndex;
        stream.write(data.slice(start, start + litteral.length).toString('utf8') + '\r\n');
    });
    stream.end();

    logger.info(litterals.length + ' string litterals extracted.');
}

function GetString(data: Buffer, index: number): string {
    let raw = data.slice(metadatas.header.stringOffset + index);
    return (new Parser()).string('str', {zeroTerminated: true}).parse(raw).str;
}

async function ExtractTypes(data: Buffer, file: string) {
    logger.info('Begin extract types...');

    let typesCount = metadatas.header.typeDefinitionsCount / (26 * 4 + 8 * 2);
    logger.info('Types Count: ' + typesCount);

    let rawTypes: any[] = parsers.getTypesParser(typesCount)
                            .parse(data.slice(metadatas.header.typeDefinitionsOffset));

    // logger.debug(rawTypes.slice(0, 5));

    metadatas.types = _.map(rawTypes, type => {
        // if (type.interfaces_count > 0 || type.interface_offsets_count > 0) {
        //     logger.debug('type', type);
        //     logger.debug('interface_count', type.interfaces_count);
        //     logger.debug('interfacesStart', type.interfacesStart);
        //     logger.debug('interface_offsets_count', type.interface_offsets_count);
        //     logger.debug('interfaceOffsetsStart', type.interfaceOffsetsStart);
        // }
        return {
            name: GetString(data, type.nameIndex),
            interfaces: [],
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

    logger.info(metadatas.types.length + ' types extracted.');
}

async function ExtractMethods(data: Buffer) {
    logger.info('Begin extract methods...');

    let methods: any[] = parsers.getMethodsParser(metadatas.header.methodsCount)
                            .parse(data.slice(metadatas.header.methodsOffset));
    metadatas.methods = _.map(methods, method => GetString(data, method.nameIndex));

    // logger.info(methods.slice(0, 5));

    logger.info(metadatas.methods.length + ' methods extracted.');
}

async function Main() {
    let data = await fs.readFile('data/global-metadata.dat');

    metadatas.header = parsers.il2CppGlobalMetadataHeader.parse(data);
    if (metadatas.header.sanity.toString(16) !== 'fab11baf') throw new Error('Incorrect sanity.');
    logger.info('Metadata version: ' + metadatas.header.version);

    await ExtractStringLitterals(data, 'data/string.litterals.txt');

    await ExtractMethods(data);

    await ExtractTypes(data, 'data/types.txt');
}

Main()
.then(() => logger.info('Done.'))
.catch(e => logger.error(e));
