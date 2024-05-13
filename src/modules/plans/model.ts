import {Plan} from "../../tests/helpers/utils";

export const upgradePriceCalculation = (plan1: Plan, plan2: Plan, currentSubscriptionRemainingDays: number) => {
  let planDurationDays = 30;
  return (
      plan2.price
      - (plan2.price/planDurationDays) * (planDurationDays - currentSubscriptionRemainingDays) //The subscription price for the past days of plan2
      - (plan1.price/planDurationDays) * currentSubscriptionRemainingDays //The subscription price for the remaining days of plan1
  );
}
