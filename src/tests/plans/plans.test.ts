import { beforeEach, describe, expect, it } from "vitest";
import { db, schema } from "../../db/client";
import {createAuthenticatedCaller, createCaller, createUser, Plan, User} from "../helpers/utils";
import {eq} from "drizzle-orm";
import { trpcError } from "../../trpc/core";
import resetDb from "../helpers/resetDb";
import {upgradePriceCalculation} from "../../modules/plans/model";

describe("plans routes", async () => {
  beforeEach(async () => {
    await resetDb();
  });
  const normalUserInfo: User = {
    email: "normaluser@mail.com",
    password: "P@ssw0rd",
    name: "test",
    timezone: "Asia/Riyadh",
    locale: "en",
  };
  const admUserInfo: User = {
    email: "admuser@mail.com",
    password: "P@ssw0rd",
    name: "test",
    timezone: "Asia/Riyadh",
    locale: "en",
  };
  const plan1Info: Plan = {
    name: "planName1",
    price: 300
  };
  const plan2Info: Plan = {
    name: "planName2",
    price: 600
  };
  const plan3Info: Plan = {
    name: "planName3",
    price: 900
  };
  const getPlanByNameFromDb = async (name) => {
    return await db.query.plans.findFirst({
      where: eq(schema.plans.name, name),
    });
  }
  describe("create", async () => {
    const plan = plan1Info;
    it("should throw error when user is not admin", async () => {
      const normalUser = await createUser(normalUserInfo);
      await expect(createAuthenticatedCaller({userId: normalUser!.id}).plans.create(plan)).rejects.toThrowError(
          new trpcError({
            code: "UNAUTHORIZED",
          })
      );
    });
    it("should create plan successfully", async () => {
      const admUser = await createUser(admUserInfo, true);
      let planCreateRes = await createAuthenticatedCaller({userId: admUser!.id}).plans.create(plan);
      expect(planCreateRes.success).toBe(true);
      const planIndb = await getPlanByNameFromDb(plan.name);
      expect(planIndb).toBeDefined();
      expect(planIndb.name).toBe(plan.name);
      expect(planIndb.price).toBe(plan.price);
    });
  });
  describe("update", async () => {
    it("should throw error when user is not admin", async () => {
      const plan = plan1Info;
      const planAfterUpdate = plan2Info;
      const admUser = await createUser(admUserInfo, true);
      await createAuthenticatedCaller({userId: admUser!.id}).plans.create(plan);
      const planIndb = await getPlanByNameFromDb(plan.name);
      const normalUser = await createUser(normalUserInfo);
      await expect(createAuthenticatedCaller({userId: normalUser!.id}).plans.update({...planAfterUpdate, planId: planIndb.id})).rejects.toThrowError(
          new trpcError({
            code: "UNAUTHORIZED",
          })
      );
    });
    it("should create plan successfully", async () => {
      const plan = plan1Info;
      const planAfterUpdate = plan2Info;
      const admUser = await createUser(admUserInfo, true);
      await createAuthenticatedCaller({userId: admUser!.id}).plans.create(plan);
      const planIndb = await getPlanByNameFromDb(plan.name);
      let planUpdateRes = await createAuthenticatedCaller({userId: admUser!.id}).plans.update({...planAfterUpdate, planId: planIndb.id});
      expect(planUpdateRes.success).toBe(true);
      const planAfterUpdateIndb = await db.query.plans.findFirst({
        where: eq(schema.plans.id, planIndb.id),
      });
      expect(planAfterUpdateIndb).toBeDefined();
      expect(planAfterUpdateIndb!.name).toBe(planAfterUpdate.name);
      expect(planAfterUpdateIndb!.price).toBe(planAfterUpdate.price);
    });
  });
  describe("read", async () => {
    it("should read all plans successfully", async () => {
      const plans = [
        plan1Info,
        plan2Info,
        plan3Info,
      ];
      const admUser = await createUser(admUserInfo, true);
      for (const plan of plans) {
        let planCreateRes = await createAuthenticatedCaller({userId: admUser!.id}).plans.create(plan);
        expect(planCreateRes.success).toBe(true);
      }

      let plansRes: any = await createCaller({}).plans.read({});
      expect(plansRes).toBeDefined();

      expect(plans.length).toBe(plansRes.length);
      const sortedPlans = plans.sort((a, b) => (a.name > b.name ? 1 : -1));
      const sortedPlansInDb = plansRes.sort((a, b) => (a.name > b.name ? 1 : -1));

      // Check if each corresponding object in both arrays has the same name and price
      sortedPlans.every((plan, index) => {
        const correspondingPlan = sortedPlansInDb[index];
        expect(plan.name).toBe(correspondingPlan.name);
        expect(plan.price).toBe(correspondingPlan.price);
      });
    });
  });
  describe("upgradePriceCalculation", async () => {
    it("should get upgradePriceCalculation successfully", async () => {
      const plans = [
        plan1Info,
        plan2Info,
      ];
      const admUser = await createUser(admUserInfo, true);
      for (const plan of plans) {
        let planCreateRes = await createAuthenticatedCaller({userId: admUser!.id}).plans.create(plan);
        expect(planCreateRes.success).toBe(true);
      }

      const currentSubscriptionRemainingDays = 10;
      const result = await createCaller({}).plans.upgradePriceCalculation(
          {
            plan1Name: plans[0].name,
            plan2Name: plans[1].name,
            currentSubscriptionRemainingDays: currentSubscriptionRemainingDays
          });
      expect(result).toBeDefined();
      expect(result).toBe(upgradePriceCalculation(plans[0],plans[1], currentSubscriptionRemainingDays));//will be 100 in this case
    });
  });
});
