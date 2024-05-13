import {protectedProcedure, publicProcedure, router, trpcError} from "../../trpc/core";
import {z} from "zod";
import {db, schema} from "../../db/client";
import {inArray,eq} from "drizzle-orm";
import {upgradePriceCalculation} from "./model";
import {Plan} from "../../tests/helpers/utils";

// noinspection TypeScriptValidateTypes
export const plans = router({
  create: protectedProcedure
      .input(z.object({ name: z.string(), price: z.number() }))
      .mutation(async ({ ctx: { user }, input }) => {
          const { userId } = user;
          const targetUser = await db.query.users.findFirst({
              where: eq(schema.users.id, userId),
          });
          if (!targetUser.isAdmin) {
              throw new trpcError({
                  code: "UNAUTHORIZED",
              });
          }
          const { name, price } = input;
            await db
                .insert(schema.plans)
                .values({
                    name,
                    price,
                })
                .returning();
          return {
              success: true,
          };
    }),
  update: protectedProcedure
      .input(z.object({ name: z.string(), price: z.number(), planId: z.number() }))
      .mutation(async ({ ctx: { user }, input }) => {
          const { userId } = user;
          const targetUser = await db.query.users.findFirst({
              where: eq(schema.users.id, userId),
          });
          if (!targetUser.isAdmin) {
              throw new trpcError({
                  code: "UNAUTHORIZED",
              });
          }
          const { name, price, planId } = input;
          await db.update(schema.plans)
              .set({
                  name,
                  price,
              })
              .where(eq(schema.plans.id, planId));
          return {
              success: true,
          };
      }),
  read: publicProcedure.query(async ({ ctx: { req, res } }) => {
        try {
            return await db.query.plans.findMany();
        } catch (error) {
            console.error("Error fetching plans", error);
            return [];
        }
    }),
  upgradePriceCalculation: publicProcedure
      .input(z.object({ plan1Name: z.string(), plan2Name: z.string(), currentSubscriptionRemainingDays: z.number() }))
      .query(async ({ ctx: { req, res }, input }) => {
          const {plan1Name, plan2Name, currentSubscriptionRemainingDays} = input;
          const plans = await db.query.plans.findMany({
              where:  inArray(schema.plans.name, [plan1Name, plan2Name])
          });
          let plan1: Plan,plan2: Plan;
          for(const plan of plans){
              if(plan.name == plan1Name){
                  plan1 = plan;
              }else{
                  plan2 = plan;
              }
          }
          if (!plan1 || !plan2) {
              throw new trpcError({
                  code: "BAD_REQUEST",
              });
          }
          return upgradePriceCalculation(plan1, plan2, currentSubscriptionRemainingDays);
    }),
});
