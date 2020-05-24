import { allKeyPaths, get, set, updateAll, omit } from "../../../util";
import { INDUSTRIES } from "../../constant";

export function marketInvestmentRequirement(state, market) {
  const currentMarketStock = get(state, ["industry", market.key, "stock"]);
  const { costRate } = INDUSTRIES[market.key]; // TODO need this? Maybe it should be a function? :thinking:
  const requiredSupplyInvestment = Math.max(
    1,
    (1 + market.offset) * costRate * currentMarketStock
  );
  return requiredSupplyInvestment;
}
