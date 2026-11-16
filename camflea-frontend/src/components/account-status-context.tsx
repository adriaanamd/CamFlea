import { createContext, useContext, type ReactNode } from "react";

import {
  canUseMarketplace,
  type AccountStatus,
  type AccountStatusSnapshot,
} from "@/lib/domain/account-status";

export type AccountStatusValue = AccountStatusSnapshot & {
  canUseMarketplace: boolean;
};

const AccountStatusContext = createContext<AccountStatusValue | null>(null);

export function AccountStatusProvider({
  value,
  children,
}: {
  value: Omit<AccountStatusValue, "canUseMarketplace">;
  children: ReactNode;
}) {
  return (
    <AccountStatusContext.Provider value={{ ...value, canUseMarketplace: canUseMarketplace(value.status) }}>
      {children}
    </AccountStatusContext.Provider>
  );
}

export function useAccountStatus() {
  const value = useContext(AccountStatusContext);
  if (!value) {
    throw new Error("useAccountStatus must be used inside AccountStatusProvider");
  }
  return value;
}

export function useOptionalAccountStatus() {
  return useContext(AccountStatusContext);
}

export type { AccountStatus };
