"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dateSerializationExtension = void 0;
const client_1 = require("@prisma/client");
function transformDates(obj) {
    if (obj === null || obj === undefined) {
        return obj;
    }
    if (obj instanceof Date) {
        return obj.toISOString();
    }
    if (Array.isArray(obj)) {
        return obj.map(transformDates);
    }
    if (typeof obj === 'object' && obj.constructor === Object) {
        const transformed = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                transformed[key] = transformDates(obj[key]);
            }
        }
        return transformed;
    }
    return obj;
}
exports.dateSerializationExtension = client_1.Prisma.defineExtension({
    name: 'dateSerializationExtension',
    result: {
        $allModels: {
            $allOperations({ result, args, model, operation }) {
                return transformDates(result);
            },
        },
    },
});
//# sourceMappingURL=date-serialization.extension.js.map