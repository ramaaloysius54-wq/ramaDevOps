"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
// FIX: Hapus "query" dari log agar terminal bersih dari tulisan INSERT/SELECT
exports.prisma = global.globalPrisma ||
    new client_1.PrismaClient({
        log: ["error", "warn"],
    });
if (process.env.NODE_ENV !== "production") {
    global.globalPrisma = exports.prisma;
}
exports.default = exports.prisma;
