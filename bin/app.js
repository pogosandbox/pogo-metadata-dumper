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
const logger = require("winston");
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
    'colorize': true,
    'level': 'debug',
});
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
        logger.info('Begin extract string litterals...');
        let litterals = parser_1.parsers.getLitteralsParser(metadatas.header.stringLiteralCount)
            .parse(data.slice(metadatas.header.stringLiteralOffset)).litterals;
        let stream = fs.createWriteStream(file, 'utf8');
        _.each(litterals, litteral => {
            let start = metadatas.header.stringLiteralDataOffset + litteral.dataIndex;
            stream.write(data.slice(start, start + litteral.length).toString('utf8') + '\r\n');
        });
        stream.end();
        logger.info(litterals.length + ' string litterals extracted.');
    });
}
function GetString(data, index) {
    let raw = data.slice(metadatas.header.stringOffset + index);
    return (new Parser()).string('str', { zeroTerminated: true }).parse(raw).str;
}
function ExtractTypes(data, file) {
    return __awaiter(this, void 0, void 0, function* () {
        logger.info('Begin extract types...');
        let typesCount = metadatas.header.typeDefinitionsCount / (26 * 4 + 8 * 2);
        logger.info('Types Count: ' + typesCount);
        let rawTypes = parser_1.parsers.getTypesParser(typesCount)
            .parse(data.slice(metadatas.header.typeDefinitionsOffset));
        logger.debug(rawTypes.slice(0, 5));
        metadatas.types = _.map(rawTypes, type => {
            if (type.interfaces_count > 0 || type.interface_offsets_count > 0) {
                logger.debug('type', type);
                logger.debug('interface_count', type.interfaces_count);
                logger.debug('interfacesStart', type.interfacesStart);
                logger.debug('interface_offsets_count', type.interface_offsets_count);
                logger.debug('interfaceOffsetsStart', type.interfaceOffsetsStart);
            }
            return {
                name: GetString(data, type.nameIndex),
                interfaces: [],
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
        logger.info(metadatas.types.length + ' types extracted.');
    });
}
function ExtractMethods(data) {
    return __awaiter(this, void 0, void 0, function* () {
        logger.info('Begin extract methods...');
        let methods = parser_1.parsers.getMethodsParser(metadatas.header.methodsCount)
            .parse(data.slice(metadatas.header.methodsOffset));
        metadatas.methods = _.map(methods, method => GetString(data, method.nameIndex));
        // logger.info(methods.slice(0, 5));
        logger.info(metadatas.methods.length + ' methods extracted.');
    });
}
function Main() {
    return __awaiter(this, void 0, void 0, function* () {
        let data = yield fs.readFile('data/global-metadata.dat');
        metadatas.header = parser_1.parsers.il2CppGlobalMetadataHeader.parse(data);
        if (metadatas.header.sanity.toString(16) !== 'fab11baf')
            throw new Error('Incorrect sanity.');
        logger.info('Metadata version: ' + metadatas.header.version);
        yield ExtractStringLitterals(data, 'data/string.litterals.txt');
        yield ExtractMethods(data);
        yield ExtractTypes(data, 'data/types.txt');
    });
}
Main()
    .then(() => logger.info('Done.'))
    .catch(e => logger.error(e));
//# sourceMappingURL=app.js.map