import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { cleanupExpiredReservations } from "@/lib/cleanupExpiredReservations";

export async function GET() {
    await cleanupExpiredReservations();

    const inventory = await prisma.inventory.findMany({
        include: {
            product: true,
            warehouse: true,
        },
    });

    const formatted = inventory.map((item) => ({
        inventoryId: item.id,

        productId: item.product.id,
        productName: item.product.name,

        warehouseId: item.warehouse.id,
        warehouseName: item.warehouse.name,

        totalQuantity: item.totalQuantity,

        reservedQuantity: item.reservedQuantity,

        availableQuantity:
            item.totalQuantity -
            item.reservedQuantity,
    }));

    return NextResponse.json(formatted);
}