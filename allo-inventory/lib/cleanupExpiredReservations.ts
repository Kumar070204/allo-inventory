import { prisma } from "@/lib/prisma";
import { Reservation } from "@prisma/client";

export async function cleanupExpiredReservations() {

    // fetch expired pending reservations

    const expiredReservations =
        await prisma.reservation.findMany({

            where: {

                status: "PENDING",

                expiresAt: {
                    lt: new Date(),
                },
            },
        });

    // process each reservation safely

    for (const reservation of expiredReservations) {

        await prisma.$transaction(
            async (tx) => {

                // lock reservation row

                const reservationRows =
                    await tx.$queryRaw<Reservation[]>`

            SELECT *
            FROM "Reservation"

            WHERE id = ${reservation.id}

            FOR UPDATE
          `;

                const lockedReservation =
                    reservationRows[0];

                // reservation already processed

                if (
                    !lockedReservation ||
                    lockedReservation.status !==
                    "PENDING"
                ) {

                    return;
                }

                // fetch inventory

                const inventory =
                    await tx.inventory.findUnique({

                        where: {
                            id:
                                lockedReservation.inventoryId,
                        },
                    });

                // inventory missing

                if (!inventory) {

                    return;
                }

                // prevent negative quantities

                if (
                    inventory.reservedQuantity <
                    lockedReservation.quantity
                ) {

                    return;
                }

                // restore reserved stock

                await tx.inventory.update({

                    where: {
                        id: inventory.id,
                    },

                    data: {

                        reservedQuantity: {
                            decrement:
                                lockedReservation.quantity,
                        },
                    },
                });

                // release reservation

                await tx.reservation.update({

                    where: {
                        id:
                            lockedReservation.id,
                    },

                    data: {
                        status:
                            "RELEASED",
                    },
                });
            }
        );
    }
}