import type {
  RunInput,
  FunctionRunResult, ProductVariant
} from "../generated/api";
import {
  DiscountApplicationStrategy,
} from "../generated/api";

const EMPTY_DISCOUNT: FunctionRunResult = {
  discountApplicationStrategy: DiscountApplicationStrategy.First,
  discounts: [],
};

export function run(input: RunInput): FunctionRunResult {
  const configuration: {
      quantity: number;
      percentage: number;
  } = JSON.parse(
      input?.discountNode?.metafield?.value ?? "{}"
  );

  if (!configuration.quantity || !configuration.percentage) {
      return EMPTY_DISCOUNT;
  }

  const targets = input.cart.lines
    .filter(line => line.quantity >= configuration.quantity &&
      line.merchandise.__typename == "ProductVariant")
    .map(line => {
      const variant = line.merchandise as ProductVariant;

      return {
        productVariant: {
          id: variant.id
        }
      };
    });

  if (!targets.length) {
    console.error("No cart lines qualify for volume discount.");
    return EMPTY_DISCOUNT;
  }

  return {
    discounts: [
      {
        targets,
        value: {
          percentage: {
            value: configuration.percentage.toString()
          }
        }
      }
    ],
    discountApplicationStrategy: DiscountApplicationStrategy.First
  };
}
