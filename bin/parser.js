"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let Parser = require('binary-parser').Parser;
let il2CppGlobalMetadataHeader = new Parser()
    .endianess('little')
    .uint32('sanity')
    .int32('version')
    .int32('stringLiteralOffset') // string data for managed code
    .int32('stringLiteralCount')
    .int32('stringLiteralDataOffset')
    .int32('stringLiteralDataCount')
    .int32('stringOffset') // string data for metadata
    .int32('stringCount')
    .int32('eventsOffset') // Il2CppEventDefinition
    .int32('eventsCount')
    .int32('propertiesOffset') // Il2CppPropertyDefinition
    .int32('propertiesCount')
    .int32('methodsOffset') // Il2CppMethodDefinition
    .int32('methodsCount')
    .int32('parameterDefaultValuesOffset') // Il2CppParameterDefaultValue
    .int32('parameterDefaultValuesCount')
    .int32('fieldDefaultValuesOffset') // Il2CppFieldDefaultValue
    .int32('fieldDefaultValuesCount')
    .int32('fieldAndParameterDefaultValueDataOffset') // uint8_t
    .int32('fieldAndParameterDefaultValueDataCount')
    .int32('fieldMarshaledSizesOffset') // Il2CppFieldMarshaledSize
    .int32('fieldMarshaledSizesCount')
    .int32('parametersOffset') // Il2CppParameterDefinition
    .int32('parametersCount')
    .int32('fieldsOffset') // Il2CppFieldDefinition
    .int32('fieldsCount')
    .int32('genericParametersOffset') // Il2CppGenericParameter
    .int32('genericParametersCount')
    .int32('genericParameterConstraintsOffset') // TypeIndex
    .int32('genericParameterConstraintsCount')
    .int32('genericContainersOffset') // Il2CppGenericContainer
    .int32('genericContainersCount')
    .int32('nestedTypesOffset') // TypeDefinitionIndex
    .int32('nestedTypesCount')
    .int32('interfacesOffset') // TypeIndex
    .int32('interfacesCount')
    .int32('vtableMethodsOffset') // EncodedMethodIndex
    .int32('vtableMethodsCount')
    .int32('interfaceOffsetsOffset') // Il2CppInterfaceOffsetPair
    .int32('interfaceOffsetsCount')
    .int32('typeDefinitionsOffset') // Il2CppTypeDefinition
    .int32('typeDefinitionsCount')
    .int32('rgctxEntriesOffset') // Il2CppRGCTXDefinition
    .int32('rgctxEntriesCount')
    .int32('imagesOffset') // Il2CppImageDefinition
    .int32('imagesCount')
    .int32('assembliesOffset') // Il2CppAssemblyDefinition
    .int32('assembliesCount')
    .int32('metadataUsageListsOffset') // Il2CppMetadataUsageList
    .int32('metadataUsageListsCount')
    .int32('metadataUsagePairsOffset') // Il2CppMetadataUsagePair
    .int32('metadataUsagePairsCount')
    .int32('fieldRefsOffset') // Il2CppFieldRef
    .int32('fieldRefsCount')
    .int32('referencedAssembliesOffset') // int32le_t
    .int32('referencedAssembliesCount')
    .int32('attributesInfoOffset') // Il2CppCustomAttributeTypeRange
    .int32('attributesInfoCount')
    .int32('attributeTypesOffset') // TypeIndex
    .int32('attributeTypesCount')
    .int32('attributeTypesOffset') // TypeIndex
    .int32('attributeTypesCount')
    .int32('unresolvedVirtualCallParameterTypesOffset') // TypeIndex
    .int32('unresolvedVirtualCallParameterTypesCount')
    .int32('unresolvedVirtualCallParameterRangesOffset') // Il2CppRange
    .int32('unresolvedVirtualCallParameterRangesCount');
let il2CppImageDefinition = new Parser()
    .endianess('little')
    .uint32('nameIndex')
    .uint32('assemblyIndex')
    .uint32('typeStart')
    .uint32('typeCount')
    .uint32('entryPointIndex')
    .uint32('token');
let il2CppImage = new Parser()
    .endianess('little')
    .string('name', {
    encoding: 'ascii',
    zeroTerminated: true
})
    .uint32('assemblyIndex')
    .uint32('typeStart')
    .uint32('typeCount')
    .uint32('nameToClassHashTable')
    .uint32('token');
let il2CppTypeDefinition = new Parser()
    .endianess('little')
    .uint32('nameIndex')
    .uint32('namespaceIndex')
    .uint32('customAttributeIndex')
    .uint32('byvalTypeIndex')
    .uint32('byrefTypeIndex')
    .uint32('declaringTypeIndex')
    .uint32('parentIndex')
    .uint32('elementTypeIndex') // we can probably remove this one. Only used for enums
    .uint32('rgctxStartIndex')
    .uint32('rgctxCount')
    .uint32('genericContainerIndex')
    .uint32('delegateWrapperFromManagedToNativeIndex')
    .uint32('marshalingFunctionsIndex')
    .uint32('ccwFunctionIndex')
    .uint32('guidIndex')
    .uint32('flags')
    .uint32('fieldStart')
    .uint32('methodStart')
    .uint32('eventStart')
    .uint32('propertyStart')
    .uint32('nestedTypesStart')
    .uint32('interfacesStart')
    .uint32('vtableStart')
    .uint32('interfaceOffsetsStart')
    .uint16('method_count')
    .uint16('property_count')
    .uint16('field_count')
    .uint16('event_count')
    .uint16('nested_type_count')
    .uint16('vtable_count')
    .uint16('interfaces_count')
    .uint16('interface_offsets_count')
    .bit32('bitfield')
    .uint32('token');
let il2CppStringLiteral = new Parser()
    .endianess('little')
    .int32('length')
    .int32('dataIndex');
let il2CppMethodDefinition = new Parser()
    .endianess('little')
    .uint32('nameIndex')
    .uint32('declaringType')
    .uint32('returnType')
    .uint32('parameterStart')
    .uint32('customAttributeIndex')
    .uint32('genericContainerIndex')
    .uint32('methodIndex')
    .uint32('invokerIndex')
    .uint32('reversePInvokeWrapperIndex')
    .uint32('rgctxStartIndex')
    .uint32('rgctxCount')
    .uint32('token')
    .uint16('flags')
    .uint16('iflags')
    .uint16('slot')
    .uint16('parameterCount');
exports.parsers = {
    il2CppGlobalMetadataHeader,
    il2CppImageDefinition,
    il2CppImage,
    il2CppTypeDefinition,
    il2CppStringLiteral,
    il2CppMethodDefinition,
};
//# sourceMappingURL=parser.js.map