"use client";

import axios from "axios";
import { use, useEffect, useState } from "react";

type Reservation = {

    id: string;

    inventoryId: string;

    quantity: number;

    status: string;

    expiresAt: string;

    createdAt: string;
};

export default function ReservationPage({

    params,

}: {

    params: Promise<{
        id: string;
    }>;
}) {

    const { id } = use(params);

    const [reservation, setReservation] =
        useState<Reservation | null>(
            null
        );

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    const [timeLeft, setTimeLeft] =
        useState("");

    // load reservation

    useEffect(() => {

        async function loadReservation() {

            try {

                const response =
                    await axios.get(
                        `/api/reservations/${id}`
                    );

                setReservation(
                    response.data
                );

            } catch (error: unknown) {

                const axiosError = error as { response?: { data?: { error?: string } } };
                setError(
                    axiosError?.response?.data?.error ||
                    "Failed to load reservation"
                );

            } finally {

                setLoading(false);
            }
        }

        loadReservation();

    }, [id]);

    // countdown timer

    useEffect(() => {

        if (!reservation) return;

        // stop timer for completed reservations

        if (
            reservation.status === "CONFIRMED" ||
            reservation.status === "RELEASED"
        ) {
            return;
        }

        const updateTimer = () => {
            const expiry =
                new Date(
                    reservation.expiresAt
                ).getTime();

            const now =
                Date.now();

            const difference =
                expiry - now;

            if (difference <= 0) {
                setTimeLeft(
                    "Expired"
                );
                return false;
            }

            const minutes =
                Math.floor(
                    difference / 1000 / 60
                );

            const seconds =
                Math.floor(
                    (difference / 1000) % 60
                );

            setTimeLeft(
                `${minutes}m ${seconds}s`
            );
            return true;
        };

        // run immediately to avoid 1-second visual delay
        const active = updateTimer();
        if (!active) return;

        const interval =
            setInterval(() => {
                const active = updateTimer();
                if (!active) {
                    clearInterval(
                        interval
                    );
                }
            }, 1000);

        return () =>
            clearInterval(interval);

    }, [reservation]);

    // confirm purchase

    async function confirmPurchase() {

        if (!reservation) return;

        try {

            const response =
                await axios.post(
                    `/api/reservations/${reservation.id}/confirm`
                );

            setReservation(
                response.data
            );

            alert(
                "Purchase confirmed!"
            );

        } catch (error: unknown) {

            const axiosError = error as { response?: { data?: { error?: string } } };
            alert(
                axiosError?.response?.data?.error ||
                "Confirmation failed"
            );
        }
    }

    // cancel reservation

    async function cancelReservation() {

        if (!reservation) return;

        try {

            const response =
                await axios.post(
                    `/api/reservations/${reservation.id}/release`
                );

            setReservation(
                response.data
            );

            alert(
                "Reservation cancelled"
            );

        } catch (error: unknown) {

            const axiosError = error as { response?: { data?: { error?: string } } };
            alert(
                axiosError?.response?.data?.error ||
                "Cancellation failed"
            );
        }
    }

    // loading state

    if (loading) {

        return (
            <div className="p-10">
                Loading...
            </div>
        );
    }

    // error state

    if (error) {

        return (
            <div className="p-10 text-red-500">
                {error}
            </div>
        );
    }

    // missing reservation

    if (!reservation) {

        return (
            <div className="p-10">
                Reservation missing
            </div>
        );
    }

    const isCompleted =
        reservation.status === "CONFIRMED" ||
        reservation.status === "RELEASED";

    const isExpired =
        timeLeft === "Expired";

    const timeLeftDisplay =
        isCompleted ? "Completed" : timeLeft;

    return (

        <main className="p-10">

            <div
                className="
          max-w-xl
          border
          rounded-xl
          p-8
          shadow
        "
            >

                <h1 className="text-3xl font-bold mb-6">

                    Reservation

                </h1>

                <p>
                    ID:
                    {" "}
                    {reservation.id}
                </p>

                <p className="mt-2">

                    Status:

                    <span
                        className={`
                    ml-2
                    font-semibold

                    ${reservation.status ===
                                "CONFIRMED"
                                ? "text-green-600"
                                : reservation.status ===
                                    "RELEASED"
                                    ? "text-red-600"
                                    : "text-yellow-600"
                            }
                    `}
                    >

                        {reservation.status}

                    </span>
                </p>

                <p className="mt-2">
                    Quantity:
                    {" "}
                    {reservation.quantity}
                </p>

                <p className="mt-2">
                    Expires in:
                    {" "}
                    {timeLeftDisplay}
                </p>

                <div className="flex gap-4 mt-8">

                    <button

                        onClick={
                            confirmPurchase
                        }

                        disabled={
                            reservation.status !==
                            "PENDING" ||
                            isExpired
                        }

                        className="
              bg-green-600
              text-white
              px-4
              py-2
              rounded-lg
              disabled:opacity-50
            "
                    >

                        Confirm Purchase

                    </button>

                    <button

                        onClick={
                            cancelReservation
                        }

                        disabled={
                            reservation.status !==
                            "PENDING" ||
                            isExpired
                        }

                        className="
              bg-red-600
              text-white
              px-4
              py-2
              rounded-lg
              disabled:opacity-50
            "
                    >

                        Cancel

                    </button>
                </div>
            </div>
        </main>
    );
}
