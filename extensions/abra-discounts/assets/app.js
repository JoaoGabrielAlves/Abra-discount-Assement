class DiscountManager {
  constructor() {
    const {
      cartItems,
      volumeDiscount,
      format,
      productId,
      variantId,
      currentTemplate
    } = window.DiscountPrototype;

    this.cartItems = cartItems;
    this.volumeDiscount = volumeDiscount;
    this.format = format;
    this.productId = productId;
    this.variantId = variantId;
    this.currentTemplate = currentTemplate;
  }

  getCurrentTemplate() {
    return this.currentTemplate
  }

  formatMoney(price) {
    price = (price / 100).toFixed(2);

    const [currencyAmount, centsAmount = ""] = price.split(".");
    return `${currencyAmount},${centsAmount}`;
  }

  applyDiscount(priceContainer, lineItem) {
    const regex = /\{\{.*?\}\}/;

    if (lineItem?.quantity >= this.volumeDiscount.quantity) {
      const originalPrice = lineItem.original_price;
      const discountAmount = Math.floor(originalPrice * (this.volumeDiscount.percentage / 100));
      const finalPrice = originalPrice - discountAmount;

      const formattedOriginalPrice = this.format.replace(regex, this.formatMoney(originalPrice));
      const formattedFinalPrice = this.format.replace(regex, this.formatMoney(finalPrice));

      this.applyDiscountToContainer(priceContainer, { formattedOriginalPrice, formattedFinalPrice });
    }
  }

  applyDiscountToContainer(priceContainer, formattedPrices) {
    priceContainer.innerHTML = `<div class="price price--on-sale">
        <div class="price__container">
          <div class="price__regular">
            <span class="visually-hidden visually-hidden--inline">Regular price</span>
            <span class="price-item price-item--regular">
              ${formattedPrices.formattedOriginalPrice}
            </span>
          </div>
          <div class="price__sale">
            <span class="visually-hidden visually-hidden--inline">Regular price</span>
            <span>
              <s class="price-item price-item--regular">
                ${formattedPrices.formattedOriginalPrice}
              </s>
            </span>
            <span class="visually-hidden visually-hidden--inline">Sale price</span>
            <span class="price-item price-item--sale price-item--last">
              ${formattedPrices.formattedFinalPrice}
            </span>
          </div>
        </div>
      </div>`;
  }
}

class ProductDiscountManager extends DiscountManager {
  getProductLineItem() {
    const urlSearchParams = new URLSearchParams(window.location.search);
    if (urlSearchParams.get('variant')) {
      this.variantId = urlSearchParams.get('variant');
    }

    return this.cartItems.find(
      (lineItem) => lineItem.product_id === this.productId && lineItem.variant_id === Number(this.variantId)
    );
  }

  applyProductDiscount() {
    const line = this.getProductLineItem();
    const priceContainer = document.querySelector('#MainContent .price:not(.price--end)');

    this.applyDiscount(priceContainer, line);
  }
}

class CollectionDiscountManager extends DiscountManager {
  findProductHandles() {
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

  async fetchProductByHandle(item) {
    // It would be nice to have some caching logic.
    const productHandle = item.handle;

    const response = await fetch(window.Shopify.routes.root + `products/${productHandle}.js`, {
      headers: { "Content-Type": "application/json" }
    });

    const productData = await response.json();

    return productData.variants[0]
  }

  async filterDiscountedItems(handleArray) {
    const itemsWithDiscount = this.cartItems.filter((item) => {
      const isHandleIncluded = handleArray.includes(item.handle);
      const isQuantityValid = item.quantity >= this.volumeDiscount.quantity;

      if (this.currentTemplate === "product") {
        const isVariantValid = !this.variantId || Number(item.variant_id) !== Number(this.variantId);

        return isHandleIncluded && isQuantityValid && isVariantValid;
      }

      return isHandleIncluded && isQuantityValid;
    });

    const productVariant = await Promise.all(itemsWithDiscount.map(item => this.fetchProductByHandle(item)));

    const productVariantIds = productVariant.map(variant => variant.id)

    // The discount is applied to the variant, so we need to make sure the correct variant has the discount before applying it.
    return itemsWithDiscount.filter((item) => {
      return productVariantIds.includes(item.variant_id)
    })
  }
  applyDiscountsToCartItems(cartItems) {
    cartItems.forEach((item) => {
      const priceContainer = document.querySelector(
        `[price-container=${item.handle}]`
      );

      if (priceContainer) {
        this.applyDiscount(priceContainer, item);
      }
    });
  }

  async applyCollectionDiscount() {
    const handleArray = this.findProductHandles();
    const discountedItems = await this.filterDiscountedItems(handleArray);
    this.applyDiscountsToCartItems(discountedItems);
  }
}

document.addEventListener('DOMContentLoaded', function () {
  const productDiscountManager = new ProductDiscountManager();

  if (productDiscountManager.getCurrentTemplate() === 'product') {
    productDiscountManager.applyProductDiscount();
  }

  window.history.replaceState = new Proxy(window.history.replaceState, {
    apply: (target, thisArg, argArray) => {
      setTimeout(() => {
        productDiscountManager.applyProductDiscount();
      }, 500);

      return target.apply(thisArg, argArray);
    },
  });

  const collectionDiscountManager = new CollectionDiscountManager();
  collectionDiscountManager.applyCollectionDiscount();
});
