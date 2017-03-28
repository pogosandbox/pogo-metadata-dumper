import * as fs from 'fs-promise';
import * as _ from 'lodash';
// import * as logger from 'winston';

let Parser = require('binary-parser').Parser;

import {parsers} from './parsers/metadata';
import ProtosGeneration from './generators/protos';
import PseudoCodeGeneration from './generators/pseudo';
import StringsModifier from './modifiers/stringsModifier';

// logger.remove(logger.transports.Console);
// logger.add(logger.transports.Console, {
//     'colorize': true,
//     'level': 'debug',
// });

let logger = {
    debug: console.log,
    info: console.log,
    error: console.error,
};

let metadatas = {
    header: null,
    strings: [],
    stringsLiterals: [],
    images: [],
    interfaces: [],
    types: [],
    methods: [],
    parameters: [],
    fields: [],
    usages: [],
};

function ExtractStringLitterals(data: Buffer, file: string) {
    logger.info('Begin extract string litterals...');

    let count = metadatas.header.stringLiteralCount / parsers.il2CppStringLiteral.sizeOf();
    let litterals = parsers.getLitteralsParser(count)
                        .parse(data.slice(metadatas.header.stringLiteralOffset));

    let stream = fs.createWriteStream(file, 'utf8');
    _.each(litterals, litteral => {
        let start = metadatas.header.stringLiteralDataOffset + litteral.dataIndex;
        let str = data.slice(start, start + litteral.length).toString('utf8');
        metadatas.stringsLiterals.push(str);
        stream.write(str + '\r\n');
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

function ExtractParameters(data: Buffer) {
    logger.info('Begin extract parameters...');

    let count = metadatas.header.parametersCount / parsers.il2CppParameterDefinition.sizeOf();
    let parameters = metadatas.parameters = parsers.getFieldsParser(count)
                            .parse(data.slice(metadatas.header.parametersOffset));

    logger.info('  extract info...');
    _.each(parameters, p => {
        p.name = GetString(data, p.nameIndex);
    });

    logger.info('  ' + parameters.length + ' parameters extracted.');
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
        method.parameters = metadatas.parameters.slice(method.parameterStart, method.parameterStart + method.parameterCount);
    });

    logger.info('  ' + metadatas.methods.length + ' methods extracted.');
}

// function GetEncodedIndexType(index: number): string {
//     let realIdx = ((index & 0xE0000000) >> 29);
//     let usageMap = [
//         'Invalid',
//         'TypeInfo',
//         'Il2CppType',
//         'MethodDef',
//         'FieldInfo',
//         'StringLiteral',
//         'MethodRef',
//     ];
//     return usageMap[realIdx];
// }

// function GetDecodedMethodIndex(index: number): number {
//     return (index & 0x1FFFFFFF);
// }

// function ExtractUsages(data: Buffer) {
//     logger.info('Begin extract usage...');

//     let usageListCount = metadatas.header.metadataUsageListsCount / parsers.il2CppMetadataUsageList.sizeOf();
//     let usageList: any[] = parsers.getUsageParser(usageListCount)
//                             .parse(data.slice(metadatas.header.metadataUsageListsOffset));

//     let usageCount = metadatas.header.metadataUsagePairsCount / parsers.il2CppMetadataUsagePair.sizeOf();
//     let usages: any[] = parsers.getUsageParser(usageCount)
//                             .parse(data.slice(metadatas.header.metadataUsagePairsOffset));

//     _.each(usageList, usage => {
//         usage.usages = usages.slice(usage.start, usage.start + usage.count);
//         _.each(usage.usages, u => {
//             u.name = GetEncodedIndexType(u.encodedSourceIndex);
//             u.methodIndex = GetDecodedMethodIndex(u.encodedSourceIndex);
//         });
//     });

//     logger.info('  ' + usageList.length + ' usage extracted.');
// }

async function Main() {
    try {
        let data = await fs.readFile('data/global-metadata.dat');
        metadatas.header = parsers.il2CppGlobalMetadataHeader.parse(data);
        if (metadatas.header.sanity.toString(16) !== 'fab11baf') throw new Error('Incorrect sanity.');
        logger.info('Metadata version: ' + metadatas.header.version);

        ExtractStringLitterals(data, 'data/string.litterals.txt');
        // ExtractUsages(data);
        ExtractFields(data);
        ExtractParameters(data);
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

        // logger.info('Modifying strings');
        // let modifier = new StringsModifier(metadatas);
        // modifier.load(data);
        // modifier.modify();
        // await modifier.save('data/global-metadata.new.dat');
    } catch (e) {
        logger.error(e);
    }
}

Main()
.then(() => logger.info('Done.'))
.catch(e => logger.error(e));
