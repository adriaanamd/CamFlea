export type TransactionStatus =
  | "cart"
  | "requested"
  | "sent"
  | "received"
  | "completed"
  | "cancelled";

export type TransactionAction = "request" | "accept" | "received" | "complete" | "cancel";
export type TransactionActor = "buyer" | "seller";

const buyerActions: Record<TransactionStatus, readonly TransactionAction[]> = {
  cart: ["request", "cancel"],
  requested: ["cancel"],
  sent: ["received", "cancel"],
  received: ["cancel"],
  completed: [],
  cancelled: [],
};

const sellerActions: Record<TransactionStatus, readonly TransactionAction[]> = {
  cart: ["cancel"],
  requested: ["accept", "cancel"],
  sent: ["cancel"],
  received: ["complete", "cancel"],
  completed: [],
  cancelled: [],
};

export function allowedTransactionActions(
  status: TransactionStatus,
  actor: TransactionActor,
): TransactionAction[] {
  return [...(actor === "buyer" ? buyerActions[status] : sellerActions[status])];
}

export function canTakeTransactionAction(
  status: TransactionStatus,
  action: TransactionAction,
  actor?: TransactionActor,
): boolean {
  if (actor) return allowedTransactionActions(status, actor).includes(action);
  return buyerActions[status].includes(action) || sellerActions[status].includes(action);
}
