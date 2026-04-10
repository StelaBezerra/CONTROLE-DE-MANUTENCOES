"use client";

import { useEffect, useMemo, useState } from "react";
import {
  emptyChecklist,
  maintenanceSteps,
  type MaintenanceStepId,
  type StepState,
  type Store,
  type Ticket,
  type UploadedPdf,
} from "@/lib/data";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

type TicketRow = {
  id: string;
  code: string;
  store_id: string;
  store_name: string;
  item_name: string;
  item_type: string | null;
  serial_number: string | null;
  problem: string;
  technician: string | null;
  technician_phone: string | null;
  budget_value: number | null;
  invoice_value: number | null;
  received_at_ti: string | null;
  notes: string | null;
  checklist: StepState | null;
  created_at: string;
  updated_at: string;
  ticket_files?: {
    id: string;
    file_name: string;
    file_path: string;
    file_size: number | null;
    created_at: string;
  }[];
};

const STORAGE_BUCKET = "maintenance-pdfs";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFmt = new Intl.DateTimeFormat("pt-BR");

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function getCompletedCount(ticket: Ticket) {
  return Object.values(ticket.checklist).filter(Boolean).length;
}

function getTicketStatus(ticket: Ticket) {
  if (ticket.checklist.returned) {
    return {
      key: "finalized",
      label: "Finalizado",
      className: "statusGreen",
    };
  }

  if (
    ticket.checklist.invoice_received ||
    ticket.checklist.invoice_sent_to_payment ||
    ticket.checklist.payment_done
  ) {
    return {
      key: "waiting",
      label: "Aguardando pagamento",
      className: "statusYellow",
    };
  }

  return {
    key: "progress",
    label: "Em andamento",
    className: "statusBlue",
  };
}

function buildPublicUrl(path: string) {
  if (!supabase || !path) return "";
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function mapTicketRow(row: TicketRow): Ticket {
  return {
    id: row.id,
    code: row.code,
    storeId: row.store_id,
    store: row.store_name,
    itemName: row.item_name,
    itemType: row.item_type ?? "",
    serialNumber: row.serial_number ?? "",
    problem: row.problem,
    technician: row.technician ?? "",
    technicianPhone: row.technician_phone ?? "",
    budgetValue: Number(row.budget_value ?? 0),
    invoiceValue: Number(row.invoice_value ?? 0),
    receivedAtTI: row.received_at_ti ?? "",
    notes: row.notes ?? "",
    checklist: row.checklist ?? emptyChecklist(),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    files: (row.ticket_files ?? []).map((file) => ({
      id: file.id,
      name: file.file_name,
      size: Number(file.file_size ?? 0),
      uploadedAt: file.created_at,
      path: file.file_path,
      publicUrl: buildPublicUrl(file.file_path),
    })),
  };
}

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [storesExpanded, setStoresExpanded] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  const [stores, setStores] = useState<Store[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  const [selectedStore, setSelectedStore] = useState<string>("Todas");
  const [selectedStep, setSelectedStep] = useState<string>("Todas");
  const [search, setSearch] = useState("");
  const [newStore, setNewStore] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    storeId: "",
    itemName: "",
    itemType: "",
    serialNumber: "",
    problem: "",
    technician: "",
    technicianPhone: "",
    budgetValue: "",
    invoiceValue: "",
    receivedAtTI: todayValue(),
    notes: "",
  });

  const supabaseReady = isSupabaseConfigured();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!supabaseReady) {
      setLoading(false);
      return;
    }
    void refreshData();
  }, [mounted, supabaseReady]);

  useEffect(() => {
    if (!form.storeId && stores.length > 0) {
      setForm((prev) => ({ ...prev, storeId: stores[0].id }));
    }
  }, [stores, form.storeId]);

  async function refreshData() {
    if (!supabase) return;

    setLoading(true);
    setErrorMessage("");

    const [storesRes, ticketsRes] = await Promise.all([
      supabase.from("stores").select("*").order("name", { ascending: true }),
      supabase
        .from("tickets")
        .select(
          "id, code, store_id, store_name, item_name, item_type, serial_number, problem, technician, technician_phone, budget_value, invoice_value, received_at_ti, notes, checklist, created_at, updated_at, ticket_files(id, file_name, file_path, file_size, created_at)"
        )
        .order("updated_at", { ascending: false }),
    ]);

    if (storesRes.error) {
      setErrorMessage(storesRes.error.message);
    }

    if (ticketsRes.error) {
      setErrorMessage(ticketsRes.error.message);
    }

    setStores(storesRes.data ?? []);
    setTickets((ticketsRes.data ?? []).map((row) => mapTicketRow(row as TicketRow)));
    setLoading(false);
  }

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesStore =
        selectedStore === "Todas" || ticket.storeId === selectedStore;
      const matchesStep =
        selectedStep === "Todas" ||
        Boolean(ticket.checklist[selectedStep as MaintenanceStepId]);

      const haystack = [
        ticket.code,
        ticket.store,
        ticket.itemName,
        ticket.itemType,
        ticket.problem,
        ticket.technician,
        ticket.notes,
        ticket.serialNumber,
      ]
        .join(" ")
        .toLowerCase();

      return (
        matchesStore &&
        matchesStep &&
        haystack.includes(search.toLowerCase())
      );
    });
  }, [tickets, selectedStore, selectedStep, search]);

  const stats = useMemo(() => {
    const total = tickets.length;
    const completed = tickets.filter((ticket) => ticket.checklist.returned).length;
    const waitingPayment = tickets.filter(
      (ticket) =>
        !ticket.checklist.returned &&
        (
          ticket.checklist.invoice_received ||
          ticket.checklist.invoice_sent_to_payment ||
          ticket.checklist.payment_done
        )
    ).length;
    const inProgress = tickets.filter(
      (ticket) =>
        !ticket.checklist.returned &&
        !(
          ticket.checklist.invoice_received ||
          ticket.checklist.invoice_sent_to_payment ||
          ticket.checklist.payment_done
        )
    ).length;

    return { total, completed, waitingPayment, inProgress };
  }, [tickets]);

  function resetForm() {
    setForm({
      storeId: stores[0]?.id ?? "",
      itemName: "",
      itemType: "",
      serialNumber: "",
      problem: "",
      technician: "",
      technicianPhone: "",
      budgetValue: "",
      invoiceValue: "",
      receivedAtTI: todayValue(),
      notes: "",
    });
  }

  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    if (!form.itemName.trim() || !form.problem.trim() || !form.storeId.trim()) return;

    const selectedStoreItem = stores.find((store) => store.id === form.storeId);
    if (!selectedStoreItem) return;

    const ticketCount = tickets.length + 1;
    const payload = {
      code: `CH-${String(ticketCount).padStart(4, "0")}`,
      store_id: selectedStoreItem.id,
      store_name: selectedStoreItem.name,
      item_name: form.itemName.trim(),
      item_type: form.itemType.trim(),
      serial_number: form.serialNumber.trim(),
      problem: form.problem.trim(),
      technician: form.technician.trim(),
      technician_phone: form.technicianPhone.trim(),
      budget_value: Number(form.budgetValue) || 0,
      invoice_value: Number(form.invoiceValue) || 0,
      received_at_ti: form.receivedAtTI || null,
      notes: form.notes.trim(),
      checklist: emptyChecklist(),
    };

    const { error } = await supabase.from("tickets").insert(payload);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    resetForm();
    setIsTicketModalOpen(false);
    await refreshData();
  }

  async function addStore() {
    if (!supabase) return;
    const normalized = newStore.trim();
    if (!normalized) return;

    const { error } = await supabase.from("stores").insert({ name: normalized });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setNewStore("");
    await refreshData();
  }

  async function removeStore(store: Store) {
    if (!supabase) return;

    const relatedTickets = tickets.some((ticket) => ticket.storeId === store.id);
    if (relatedTickets) {
      alert("Não é possível remover uma loja que possui chamados cadastrados.");
      return;
    }

    const { error } = await supabase.from("stores").delete().eq("id", store.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (selectedStore === store.id) {
      setSelectedStore("Todas");
    }

    await refreshData();
  }

  async function toggleChecklist(ticketId: string, stepId: MaintenanceStepId) {
    if (!supabase) return;

    const current = tickets.find((ticket) => ticket.id === ticketId);
    if (!current) return;

    const nextChecklist = {
      ...current.checklist,
      [stepId]: !current.checklist[stepId],
    };

    const { error } = await supabase
      .from("tickets")
      .update({
        checklist: nextChecklist,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setTickets((prev) =>
      prev.map((ticket) =>
        ticket.id === ticketId
          ? { ...ticket, checklist: nextChecklist, updatedAt: new Date().toISOString() }
          : ticket
      )
    );
  }

  async function removeTicket(ticket: Ticket) {
    if (!supabase) return;

    const filePaths = ticket.files.map((file) => file.path).filter(Boolean);
    if (filePaths.length > 0) {
      await supabase.storage.from(STORAGE_BUCKET).remove(filePaths);
    }

    const { error } = await supabase.from("tickets").delete().eq("id", ticket.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    await refreshData();
  }

  async function handlePdfUpload(ticketId: string, event: React.ChangeEvent<HTMLInputElement>) {
    if (!supabase) return;

    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      alert("Envie somente arquivos PDF.");
      event.target.value = "";
      return;
    }

    const filePath = `${ticketId}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;

    const uploadRes = await supabase.storage.from(STORAGE_BUCKET).upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (uploadRes.error) {
      setErrorMessage(uploadRes.error.message);
      event.target.value = "";
      return;
    }

    const insertRes = await supabase.from("ticket_files").insert({
      ticket_id: ticketId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
    });

    if (insertRes.error) {
      setErrorMessage(insertRes.error.message);
      event.target.value = "";
      return;
    }

    event.target.value = "";
    await refreshData();
  }

  async function removePdf(ticketId: string, file: UploadedPdf) {
    if (!supabase) return;

    await supabase.storage.from(STORAGE_BUCKET).remove([file.path]);

    const { error } = await supabase.from("ticket_files").delete().eq("id", file.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    await refreshData();
  }

  if (!mounted) {
    return <main className="loadingScreen">Carregando painel...</main>;
  }

  if (!supabaseReady) {
    return (
      <main className="setupScreen">
        <div className="setupCard">
          <span className="eyebrow">configuração necessária</span>
          <h1>Conecte o Supabase para usar o sistema</h1>
          <p>
            Preencha o arquivo <code>.env.local</code> com as variáveis do seu projeto,
            rode o SQL do arquivo <code>supabase-schema.sql</code> e reinicie o app.
          </p>
          <pre>
{`NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...`}
          </pre>
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      <aside className={`sidebar ${sidebarOpen ? "" : "collapsed"}`}>
        <div className="sidebarTop">
          <button
            className="iconButton"
            type="button"
            onClick={() => setSidebarOpen((prev) => !prev)}
          >
            {sidebarOpen ? "←" : "→"}
          </button>

          {sidebarOpen ? (
            <div>
              <span className="eyebrow">controle interno</span>
              <h1>Manutenções</h1>
              <p>Controle de manutenções terceirizadas.</p>
            </div>
          ) : null}
        </div>

        <div className="sidebarActions">
          <button
            className="primaryButton blockButton"
            type="button"
            onClick={() => setIsTicketModalOpen(true)}
          >
            Novo chamado
          </button>

          <button
            className="primaryButton blockButton"
            type="button"
            onClick={() => setStoresExpanded((prev) => !prev)}
          >
            {storesExpanded ? "Fechar lojas" : "Gerenciar lojas"}
          </button>
        </div>

        {sidebarOpen && storesExpanded ? (
          <section className="inlineStoreManager">
            <div className="cardHeaderCompact">
              <h2>Lojas</h2>
              <span>{stores.length}</span>
            </div>

            <div className="inlineForm">
              <input
                value={newStore}
                onChange={(e) => setNewStore(e.target.value)}
                placeholder="Ex.: Loja Aldeota"
              />
              <button className="secondaryButton" type="button" onClick={() => void addStore()}>
                Adicionar
              </button>
            </div>

            <div className="storeListModal">
              {stores.map((store) => (
                <div className="storeItem" key={store.id}>
                  <span>{store.name}</span>
                  <button
                    type="button"
                    className="ghostDanger"
                    onClick={() => void removeStore(store)}
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </aside>

      <section className="content">
        <section className="hero">
          <div>
            <span className="eyebrow">painel operacional</span>
            <h2>Rastreamento de chamados</h2>
            <p>Etapas livres, timeline visual e anexos PDF por chamado.</p>
          </div>
        </section>

        {errorMessage ? <div className="errorBanner">{errorMessage}</div> : null}

        <section className="statsGrid">
          <article className="statCard statNeutral">
            <span>Total</span>
            <strong>{stats.total}</strong>
          </article>
          <article className="statCard statBlue">
            <span>Em andamento</span>
            <strong>{stats.inProgress}</strong>
          </article>
          <article className="statCard statYellow">
            <span>Aguardando pagamento</span>
            <strong>{stats.waitingPayment}</strong>
          </article>
          <article className="statCard statGreen">
            <span>Finalizados</span>
            <strong>{stats.completed}</strong>
          </article>
        </section>

        <section className="panelCard">
          <div className="sectionHeader">
            <h3>Chamados cadastrados</h3>
            <p>Use os filtros abaixo para localizar rapidamente cada manutenção.</p>
          </div>

          <div className="filters">
            <select value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)}>
              <option value="Todas">Todas</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>

            <select value={selectedStep} onChange={(e) => setSelectedStep(e.target.value)}>
              <option value="Todas">Todas as etapas</option>
              {maintenanceSteps.map((step) => (
                <option key={step.id} value={step.id}>
                  {step.label}
                </option>
              ))}
            </select>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por item, problema, loja ou técnico"
            />
          </div>

          {loading ? (
            <div className="emptyState">Carregando chamados...</div>
          ) : (
            <div className="ticketsGrid">
              {filteredTickets.length === 0 ? (
                <div className="emptyState">Nenhum chamado encontrado com os filtros atuais.</div>
              ) : (
                filteredTickets.map((ticket) => {
                  const status = getTicketStatus(ticket);

                  return (
                    <article className="ticketCard" key={ticket.id}>
                      <div className="ticketHeader">
                        <div>
                          <span className="ticketCode">{ticket.code}</span>
                          <h4>{ticket.itemName}</h4>
                          <p className="mutedLine">
                            {ticket.store}
                            {ticket.itemType ? ` • ${ticket.itemType}` : ""}
                            {ticket.serialNumber ? ` • ${ticket.serialNumber}` : ""}
                          </p>
                        </div>

                        <div className="ticketHeaderSide">
                          <span className={`statusBadge ${status.className}`}>
                            {status.label}
                          </span>
                          <button
                            className="ghostDanger"
                            type="button"
                            onClick={() => void removeTicket(ticket)}
                          >
                            Excluir
                          </button>
                        </div>
                      </div>

                      <div className="ticketInfo">
                        <p><strong>Problema:</strong> {ticket.problem}</p>
                        <p><strong>Técnico:</strong> {ticket.technician || "Não informado"}</p>
                        <p><strong>Telefone:</strong> {ticket.technicianPhone || "Não informado"}</p>
                        <p><strong>Orçamento:</strong> {currency.format(ticket.budgetValue || 0)}</p>
                        <p><strong>Nota:</strong> {currency.format(ticket.invoiceValue || 0)}</p>
                        <p>
                          <strong>Entrada no TI:</strong>{" "}
                          {ticket.receivedAtTI ? dateFmt.format(new Date(ticket.receivedAtTI)) : "-"}
                        </p>
                        {ticket.notes ? <p><strong>Observações:</strong> {ticket.notes}</p> : null}
                      </div>

                      <div className="timelineBox">
                        <div className="timelineHeader">
                          <span className="timelineTitle">Timeline do chamado</span>
                          <span className={`statusMini ${status.className}`}>
                            {getCompletedCount(ticket)}/{maintenanceSteps.length} etapas
                          </span>
                        </div>

                        <div className="timelineList">
                          {maintenanceSteps.map((step, index) => {
                            const checked = ticket.checklist[step.id];
                            return (
                              <div
                                className={`timelineItem ${checked ? "done" : ""}`}
                                key={step.id}
                              >
                                <div className="timelineRail">
                                  <button
                                    type="button"
                                    className={`timelineDot ${checked ? "done" : ""}`}
                                    onClick={() => void toggleChecklist(ticket.id, step.id)}
                                    aria-label={step.label}
                                  >
                                    {checked ? "✓" : index + 1}
                                  </button>
                                  {index < maintenanceSteps.length - 1 ? (
                                    <span className={`timelineLine ${checked ? "done" : ""}`} />
                                  ) : null}
                                </div>

                                <div className="timelineContent">
                                  <div className="timelineStepTop">
                                    <strong>{step.label}</strong>
                                    <label className="timelineCheckLabel">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => void toggleChecklist(ticket.id, step.id)}
                                      />
                                      <span>{checked ? "Concluído" : "Pendente"}</span>
                                    </label>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="filesBox">
                        <div className="filesHeader">
                          <span>Arquivos PDF</span>
                          <label className="uploadButton">
                            Enviar PDF
                            <input
                              type="file"
                              accept="application/pdf"
                              onChange={(e) => void handlePdfUpload(ticket.id, e)}
                            />
                          </label>
                        </div>

                        {ticket.files.length === 0 ? (
                          <div className="emptyFiles">Nenhum PDF anexado neste chamado.</div>
                        ) : (
                          <div className="fileList">
                            {ticket.files.map((file) => (
                              <div className="fileItem" key={file.id}>
                                <div>
                                  <strong>{file.name}</strong>
                                  <p>
                                    {(file.size / 1024).toFixed(1)} KB •{" "}
                                    {dateFmt.format(new Date(file.uploadedAt))}
                                  </p>
                                </div>

                                <div className="fileActions">
                                  <a
                                    href={file.publicUrl || "#"}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="fileLink"
                                  >
                                    Abrir
                                  </a>
                                  <button
                                    type="button"
                                    className="ghostDanger"
                                    onClick={() => void removePdf(ticket.id, file)}
                                  >
                                    Remover
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          )}
        </section>
      </section>

      {isTicketModalOpen ? (
        <div className="modalOverlay" onClick={() => setIsTicketModalOpen(false)}>
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <span className="eyebrow">novo chamado</span>
                <h3>Cadastrar manutenção</h3>
              </div>
              <button
                className="iconButton"
                type="button"
                onClick={() => setIsTicketModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form className="formGrid" onSubmit={(e) => void handleCreateTicket(e)}>
              <label>
                Loja
                <select
                  value={form.storeId}
                  onChange={(e) => setForm((prev) => ({ ...prev, storeId: e.target.value }))}
                >
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Nome do item
                <input
                  value={form.itemName}
                  onChange={(e) => setForm((prev) => ({ ...prev, itemName: e.target.value }))}
                  required
                />
              </label>

              <label>
                Tipo / categoria
                <input
                  value={form.itemType}
                  onChange={(e) => setForm((prev) => ({ ...prev, itemType: e.target.value }))}
                />
              </label>

              <label>
                Número de série / patrimônio
                <input
                  value={form.serialNumber}
                  onChange={(e) => setForm((prev) => ({ ...prev, serialNumber: e.target.value }))}
                />
              </label>

              <label className="fullWidth">
                Problema informado
                <textarea
                  value={form.problem}
                  onChange={(e) => setForm((prev) => ({ ...prev, problem: e.target.value }))}
                  required
                />
              </label>

              <label>
                Técnico responsável
                <input
                  value={form.technician}
                  onChange={(e) => setForm((prev) => ({ ...prev, technician: e.target.value }))}
                />
              </label>

              <label>
                Telefone do técnico
                <input
                  value={form.technicianPhone}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, technicianPhone: e.target.value }))
                  }
                />
              </label>

              <label>
                Valor do orçamento
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.budgetValue}
                  onChange={(e) => setForm((prev) => ({ ...prev, budgetValue: e.target.value }))}
                />
              </label>

              <label>
                Valor da nota
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.invoiceValue}
                  onChange={(e) => setForm((prev) => ({ ...prev, invoiceValue: e.target.value }))}
                />
              </label>

              <label>
                Data de entrada no TI
                <input
                  type="date"
                  value={form.receivedAtTI}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, receivedAtTI: e.target.value }))
                  }
                />
              </label>

              <label className="fullWidth">
                Observações
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </label>

              <div className="modalActions fullWidth">
                <button
                  className="secondaryButton"
                  type="button"
                  onClick={() => setIsTicketModalOpen(false)}
                >
                  Cancelar
                </button>
                <button className="primaryButton" type="submit">
                  Salvar chamado
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
