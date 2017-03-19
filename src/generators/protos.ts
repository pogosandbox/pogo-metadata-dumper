import * as fs from 'fs-promise';
import * as _ from 'lodash';

export default class ProtosGeneration {
    metadatas: any;

    constructor(metadatas: any) {
        this.metadatas = metadatas;
    }

    getReturnType(method: any) {
        // console.log(method.returnType);
        // console.log(method.returnType / (26 * 4 + 8 * 2));
        // let returnType = this.metadatas.types[method.returnType];
        // return returnType.name;
    }

    header(stream: fs.WriteStream) {
        stream.write('syntax = "proto3";\r\npackage Holoholo.Rpc;\r\n\r\n');
    }

    writeTypes(stream: fs.WriteStream) {
        let rpcTypes = _.filter(<any[]>this.metadatas.types, t => t.nameSpace.startsWith('Holoholo.Rpc'));
        _.each(rpcTypes, rpc => {
            stream.write(`message ${rpc.name}\r\n{\r\n`);
            _.each(_.filter(<any[]>rpc.methods, m => _.startsWith(m.name, 'get_')), m => {
                let message = _.snakeCase(m.name.substring(4));
                if (message !== 'parser' && message !== 'descriptor') {
                    let fieldType = ''; // this.getReturnType(m);
                    stream.write(`    ${fieldType} ${message};\r\n`);
                }
            });
            stream.write('}\r\n\r\n');
        });
    }

    export(file: string) {
        let stream = fs.createWriteStream(file, 'utf8');
        this.header(stream);
        this.writeTypes(stream);
        stream.end();
    }
}