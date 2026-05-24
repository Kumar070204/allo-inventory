import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// validate params

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

                        throw new Error(
                            "NOT_FOUND"
                        );
                    }

                    // already processed

                    if (
                        reservation.status !==
                        "PENDING"
                    ) {

                        throw new Error(
                            "ALREADY_PROCESSED"
                        );
                    }

                    // expired

                    if (
                        new Date(
                            reservation.expiresAt
                        ) < new Date()
                    ) {

                        throw new Error(
                            "EXPIRED"
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

                    if (!inventory) {

                        throw new Error(
                            "INVENTORY_MISSING"
                        );
                    }

                    // safety check

                    if (
                        inventory.reservedQuantity <
                        reservation.quantity
                    ) {

                        throw new Error(
                            "CORRUPTED_STATE"
                        );
                    }

                    // decrement inventory

                    await tx.inventory.update({

                        where: {
                            id: inventory.id,
                        },

                        data: {

                            totalQuantity: {
                                decrement:
                                    reservation.quantity,
                            },

                            reservedQuantity: {
                                decrement:
                                    reservation.quantity,
                            },
                        },
                    });

                    // confirm reservation

                    const updatedReservation =
                        await tx.reservation.update({

                            where: {
                                id:
                                    reservation.id,
                            },

                            data: {
                                status:
                                    "CONFIRMED",
                            },
                        });

                    return updatedReservation;
                }
            );

        return NextResponse.json(
            result
        );

    } catch (error: any) {

        // zod validation

        if (
            error instanceof z.ZodError
        ) {

            return NextResponse.json(
                {
                    error:
                        "Invalid params",
                },
                {
                    status: 400,
                }
            );
        }

        // known errors

        if (
            error.message ===
            "NOT_FOUND"
        ) {

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

        if (
            error.message ===
            "ALREADY_PROCESSED"
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

        if (
            error.message ===
            "EXPIRED"
        ) {

            return NextResponse.json(
                {
                    error:
                        "Reservation expired",
                },
                {
                    status: 410,
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