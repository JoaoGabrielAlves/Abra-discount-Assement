import Discount from "../Discount";

class CollectionDiscountManager extends Discount {
  constructor() {
    super()

    this.products = {}
  }

  getProductHandles() {
    let productsHandles = new Set();

    document.querySelectorAll('a').forEach(function (target) {
      const productCard = target.closest('.product-card-wrapper');

      if (productCard) {
        const parts = target.href.split('/');
        const priceContainer = productCard.querySelector(
          '.price:not(.price--end, .price--sold-out)'
        );

        const productsIndex = parts.indexOf('products');

        if (productsIndex !== -1) {
          const productHandle = parts[productsIndex + 1];

          productsHandles.add(productHandle);

          if (priceContainer) {
            priceContainer.setAttribute('price-container', productHandle);
          }
        }
      }
    });

    return Array.from(productsHandles);
  }

  async fetchProductByHandle(productHandle) {
    if (productHandle in this.products) {
      return this.products[productHandle]
    }

    const response = await fetch(window.Shopify.routes.root + `products/${productHandle}.js`, {
      headers: { "Content-Type": "application/json" }
    });

    const productData = await response.json();

    this.products[productHandle] = productData

    return productData
  }

  async getDiscountedCartItems(handleArray) {
    const itemsWithDiscount = this.cartItems.filter((item) => {
      const isHandleIncluded = handleArray.includes(item.handle);
      const isQuantityValid = item.quantity >= this.volumeDiscount.quantity;

      if (this.currentTemplate === "product") {
        const isVariantValid = !this.variantId || item.variant_id !== this.variantId;

        return isHandleIncluded && isQuantityValid && isVariantValid;
      }

      return isHandleIncluded && isQuantityValid;
    });

    const productVariants = await Promise.all(itemsWithDiscount.map(item => this.fetchProductByHandle(item.handle)))
      .then(products => products.map(product => product.variants[0]))
      .catch(error => {
        console.error('Error fetching product variants:', error);
      });

    const productVariantIds = productVariants.map(variant => variant.id)

    // The discount is applied to the variant, so we need to make sure the correct variant has the discount before applying it.
    return itemsWithDiscount.filter((item) => {
      return productVariantIds.includes(item.variant_id)
    })
  }

  applyDiscountsToDiscountedCartItems(cartItems) {
    cartItems.forEach((item) => {
      const priceContainer = document.querySelector(
        `[price-container=${item.handle}]`
      );

      if (priceContainer) {
        this.applyDiscount(priceContainer, item);
      }
    });
  }

  async applyProductsDiscounts() {
    const handleArray = this.getProductHandles();
    const discountedItems = await this.getDiscountedCartItems(handleArray);

    this.applyDiscountsToDiscountedCartItems(discountedItems);
  }

  resetProductsPrices() {
    const priceContainers = document.querySelectorAll('[price-container]');

    priceContainers.forEach((priceContainer) => {
      const productHandle = priceContainer.getAttribute('price-container');

      let product = {}

      if (productHandle in this.products) {
        product = this.products[productHandle];

        const compareAtPrice = product.compare_at_price
        const originalPrice = product.price

        this.removeDiscount(priceContainer, {
          compareAtPrice,
          originalPrice
        });
      }
    })
  }
}


export default CollectionDiscountManager
