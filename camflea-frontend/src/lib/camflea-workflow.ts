export type TransactionStatus =
  | "cart"
  | "requested"
  | "sent"
  | "received"
  | "completed"
  | "cancelled";

export type TransactionAction = "request" | "accept" | "received" | "complete" | "cancel";

const allowedActions: Record<TransactionStatus, TransactionAction[]> = {
  cart: ["request", "cancel"],
  requested: ["accept", "cancel"],
  sent: ["received", "cancel"],
  received: ["complete", "cancel"],
  completed: [],
  cancelled: [],
};

export function canTakeTransactionAction(status: TransactionStatus, action: TransactionAction) {
  return allowedActions[status].includes(action);
}

export function formatPeso(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "Price hidden";
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value);
}