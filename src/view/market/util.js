import { get } from "../../../util";
import { INDUSTRIES } from "../../constant";

export function marketInvestmentRequirement(state, market) {
  const currentMarketStock = get(state, ["industry", market.key, "stock"]);
  const { costRate } = INDUSTRIES[market.key];
  const requiredSupplyInvestment = costRate * (currentMarketStock + 1);
  return requiredSupplyInvestment;
}
