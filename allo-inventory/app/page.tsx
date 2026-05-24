"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Product = {

  inventoryId: string;

  productId: string;

  productName: string;

  warehouseId: string;

  warehouseName: string;

  totalQuantity: number;

  reservedQuantity: number;

  availableQuantity: number;
};

export default function HomePage() {

  const router = useRouter();

  const [products, setProducts] =
    useState<Product[]>([]);

  const [loading, setLoading] =
    useState(true);

  async function loadProducts() {

    try {

      const response =
        await axios.get(
          "/api/products"
        );

      setProducts(
        response.data
      );

    } catch (error) {

      console.error(error);
    }

    setLoading(false);
  }

  useEffect(() => {

    Promise.resolve().then(() => {
      loadProducts();
    });

  }, []);

  async function reserveProduct(
    product: Product
  ) {

    try {

      const response =
        await axios.post(
          "/api/reservations",
          {
            productId:
              product.productId,

            warehouseId:
              product.warehouseId,

            quantity: 1,
          }
        );

      router.push(
        `/reservation/${response.data.id}`
      );

    } catch (error: unknown) {

      const axiosError = error as { response?: { data?: { error?: string } } };
      alert(
        axiosError?.response?.data?.error ||
        "Reservation failed"
      );
    }
  }

  if (loading) {

    return (

      <main
        className="
          min-h-screen
          flex
          items-center
          justify-center
          bg-zinc-950
          text-white
        "
      >

        Loading...

      </main>
    );
  }

  return (

    <main
      className="
        min-h-screen
        bg-zinc-950
        text-white
        px-6
        py-10
      "
    >

      <div
        className="
          max-w-6xl
          mx-auto
        "
      >

        <div
          className="
            flex
            items-center
            justify-between
            mb-10
          "
        >

          <div>

            <h1
              className="
                text-5xl
                font-bold
                tracking-tight
              "
            >

              Inventory System

            </h1>

            <p
              className="
                text-zinc-400
                mt-3
                text-lg
              "
            >

              Multi-warehouse
              inventory reservation platform

            </p>
          </div>

          <button

            onClick={
              loadProducts
            }

            className="
              bg-white
              text-black
              px-5
              py-3
              rounded-xl
              font-semibold
              hover:opacity-80
              transition
            "
          >

            Refresh

          </button>
        </div>

        <div
          className="
            grid
            grid-cols-1
            md:grid-cols-2
            gap-6
          "
        >

          {products.map(
            (product) => (

              <div

                key={
                  product.inventoryId
                }

                className="
                  bg-zinc-900
                  border
                  border-zinc-800
                  rounded-3xl
                  p-7
                  shadow-xl
                  transition
                  hover:border-zinc-700
                "
              >

                <div
                  className="
                    flex
                    items-start
                    justify-between
                  "
                >

                  <div>

                    <h2
                      className="
                        text-3xl
                        font-semibold
                      "
                    >

                      {
                        product.productName
                      }

                    </h2>

                    <p
                      className="
                        text-zinc-400
                        mt-2
                      "
                    >

                      {
                        product.warehouseName
                      }

                    </p>
                  </div>

                  <div
                    className={`
                      px-4
                      py-2
                      rounded-full
                      text-sm
                      font-semibold

                      ${product.availableQuantity > 0
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                      }
                    `}
                  >

                    {
                      product.availableQuantity > 0
                        ? "In Stock"
                        : "Out of Stock"
                    }

                  </div>
                </div>

                <div
                  className="
                    mt-8
                    space-y-3
                    text-zinc-300
                  "
                >

                  <p>

                    Total Stock:
                    {" "}

                    <span className="text-white font-semibold">

                      {
                        product.totalQuantity
                      }

                    </span>
                  </p>

                  <p>

                    Reserved:
                    {" "}

                    <span className="text-white font-semibold">

                      {
                        product.reservedQuantity
                      }

                    </span>
                  </p>

                  <p>

                    Available:
                    {" "}

                    <span
                      className="
                        text-white
                        font-semibold
                        text-lg
                      "
                    >

                      {
                        product.availableQuantity
                      }

                    </span>
                  </p>
                </div>

                <button

                  onClick={() =>
                    reserveProduct(
                      product
                    )
                  }

                  disabled={
                    product.availableQuantity <= 0
                  }

                  className="
                    mt-8
                    w-full
                    bg-white
                    text-black
                    py-4
                    rounded-2xl
                    font-semibold
                    text-lg
                    hover:opacity-80
                    transition
                    disabled:opacity-40
                    disabled:cursor-not-allowed
                  "
                >

                  Reserve Now

                </button>
              </div>
            )
          )}
        </div>
      </div>
    </main>
  );
}