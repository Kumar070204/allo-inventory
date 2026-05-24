import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// params validation

const paramsSchema =
    z.object({

        id:
            z.string().min(1),
    });

export async function POST(
    req: NextRequest,

    context: {
        params: Promise<{
            id: string;
        }>;
    }
) {

    try {

        // validate params

        const rawParams =
            await context.params;

        const { id } =
            paramsSchema.parse(
                rawParams
            );

        // transaction

        const result =
            await prisma.$transaction(
                async (tx) => {

                    // lock reservation row

                    const reservationRows =
                        await tx.$queryRaw<any[]>`

              SELECT *
              FROM "Reservation"

              WHERE id = ${id}

              FOR UPDATE
            `;

                    const reservation =
                        reservationRows[0];

                    // reservation missing

                    if (!reservation) {

                        return NextResponse.json(
                            {
                                error:
                                    "Reservation not found",
                            },
                            {
                                status: 404,
                            }
                        );
                    }

                    // already processed

                    if (
                        reservation.status !==
                        "PENDING"
                    ) {

                        return NextResponse.json(
                            {
                                error:
                                    "Reservation already processed",
                            },
                            {
                                status: 409,
                            }
                        );
                    }

                    // fetch inventory

                    const inventory =
                        await tx.inventory.findUnique({

                            where: {
                                id:
                                    reservation.inventoryId,
                            },
                        });

                    // inventory missing

                    if (!inventory) {

                        return NextResponse.json(
                            {
                                error:
                                    "Inventory missing",
                            },
                            {
                                status: 404,
                            }
                        );
                    }

                    // safety check

                    if (
                        inventory.reservedQuantity <
                        reservation.quantity
                    ) {

                        return NextResponse.json(
                            {
                                error:
                                    "Reserved quantity corrupted",
                            },
                            {
                                status: 500,
                            }
                        );
                    }

                    // restore reserved stock

                    await tx.inventory.update({

                        where: {
                            id:
                                reservation.inventoryId,
                        },

                        data: {

                            reservedQuantity: {
                                decrement:
                                    reservation.quantity,
                            },
                        },
                    });

                    // mark released

                    const updatedReservation =
                        await tx.reservation.update({

                            where: {
                                id: reservation.id,
                            },

                            data: {
                                status:
                                    "RELEASED",
                            },
                        });

                    return updatedReservation;
                }
            );

        return NextResponse.json(
            result
        );

    } catch (error: any) {

        // zod validation errors

        if (
            error instanceof z.ZodError
        ) {

            return NextResponse.json(
                {
                    error:
                        "Invalid request params",

                    details:
                        error.flatten(),
                },
                {
                    status: 400,
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