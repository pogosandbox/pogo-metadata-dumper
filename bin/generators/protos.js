"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs-promise");
const _ = require("lodash");
class ProtosGeneration {
    constructor(metadatas) {
        this.metadatas = metadatas;
    }
    getReturnType(method) {
        // console.log(method.returnType);
        // console.log(method.returnType / (26 * 4 + 8 * 2));
        // let returnType = this.metadatas.types[method.returnType];
        // return returnType.name;
    }
    header(stream) {
        stream.write('syntax = "proto3";\r\npackage Holoholo.Rpc;\r\n\r\n');
    }
    writeTypes(stream) {
        let rpcTypes = _.filter(this.metadatas.types, t => t.nameSpace.startsWith('Holoholo.Rpc'));
        _.each(rpcTypes, rpc => {
            stream.write(`message ${rpc.name}\r\n{\r\n`);
            _.each(_.filter(rpc.methods, m => _.startsWith(m.name, 'set_')), m => {
                let message = _.snakeCase(m.name.substring(4));
                if (message !== 'parser' && message !== 'descriptor') {
                    let fieldType = ''; // this.getReturnType(m);
                    stream.write(`    ${fieldType} ${message};\r\n`);
                }
            });
            stream.write('}\r\n\r\n');
        });
    }
    export(file) {
        let stream = fs.createWriteStream(file, 'utf8');
        this.header(stream);
        this.writeTypes(stream);
        stream.end();
    }
}
exports.default = ProtosGeneration;
//# sourceMappingURL=protos.js.map