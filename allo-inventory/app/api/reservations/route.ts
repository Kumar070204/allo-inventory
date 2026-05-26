import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Inventory } from "@prisma/client";

// validation schema

const createReservationSchema =
    z.object({

        productId:
            z.string().min(1),

        warehouseId:
            z.string().min(1),

        quantity:
            z.number()
                .int()
                .positive()
                .max(10),
    });

export async function POST(
    req: NextRequest
) {

    try {

        // parse request body

        const body =
            await req.json();

        // validate input

        const validatedData =
            createReservationSchema.parse(
                body
            );

        const {
            productId,
            warehouseId,
            quantity,
        } = validatedData;

        // transaction

        const reservation =
            await prisma.$transaction(
                async (tx) => {

                    // lock inventory row

                    const inventoryRows =
                        await tx.$queryRaw<Inventory[]>`

              SELECT *
              FROM "Inventory"

              WHERE "productId" = ${productId}

              AND "warehouseId" = ${warehouseId}

              FOR UPDATE
            `;

                    const inventory =
                        inventoryRows[0];

                    // inventory missing

                    if (!inventory) {
                        throw new Error("NOT_FOUND");
                    }

                    // compute available stock

                    const availableQuantity =
                        inventory.totalQuantity -
                        inventory.reservedQuantity;

                    // insufficient stock

                    if (
                        availableQuantity <
                        quantity
                    ) {
                        throw new Error("INSUFFICIENT_STOCK");
                    }

                    // reserve stock

                    await tx.inventory.update({
                        where: {
                            id: inventory.id,
                        },

                        data: {

                            reservedQuantity: {
                                increment:
                                    quantity,
                            },
                        },
                    });

                    // create reservation

                    const reservation =
                        await tx.reservation.create({

                            data: {

                                inventoryId:
                                    inventory.id,

                                quantity,

                                status: "PENDING",

                                expiresAt:
                                    new Date(
                                        Date.now() +
                                        10 *
                                        60 *
                                        1000
                                    ),
                            },
                        });

                    return reservation;
                }
            );

        return NextResponse.json(
            reservation
        );

    } catch (error: unknown) {

        // zod validation errors

        if (
            error instanceof z.ZodError
        ) {

            return NextResponse.json(
                {
                    error:
                        "Invalid request data",

                    details:
                        error.flatten(),
                },
                {
                    status: 400,
                }
            );
        }

        const knownError = error as { message?: string };

        if (knownError.message === "NOT_FOUND") {
            return NextResponse.json(
                {
                    error:
                        "Inventory not found",
                },
                {
                    status: 404,
                }
            );
        }

        if (knownError.message === "INSUFFICIENT_STOCK") {
            return NextResponse.json(
                {
                    error:
                        "Not enough stock available",
                },
                {
                    status: 409,
                }
            );
        }

        console.error(error);

        return NextResponse.json(
            {
                error:
                    "Internal server error",
            },
            {
                status: 500,
            }
        );
    }
}