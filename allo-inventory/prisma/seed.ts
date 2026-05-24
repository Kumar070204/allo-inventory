import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {

    // warehouses

    const warehouse1 = await prisma.warehouse.create({
        data: {
            name: "Mumbai Warehouse",
            location: "Mumbai",
        },
    });

    const warehouse2 = await prisma.warehouse.create({
        data: {
            name: "Delhi Warehouse",
            location: "Delhi",
        },
    });

    // products

    const iphone = await prisma.product.create({
        data: {
            name: "iPhone 15",
            sku: "IPHONE15",
        },
    });

    const ps5 = await prisma.product.create({
        data: {
            name: "PlayStation 5",
            sku: "PS5",
        },
    });

    // inventory

    await prisma.inventory.createMany({
        data: [
            {
                productId: iphone.id,
                warehouseId: warehouse1.id,
                totalQuantity: 5,
            },
            {
                productId: iphone.id,
                warehouseId: warehouse2.id,
                totalQuantity: 2,
            },
            {
                productId: ps5.id,
                warehouseId: warehouse1.id,
                totalQuantity: 1,
            },
        ],
    });

    console.log("Seed complete");
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });