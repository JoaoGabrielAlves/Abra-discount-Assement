import CollectionDiscountManager from "./managers/CollectionDiscountManager";
import ProductDiscountManager from "./managers/ProductDiscountManager";

function applyDiscounts(collectionDiscountManager, productDiscountManager) {
  collectionDiscountManager.applyProductsDiscounts();

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
            productDiscountManager.resetProductPrice();
          }

          collectionDiscountManager.resetProductsPrices();

          collectionDiscountManager.setCartItems(cart.items);
          productDiscountManager.setCartItems(cart.items);

          applyDiscounts(collectionDiscountManager, productDiscountManager);
        } catch (error) {
          console.error('Error fetching cart data:', error);
        }
      }
    }
  });

  cartObserver.observe({ entryTypes: ["resource"] });
});
