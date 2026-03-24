"use client";

import { FormEvent, MouseEvent as ReactMouseEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createAgendamento, deleteAgendamento, listAgendamentos, updateAgendamento } from "@/lib/api";
import { logout } from "@/lib/auth";
import { Agendamento } from "@/lib/types";

const PAGE_SIZE = 50;

type DatePreset = "all" | "today" | "yesterday" | "7days" | "custom";
type SortKey = "id" | "data" | "hora" | "webhookUrl" | "status";
type SortDir = "asc" | "desc";
type ModalMode = "new" | "view" | "edit" | null;

function asJson(value: unknown): string {
  return JSON.stringify(value ?? {}, null, 2);
}

function dateOnly(value: string | undefined): string {
  if (!value) return "";
  if (value.includes("T")) return value.slice(0, 10);
  return value;
}

function inPreset(itemDate: string, preset: DatePreset, customStart: string, customEnd: string): boolean {
  if (preset === "all") return true;
  const now = new Date();
  const d = new Date(`${itemDate}T00:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (preset === "today") return d.getTime() === today.getTime();
  if (preset === "yesterday") return d.getTime() === today.getTime() - 24 * 60 * 60 * 1000;
  if (preset === "7days") {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return d >= start && d <= today;
  }
  if (preset === "custom") {
    if (!customStart || !customEnd) return true;
    const start = new Date(`${customStart}T00:00:00`);
    const end = new Date(`${customEnd}T23:59:59`);
    return d >= start && d <= end;
  }
  return true;
}

function statusStyles(status: string): { bg: string; color: string } {
  if (status === "Executado") return { bg: "#dcfce7", color: "var(--ok)" };
  if (status === "Falhou") return { bg: "#fee2e2", color: "var(--error)" };
  if (status === "Cancelado") return { bg: "#fef3c7", color: "var(--warn)" };
  return { bg: "#dbeafe", color: "var(--primary-strong)" };
}

const DEFAULT_WIDTHS: Record<SortKey | "dados" | "acoes", number> = {
  id: 260,
  data: 120,
  hora: 90,
  webhookUrl: 300,
  status: 120,
  dados: 340,
  acoes: 220,
};

export function Dashboard() {
  const [items, setItems] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("data");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [activeItem, setActiveItem] = useState<Agendamento | null>(null);
  const [formData, setFormData] = useState({ data: "", hora: "", webhookUrl: "", dados: "{}" });
  const [saving, setSaving] = useState(false);
  const [colWidths, setColWidths] = useState(DEFAULT_WIDTHS);

  async function loadData() {
    try {
      setError("");
      setLoading(true);
      const list = await listAgendamentos();
      setItems(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar agendamentos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredSorted = useMemo(() => {
    let result = [...items];
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter((item) => {
        const full = [item.id, item.data, item.hora, item.webhookUrl, item.status, asJson(item.dados)].join(" ").toLowerCase();
        return full.includes(q);
      });
    }

    result = result.filter((item) => inPreset(dateOnly(item.data || item.agendadoPara), datePreset, customStart, customEnd));

    result.sort((a, b) => {
      const av = String(a[sortKey] || "").toLowerCase();
      const bv = String(b[sortKey] || "").toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return result;
  }, [items, query, datePreset, customStart, customEnd, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
  const pageItems = useMemo(() => filteredSorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filteredSorted, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function openNew() {
    setActiveItem(null);
    setFormData({ data: "", hora: "", webhookUrl: "", dados: "{}" });
    setModalMode("new");
  }

  function openView(item: Agendamento) {
    setActiveItem(item);
    setModalMode("view");
  }

  function openEdit(item: Agendamento) {
    setActiveItem(item);
    setFormData({
      data: dateOnly(item.data || item.agendadoPara),
      hora: item.hora || "",
      webhookUrl: item.webhookUrl || "",
      dados: asJson(item.dados),
    });
    setModalMode("edit");
  }

  async function onDelete(item: Agendamento) {
    if (!confirm(`Excluir agendamento ${item.id}?`)) return;
    try {
      await deleteAgendamento(item.id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir");
    }
  }

  async function onSubmitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const parsedDados = JSON.parse(formData.dados || "{}") as Record<string, unknown>;
      const payload = {
        data: formData.data,
        hora: formData.hora,
        webhookUrl: formData.webhookUrl,
        dados: parsedDados,
      };
      if (modalMode === "new") {
        await createAgendamento(payload);
      } else if (modalMode === "edit" && activeItem) {
        await updateAgendamento(activeItem.id, payload);
      }
      setModalMode(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  function onSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function startResize(column: keyof typeof DEFAULT_WIDTHS, event: ReactMouseEvent<HTMLDivElement>) {
    const startX = event.clientX;
    const startWidth = colWidths[column];
    function onMove(e: MouseEvent) {
      const next = Math.max(80, startWidth + (e.clientX - startX));
      setColWidths((prev) => ({ ...prev, [column]: next }));
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <main style={{ padding: 20, display: "grid", gap: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 28 }}>Dashboard de Agendamentos</h1>
          <p style={{ color: "var(--muted)" }}>Foco na API: consulta, criação, edição e exclusão de agendamentos.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/docs" style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px" }}>
            Docs
          </Link>
          <button onClick={openNew} style={{ background: "var(--primary)", color: "#fff", border: 0, borderRadius: 10, padding: "10px 12px", cursor: "pointer" }}>
            Novo agendamento
          </button>
          <button
            onClick={() => {
              void logout();
            }}
            style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", cursor: "pointer" }}
          >
            Sair
          </button>
        </div>
      </header>

      <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 12, display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", alignItems: "center" }}>
          <input placeholder="Buscar por todos os campos..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)" }} />
          <select value={datePreset} onChange={(e) => setDatePreset(e.target.value as DatePreset)} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)" }}>
            <option value="all">Data: Todas</option>
            <option value="today">Hoje</option>
            <option value="yesterday">Ontem</option>
            <option value="7days">7 dias</option>
            <option value="custom">Personalizado</option>
          </select>
          <input type="date" disabled={datePreset !== "custom"} value={customStart} onChange={(e) => setCustomStart(e.target.value)} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)" }} />
          <input type="date" disabled={datePreset !== "custom"} value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)" }} />
          <button onClick={loadData} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", cursor: "pointer" }}>
            Recarregar
          </button>
        </div>
      </section>

      <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "auto" }}>
        {loading ? <p style={{ padding: 12 }}>Carregando...</p> : null}
        {error ? <p style={{ padding: 12, color: "var(--error)" }}>{error}</p> : null}
        {!loading ? (
          <table style={{ width: "100%", minWidth: 1200, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {(
                  [
                    ["id", "Id"],
                    ["data", "Data"],
                    ["hora", "Hora"],
                    ["webhookUrl", "Webhook"],
                    ["status", "Status"],
                  ] as [SortKey, string][]
                ).map(([key, label]) => (
                  <th key={key} style={{ width: colWidths[key], textAlign: "left", borderBottom: "1px solid var(--border)", padding: 10, position: "relative" }}>
                    <button onClick={() => onSort(key)} style={{ border: 0, background: "none", fontWeight: 600, cursor: "pointer" }}>
                      {label} {sortKey === key ? (sortDir === "asc" ? "↑" : "↓") : ""}
                    </button>
                    <div onMouseDown={(e) => startResize(key, e)} style={{ position: "absolute", right: 0, top: 0, width: 6, height: "100%", cursor: "col-resize" }} />
                  </th>
                ))}
                <th style={{ width: colWidths.dados, textAlign: "left", borderBottom: "1px solid var(--border)", padding: 10, position: "relative" }}>
                  Dados (Body)
                  <div onMouseDown={(e) => startResize("dados", e)} style={{ position: "absolute", right: 0, top: 0, width: 6, height: "100%", cursor: "col-resize" }} />
                </th>
                <th style={{ width: colWidths.acoes, textAlign: "left", borderBottom: "1px solid var(--border)", padding: 10, position: "relative" }}>
                  Ações
                  <div onMouseDown={(e) => startResize("acoes", e)} style={{ position: "absolute", right: 0, top: 0, width: 6, height: "100%", cursor: "col-resize" }} />
                </th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((item) => {
                const badge = statusStyles(item.status);
                return (
                  <tr key={item.id}>
                    <td style={{ borderBottom: "1px solid var(--border)", padding: 10, fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: 12 }}>{item.id}</td>
                    <td style={{ borderBottom: "1px solid var(--border)", padding: 10 }}>{dateOnly(item.data || item.agendadoPara)}</td>
                    <td style={{ borderBottom: "1px solid var(--border)", padding: 10 }}>{item.hora || "-"}</td>
                    <td style={{ borderBottom: "1px solid var(--border)", padding: 10, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.webhookUrl}</td>
                    <td style={{ borderBottom: "1px solid var(--border)", padding: 10 }}>
                      <span style={{ background: badge.bg, color: badge.color, borderRadius: 999, fontSize: 12, padding: "4px 8px", fontWeight: 600 }}>{item.status}</span>
                    </td>
                    <td style={{ borderBottom: "1px solid var(--border)", padding: 10, maxWidth: 340, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {asJson(item.dados)}
                    </td>
                    <td style={{ borderBottom: "1px solid var(--border)", padding: 10 }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => openView(item)} style={{ border: "1px solid var(--border)", background: "#fff", borderRadius: 8, padding: "4px 8px", cursor: "pointer" }}>
                          Ver
                        </button>
                        <button onClick={() => openEdit(item)} style={{ border: "1px solid var(--border)", background: "#fff", borderRadius: 8, padding: "4px 8px", cursor: "pointer" }}>
                          Editar
                        </button>
                        <button onClick={() => onDelete(item)} style={{ border: "1px solid #fecaca", background: "#fff1f2", color: "var(--error)", borderRadius: 8, padding: "4px 8px", cursor: "pointer" }}>
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}
      </section>

      <footer style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 12 }}>
        <span style={{ color: "var(--muted)" }}>
          {filteredSorted.length} registros | Página {page} de {totalPages}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={{ border: "1px solid var(--border)", background: "#fff", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>
            Anterior
          </button>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={{ border: "1px solid var(--border)", background: "#fff", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>
            Próxima
          </button>
        </div>
      </footer>

      {modalMode ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.45)", display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ width: "100%", maxWidth: 720, background: "#fff", borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: 16, display: "grid", gap: 12 }}>
            <h2>{modalMode === "new" ? "Novo agendamento" : modalMode === "edit" ? "Editar agendamento" : "Detalhes do agendamento"}</h2>
            {modalMode === "view" && activeItem ? (
              <pre style={{ background: "#f8fafc", border: "1px solid var(--border)", borderRadius: 10, padding: 12, overflowX: "auto" }}>{asJson(activeItem)}</pre>
            ) : (
              <form onSubmit={onSubmitForm} style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
                  <input type="date" required value={formData.data} onChange={(e) => setFormData((v) => ({ ...v, data: e.target.value }))} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)" }} />
                  <input type="time" required value={formData.hora} onChange={(e) => setFormData((v) => ({ ...v, hora: e.target.value }))} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)" }} />
                </div>
                <input required value={formData.webhookUrl} onChange={(e) => setFormData((v) => ({ ...v, webhookUrl: e.target.value }))} placeholder="https://seu-webhook.com/endpoint" style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)" }} />
                <textarea rows={10} value={formData.dados} onChange={(e) => setFormData((v) => ({ ...v, dados: e.target.value }))} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", fontFamily: "var(--font-jetbrains-mono), monospace" }} />
                <button disabled={saving} type="submit" style={{ border: 0, background: "var(--primary)", color: "#fff", borderRadius: 10, padding: "10px 12px", cursor: "pointer" }}>
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </form>
            )}
            <button onClick={() => setModalMode(null)} style={{ border: "1px solid var(--border)", background: "#fff", borderRadius: 8, padding: "8px 10px", cursor: "pointer" }}>
              Fechar
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
