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
// import * as logger from 'winston';
let Parser = require('binary-parser').Parser;
const parser_1 = require("./parser");
const protos_1 = require("./generators/protos");
const pseudo_1 = require("./generators/pseudo");
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
    images: [],
    interfaces: [],
    types: [],
    methods: [],
    fields: [],
};
function ExtractStringLitterals(data, file) {
    logger.info('Begin extract string litterals...');
    let count = metadatas.header.stringLiteralCount / parser_1.parsers.il2CppStringLiteral.sizeOf();
    let litterals = parser_1.parsers.getLitteralsParser(count)
        .parse(data.slice(metadatas.header.stringLiteralOffset));
    let stream = fs.createWriteStream(file, 'utf8');
    _.each(litterals, litteral => {
        let start = metadatas.header.stringLiteralDataOffset + litteral.dataIndex;
        stream.write(data.slice(start, start + litteral.length).toString('utf8') + '\r\n');
    });
    stream.end();
    logger.info('  ' + litterals.length + ' string litterals extracted.');
}
function GetString(data, index) {
    let raw = data.slice(metadatas.header.stringOffset + index);
    return parser_1.parsers.string.parse(raw);
}
function ExtractInterfaces(data) {
    logger.info('Begin extract interfaces...');
    let interfacesCount = metadatas.header.interfacesCount / parser_1.parsers.il2CppTypeDefinition.sizeOf();
    metadatas.interfaces = parser_1.parsers.getTypesParser(interfacesCount)
        .parse(data.slice(metadatas.header.interfacesOffset));
    logger.info('  extract name and methods...');
    _.each(metadatas.interfaces, type => {
        type.name = GetString(data, type.nameIndex);
        type.interfaces = [];
        type.methods = metadatas.methods.slice(type.methodStart, type.methodStart + type.method_count);
    });
    logger.info('  ' + metadatas.interfaces.length + ' interfaces extracted.');
}
function ExtractFields(data) {
    logger.info('Begin extract fields...');
    let count = metadatas.header.fieldsCount / parser_1.parsers.il2CppFieldDefinition.sizeOf();
    let fields = metadatas.fields = parser_1.parsers.getFieldsParser(count)
        .parse(data.slice(metadatas.header.fieldsOffset));
    logger.info('  extract info...');
    _.each(fields, field => {
        field.name = GetString(data, field.nameIndex);
    });
    logger.info('  ' + fields.length + ' fields extracted.');
}
function ExtractTypes(data) {
    logger.info('Begin extract types...');
    let typesCount = metadatas.header.typeDefinitionsCount / parser_1.parsers.il2CppTypeDefinition.sizeOf();
    metadatas.types = parser_1.parsers.getTypesParser(typesCount)
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
function ExtractImages(data, file) {
    logger.info('Begin extract images...');
    let imagesCount = metadatas.header.imagesCount / parser_1.parsers.il2CppImageDefinition.sizeOf();
    let images = metadatas.images = parser_1.parsers.getImagesParser(imagesCount)
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
function ExtractMethods(data) {
    logger.info('Begin extract methods...');
    let methodsCount = metadatas.header.methodsCount / parser_1.parsers.il2CppMethodDefinition.sizeOf();
    metadatas.methods = parser_1.parsers.getMethodsParser(methodsCount)
        .parse(data.slice(metadatas.header.methodsOffset));
    _.each(metadatas.methods, method => {
        method.name = GetString(data, method.nameIndex);
    });
    logger.info('  ' + metadatas.methods.length + ' methods extracted.');
}
function Main() {
    return __awaiter(this, void 0, void 0, function* () {
        let data = yield fs.readFile('data/global-metadata.dat');
        try {
            metadatas.header = parser_1.parsers.il2CppGlobalMetadataHeader.parse(data);
            if (metadatas.header.sanity.toString(16) !== 'fab11baf')
                throw new Error('Incorrect sanity.');
            logger.info('Metadata version: ' + metadatas.header.version);
            ExtractStringLitterals(data, 'data/string.litterals.txt');
            ExtractFields(data);
            ExtractMethods(data);
            ExtractInterfaces(data);
            ExtractTypes(data);
            ExtractImages(data, 'data/images.txt');
            logger.info('Exporting pseudo code...');
            let pseudo = new pseudo_1.default(metadatas);
            pseudo.export('data/pseudo.cs');
            logger.info('Exporting protos...');
            let protos = new protos_1.default(metadatas);
            protos.export('data/pogo.protos');
        }
        catch (e) {
            logger.error(e);
        }
    });
}
Main()
    .then(() => logger.info('Done.'))
    .catch(e => logger.error(e));
//# sourceMappingURL=app.js.map