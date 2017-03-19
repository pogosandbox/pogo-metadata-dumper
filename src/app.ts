import * as fs from 'fs-promise';
import * as _ from 'lodash';
// import * as logger from 'winston';

let Parser = require('binary-parser').Parser;

import {parsers} from './parser';
import ProtosGeneration from './generators/protos';
import PseudoCodeGeneration from './generators/pseudo';

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
    images: [],
    interfaces: [],
    types: [],
    methods: [],
    fields: [],
};

function ExtractStringLitterals(data: Buffer, file: string) {
    logger.info('Begin extract string litterals...');

    let count = metadatas.header.stringLiteralCount / parsers.il2CppStringLiteral.sizeOf();
    let litterals = parsers.getLitteralsParser(count)
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

    let interfacesCount = metadatas.header.interfacesCount / parsers.il2CppTypeDefinition.sizeOf();
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

function ExtractFields(data: Buffer) {
    logger.info('Begin extract fields...');

    let count = metadatas.header.fieldsCount / parsers.il2CppFieldDefinition.sizeOf();
    let fields = metadatas.fields = parsers.getFieldsParser(count)
                            .parse(data.slice(metadatas.header.fieldsOffset));

    logger.info('  extract info...');
    _.each(fields, field => {
        field.name = GetString(data, field.nameIndex);
    });

    logger.info('  ' + fields.length + ' fields extracted.');
}

function ExtractTypes(data: Buffer) {
    logger.info('Begin extract types...');

    let typesCount = metadatas.header.typeDefinitionsCount / parsers.il2CppTypeDefinition.sizeOf();
    metadatas.types = parsers.getTypesParser(typesCount)
                            .parse(data.slice(metadatas.header.typeDefinitionsOffset));

    logger.info('  extract informations...');
    _.each(metadatas.types, type => {
        type.name = GetString(data, type.nameIndex);
        type.nameSpace = GetString(data, type.namespaceIndex);
        // type.interfaces = [];
        type.attributes = {
            public: (type.flags & 0x00000007) === 0x00000001,
            interface: (type.flags & 0x00000020) !== 0,
            abstract: (type.flags & 0x00000080) !== 0,
            sealed: (type.flags & 0x00000100) !== 0,
        };
        type.fields = metadatas.fields.slice(type.fieldStart, type.fieldStart + type.field_count);
        type.methods = metadatas.methods.slice(type.methodStart, type.methodStart + type.method_count);
    });

    logger.info('  ' + metadatas.types.length + ' types extracted.');
}


function ExtractImages(data: Buffer, file: string) {
    logger.info('Begin extract images...');

    let imagesCount = metadatas.header.imagesCount / parsers.il2CppImageDefinition.sizeOf();
    let images = metadatas.images = parsers.getImagesParser(imagesCount)
                            .parse(data.slice(metadatas.header.imagesOffset));

    logger.info('  extract name...');
    _.each(images, image => {
        image.name = GetString(data, image.nameIndex);
        image.types = metadatas.types.slice(image.typeStart, image.typeStart + image.typeCount);
    });

    let stream = fs.createWriteStream(file, 'utf8');
    _.each(images, image => {
        stream.write(`${image.name} (${image.typeCount})\r\n`);
    });
    stream.end();

    logger.info('  ' + images.length + ' images extracted.');
}

function ExtractMethods(data: Buffer) {
    logger.info('Begin extract methods...');

    let methodsCount = metadatas.header.methodsCount / parsers.il2CppMethodDefinition.sizeOf();
    metadatas.methods = parsers.getMethodsParser(methodsCount)
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
        ExtractFields(data);
        ExtractMethods(data);
        ExtractInterfaces(data);
        ExtractTypes(data);
        ExtractImages(data, 'data/images.txt');

        logger.info('Exporting pseudo code...');
        let pseudo = new PseudoCodeGeneration(metadatas);
        pseudo.export('data/pseudo.cs');

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
