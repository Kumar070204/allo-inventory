import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(

    req: NextRequest,

    context: {
        params: Promise<{
            id: string;
        }>;
    }
) {

    try {

        const { id } =
            await context.params;

        const reservation =
            await prisma.reservation.findUnique({

                where: {
                    id,
                },
            });

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

        return NextResponse.json(
            reservation
        );

    } catch (error) {

        return NextResponse.json(
            {
                error:
                    "Failed to fetch reservation",
            },
            {
                status: 500,
            }
        );
    }
}