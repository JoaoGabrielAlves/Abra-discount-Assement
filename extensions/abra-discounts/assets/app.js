class DiscountManager {
  constructor() {
    const {
      cartItems,
      volumeDiscount,
      format,
      product,
      variantId,
      currentTemplate
    } = window.DiscountPrototype;

    this.cartItems = cartItems;
    this.volumeDiscount = volumeDiscount;
    this.format = format;
    this.product = product;
    this.productId = product?.id;
    this.variantId = variantId;
    this.currentTemplate = currentTemplate;
    this.amountRegex = /\{\{.*?\}\}/;
  }

  setCartItems(cartItems) {
    this.cartItems = cartItems
  }

  formatMoney(price) {
    price = (price / 100).toFixed(2);

    const [currencyAmount, centsAmount = ""] = price.split(".");
    return `${currencyAmount},${centsAmount}`;
  }

  applyDiscount(priceContainer, lineItem) {
    if (lineItem?.quantity >= this.volumeDiscount.quantity) {
      const originalPrice = lineItem.original_price;
      const discountAmount = Math.floor(originalPrice * (this.volumeDiscount.percentage / 100));
      const finalPrice = originalPrice - discountAmount;

      const formattedOriginalPrice = this.format.replace(this.amountRegex, this.formatMoney(originalPrice));
      const formattedFinalPrice = this.format.replace(this.amountRegex, this.formatMoney(finalPrice));

      this.applyDiscountToContainer(priceContainer, { formattedOriginalPrice, formattedFinalPrice });
    }
  }

  removeDiscount(priceContainer, {compareAtPrice, originalPrice})
  {
    const formattedCompareAtPrice = this.format.replace(this.amountRegex, this.formatMoney(compareAtPrice));
    const formattedOriginalPrice = this.format.replace(this.amountRegex, this.formatMoney(originalPrice));

    this.removeDiscountFromContainer(priceContainer, {
      formattedOriginalPrice,
      formattedCompareAtPrice
    })
  }

  applyDiscountToContainer(priceContainer, {formattedOriginalPrice, formattedFinalPrice}) {
    priceContainer.innerHTML = `<div class="price price--on-sale">
        <div class="price__container">
          <div class="price__regular">
            <span class="visually-hidden visually-hidden--inline">Regular price</span>
            <span class="price-item price-item--regular">
              ${formattedOriginalPrice}
            </span>
          </div>
          <div class="price__sale">
            <span class="visually-hidden visually-hidden--inline">Regular price</span>
            <span>
              <s class="price-item price-item--regular">
                ${formattedOriginalPrice}
              </s>
            </span>
            <span class="visually-hidden visually-hidden--inline">Sale price</span>
            <span class="price-item price-item--sale price-item--last">
              ${formattedFinalPrice}
            </span>
          </div>
        </div>
      </div>`;
  }

  removeDiscountFromContainer(priceContainer, {
    formattedOriginalPrice,
    formattedCompareAtPrice
  }) {
    priceContainer.innerHTML = `
      <div class="price ${this.currentTemplate === 'product' ? 'price--large price--show-badge' : ''}">
        <div class="price__container">
          <div class="price__regular">
            <span class="visually-hidden visually-hidden--inline">Regular price</span>
            <span class="price-item price-item--regular">${formattedOriginalPrice}</span>
          </div>
          <div class="price__sale">
            <span class="visually-hidden visually-hidden--inline">Regular price</span>
            <span><s class="price-item price-item--regular">${formattedOriginalPrice}</s></span>
            <span class="visually-hidden visually-hidden--inline">Sale price</span>
            <span class="price-item price-item--sale price-item--last">${formattedCompareAtPrice}</span>
          </div>
        </div>
      </div>
    `;
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

  removeProductDiscount()
  {
    const priceContainer = document.querySelector('#MainContent .price:not(.price--end)');

    const compareAtPrice = this.product.compare_at_price
    const originalPrice = this.product.price

    this.removeDiscount(priceContainer, {
      compareAtPrice,
      originalPrice
    });
  }
}

class CollectionDiscountManager extends DiscountManager {
  constructor() {
    super()

    this.products = {}
  }

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

  removeCollectionDiscount() {
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

function applyDiscounts(collectionDiscountManager, productDiscountManager) {
  collectionDiscountManager.applyCollectionDiscount();

  if (window.DiscountPrototype.currentTemplate === 'product') {
    productDiscountManager.applyProductDiscount();

    window.history.replaceState = new Proxy(window.history.replaceState, {
      apply: (target, thisArg, argArray) => {
        setTimeout(() => {
          productDiscountManager.applyProductDiscount();
        }, 500);

        return target.apply(thisArg, argArray);
      },
    });
  }
}

document.addEventListener('DOMContentLoaded', function () {
  const collectionDiscountManager = new CollectionDiscountManager();
  const productDiscountManager = new ProductDiscountManager();

  applyDiscounts(collectionDiscountManager, productDiscountManager);

  const cartObserver = new PerformanceObserver(async (list) => {
    for (const entry of list.getEntries()) {
      const isValidRequestType = ['xmlhttprequest', 'fetch'].includes(entry.initiatorType);
      const isCartChangeRequest = /\/cart\//.test(entry.name);

      if (isValidRequestType && isCartChangeRequest) {
        try {
          const response = await fetch('/cart.js');
          const cart = await response.json();

          if (window.DiscountPrototype.currentTemplate === 'product') {
            productDiscountManager.removeProductDiscount();
          }

          collectionDiscountManager.removeCollectionDiscount();

          collectionDiscountManager.setCartItems(cart.items);
          productDiscountManager.setCartItems(cart.items);

          setTimeout(() => {
            applyDiscounts(collectionDiscountManager, productDiscountManager);
          }, 200)
        } catch (error) {
          console.error('Error fetching cart data:', error);
        }
      }
    }
  });

  cartObserver.observe({ entryTypes: ["resource"] });
});
