export type MaintenanceStepId =
  | "received_ti"
  | "technician_called"
  | "picked_up_by_technician"
  | "budget_received"
  | "budget_sent_for_signature"
  | "signed_budget_returned"
  | "technician_notified_signed"
  | "repair_in_progress"
  | "invoice_received"
  | "invoice_sent_to_payment"
  | "payment_done"
  | "returned";

export type StepState = Record<MaintenanceStepId, boolean>;

export type Store = {
  id: string;
  name: string;
  created_at?: string;
};

export type UploadedPdf = {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
  path: string;
  publicUrl?: string;
};

export type Ticket = {
  id: string;
  code: string;
  storeId: string;
  store: string;
  itemName: string;
  itemType: string;
  serialNumber: string;
  problem: string;
  technician: string;
  technicianPhone: string;
  budgetValue: number;
  invoiceValue: number;
  receivedAtTI: string;
  notes: string;
  checklist: StepState;
  files: UploadedPdf[];
  createdAt: string;
  updatedAt: string;
};

export const maintenanceSteps: { id: MaintenanceStepId; label: string }[] = [
  { id: "received_ti", label: "Objeto recolhido na sala do TI" },
  { id: "technician_called", label: "Técnico acionado" },
  { id: "picked_up_by_technician", label: "Técnico veio buscar" },
  { id: "budget_received", label: "Orçamento recebido" },
  { id: "budget_sent_for_signature", label: "Orçamento enviado para assinatura" },
  { id: "signed_budget_returned", label: "Orçamento assinado devolvido" },
  { id: "technician_notified_signed", label: "Técnico avisado da assinatura" },
  { id: "repair_in_progress", label: "Objeto em reparo" },
  { id: "invoice_received", label: "Nota recebida para pagamento" },
  { id: "invoice_sent_to_payment", label: "Nota enviada para pagamento" },
  { id: "payment_done", label: "Pagamento realizado" },
  { id: "returned", label: "Peça devolvida pela assistência" }
];

export function emptyChecklist(): StepState {
  return {
    received_ti: false,
    technician_called: false,
    picked_up_by_technician: false,
    budget_received: false,
    budget_sent_for_signature: false,
    signed_budget_returned: false,
    technician_notified_signed: false,
    repair_in_progress: false,
    invoice_received: false,
    invoice_sent_to_payment: false,
    payment_done: false,
    returned: false
  };
}
