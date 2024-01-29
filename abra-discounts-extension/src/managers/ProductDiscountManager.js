import Discount from "../Discount";

class ProductDiscountManager extends Discount {
  constructor() {
    super();

    const {
      product,
      variantId,
    } = window.DiscountPrototype;

    this.product = product;
    this.variantId = variantId;

    this.setVariantIdByUrl();
  }

  setVariantIdByUrl() {
    const urlSearchParams = new URLSearchParams(window.location.search);

    if (urlSearchParams.get('variant')) {
      this.variantId = Number(urlSearchParams.get('variant'));
    }
  }

  getProductLineItem() {
    return this.cartItems.find(
      (lineItem) => lineItem.product_id === this.product.id && lineItem.variant_id === this.variantId
    );
  }

  applyProductDiscount() {
    this.setVariantIdByUrl();

    const line = this.getProductLineItem();

    if (line) {
      const priceContainer = document.querySelector('#MainContent .price:not(.price--end)');

      this.applyDiscount(priceContainer, line);
    }
  }

  resetProductPrice()
  {
    const priceContainer = document.querySelector('#MainContent .price:not(.price--end)');

    const variant = this.product.variants.find(variant => variant.id === this.variantId)

    if (variant) {
      const compareAtPrice = variant.compare_at_price
      const originalPrice = variant.price

      this.removeDiscount(priceContainer, {
        compareAtPrice,
        originalPrice
      });
    }
  }
}

export default ProductDiscountManager
