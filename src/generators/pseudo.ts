import * as fs from 'fs-promise';
import * as _ from 'lodash';

export default class PseudoCodeGeneration {
    metadatas: any;

    constructor(metadatas: any) {
        this.metadatas = metadatas;
    }

    exportImages(stream: fs.WriteStream) {
        _.each(this.metadatas.images, image => {
            stream.write(`// ${image.name}\r\n`);
            stream.write('{\r\n');
            this.exportTypes(stream, image.types, '    ');
            stream.write('}\r\n');
        });
    }

    exportTypes(stream: fs.WriteStream, types: any[], pad: string) {
        _.each(types, type => {
            stream.write(pad);
            if (type.attributes.public) stream.write('public ');
            if (type.attributes.abstract) stream.write('abstract ');
            if (type.attributes.sealed) stream.write('sealed ');
            if (type.attributes.interface) {
                stream.write('interface ');
            } else {
                stream.write('class ');
            }
            if (type.nameSpace) stream.write(`${type.nameSpace}.`);
            stream.write(`${type.name} {\r\n`);
            this.exportFields(stream, type.fields, pad + pad);
            this.exportMethods(stream, type.methods, pad + pad);
            stream.write(pad + `}\r\n`);
        });
    }

    exportFields(stream: fs.WriteStream, fields: any[], pad: string) {
        stream.write(pad + '// fields\r\n');
        _.each(fields, field => {
            stream.write(pad + `${field.name};\r\n`);
        });
    }

    exportMethods(stream: fs.WriteStream, methods: any[], pad: string) {
        stream.write(pad + '// methods\r\n');
        _.each(methods, method => {
            stream.write(pad + `${method.name}()\r\n`);
        });
    }

    export(file: string) {
        let stream = fs.createWriteStream(file, 'utf8');
        this.exportImages(stream);
        stream.end();
    }
}