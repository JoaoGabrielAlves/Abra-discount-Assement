import CurrencyFormatter from './CurrencyFormatter';

class Discount {
  constructor() {
    const {
      cartItems,
      volumeDiscount,
      currentTemplate
    } = window.DiscountPrototype;

    this.cartItems = cartItems;
    this.volumeDiscount = volumeDiscount;
    this.currentTemplate = currentTemplate;

    this.currencyFormat = new CurrencyFormatter();
  }

  setCartItems(cartItems) {
    this.cartItems = cartItems
  }

  applyDiscount(priceContainer, lineItem) {
    if (lineItem?.quantity >= this.volumeDiscount.quantity) {
      const originalPrice = lineItem.original_price;
      const discountAmount = Math.floor(originalPrice * (this.volumeDiscount.percentage / 100));
      const finalPrice = originalPrice - discountAmount;

      const formattedOriginalPrice = this.currencyFormat.formatMoney(originalPrice);
      const formattedFinalPrice = this.currencyFormat.formatMoney(finalPrice);

      this.applyDiscountOnPriceContainer(priceContainer, { formattedOriginalPrice, formattedFinalPrice });
    }
  }

  removeDiscount(priceContainer, {compareAtPrice, originalPrice})
  {
    const formattedCompareAtPrice = this.currencyFormat.formatMoney(compareAtPrice);
    const formattedOriginalPrice = this.currencyFormat.formatMoney(originalPrice);

    this.resetPriceContainer(priceContainer, {
      formattedOriginalPrice,
      formattedCompareAtPrice
    })
  }

  applyDiscountOnPriceContainer(priceContainer, {formattedOriginalPrice, formattedFinalPrice}) {
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

  resetPriceContainer(priceContainer, {
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

export default Discount
