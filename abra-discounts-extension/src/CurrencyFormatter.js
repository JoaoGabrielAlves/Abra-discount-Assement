class CurrencyFormatter {
  constructor() {
    const {
      format
    } = window.DiscountPrototype;

    this.format = format;
  }

  formatMoney(price) {
    const amountRegexWithoutBrackets = /{{(.*?)}}/

    const { thousandSeparator, centsSeparator, precision } = this.getCurrencyFormat();

    price = (price / 100).toFixed(precision);

    const [notCentsAmount, centsAmount = ""] = price.split(".");
    const formattedNotCentsAmount = this.formatThousandsSeparator(notCentsAmount, thousandSeparator);
    const formattedCentsAmount = centsAmount ? centsSeparator + centsAmount : "";

    const formattedPrice = formattedNotCentsAmount + formattedCentsAmount;

    return this.format.replace(amountRegexWithoutBrackets, formattedPrice);
  }

  getCurrencyFormat() {
    const amountRegexWithBracketsRegex = /{{.*?}}/;

    switch (amountRegexWithBracketsRegex) {
      case "amount":
        return { precision: 2, thousandSeparator: ",", centsSeparator: "." };
      case "amount_no_decimals":
        return { precision: 0, thousandSeparator: ",", centsSeparator: "." };
      case "amount_with_comma_separator":
        return { precision: 2, thousandSeparator: ".", centsSeparator: "," };
      case "amount_no_decimals_with_comma_separator":
        return { precision: 0, thousandSeparator: ".", centsSeparator: "," };
      case "amount_with_apostrophe_separator":
        return { precision: 2, thousandSeparator: "'", centsSeparator: "," };
      default:
        return { precision: 2, thousandSeparator: ",", centsSeparator: "." };
    }
  }

  formatThousandsSeparator(amount, separator) {
    return amount.replace(/\d/g, (match, index) => {
      return index > 0 && (amount.length - index) % 3 === 0 ? `${separator}${match}` : match;
    });
  }
}

export default CurrencyFormatter;
