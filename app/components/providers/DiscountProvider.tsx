import { AppProvider } from "@shopify/discount-app-components";
import "@shopify/discount-app-components/build/esm/styles.css";
import type {ReactNode} from "react";

export function DiscountProvider({ children }: {children: ReactNode}) {
  return (
    <AppProvider locale="en-US" ianaTimezone="America/Toronto">
      {children}
    </AppProvider>
  );
}
