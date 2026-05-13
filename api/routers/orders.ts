import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";

interface OrderRecord {
  id: string;
  planName: string;
  amount: string;
  walletAddress: string;
  status: "pending" | "confirming" | "completed" | "failed";
  createdAt: string;
}

const orders: OrderRecord[] = [];

export const ordersRouter = createRouter({
  create: publicQuery
    .input(
      z.object({
        planName: z.string().min(1).max(100),
        amount: z.string().min(1).max(20),
        walletAddress: z.string().min(1).max(100),
      })
    )
    .mutation(async ({ input }) => {
      const order: OrderRecord = {
        id: `TX-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        planName: input.planName,
        amount: input.amount,
        walletAddress: input.walletAddress,
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      orders.push(order);
      return { orderId: order.id, status: order.status };
    }),

  status: publicQuery
    .input(z.object({ orderId: z.string().min(1) }))
    .query(async ({ input }) => {
      const order = orders.find((o) => o.id === input.orderId);
      if (!order) throw new Error("Order not found");
      return { status: order.status, createdAt: order.createdAt };
    }),
});
