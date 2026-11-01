import { createClient } from "https://esm.sh/@supabase/supabase-js@2.117.3";

const DB_TABLE = "warranty_products";
const RECEIPT_BUCKET = "warranty-receipts";
const SOON_DAYS = 30;
const MAX_RECEIPT_SIZE = 10 * 1024 * 1024;
const ALLOWED_RECEIPT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "application/pdf"]);
const FILTER_NAMES = { all: "Todos", active: "Ativas", soon: "Vencem em breve", expired: "Vencidas" };
const $ = (selector) => document.querySelector(selector);
const grid = $("#product-grid");
const emptyState = $("#empty-state");
const template = $("#product-template");
const dialog = $("#product-dialog");
const form = $("#product-form");
const config = window.GARANTIA_SUPABASE_CONFIG || {};
const supabase = config.url && config.publishableKey
  ? createClient(config.url, config.publishableKey, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;
let currentUser = null;
let products = [];
let activeFilter = "all";
let pendingDelete = null;
let retainedReceipt = null;
let toastTimer;

function localDateString(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function parseLocalDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function addMonths(dateValue, months) {
  const date = parseLocalDate(dateValue);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()));
  return localDateString(date);
}

function dayDifference(dateValue) {
  return Math.ceil((parseLocalDate(dateValue).getTime() - parseLocalDate(localDateString()).getTime()) / 86400000);
}

function formatDate(dateValue) {
  if (!dateValue) return "—";
  return parseLocalDate(dateValue).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).replace(" de ", " ");
}

function statusOf(product) {
  const days = dayDifference(product.expiry_date);
  return days < 0 ? "expired" : days <= SOON_DAYS ? "soon" : "active";
}

function daysCopy(days) {
  if (days < 0) return `Venceu há ${Math.abs(days)} ${Math.abs(days) === 1 ? "dia" : "dias"}`;
  if (days === 0) return "Vence hoje";
  if (days === 1) return "Vence amanhã";
  return `${days} dias restantes`;
}

function render() {
  const counts = { active: 0, soon: 0, expired: 0 };
  for (const product of products) counts[statusOf(product)] += 1;
  $("#count-active").textContent = counts.active;
  $("#count-soon").textContent = counts.soon;
  $("#count-expired").textContent = counts.expired;
  const query = $("#search").value.trim().toLocaleLowerCase("pt-BR");
  const filtered = products.filter((product) => {
    const matchesFilter = activeFilter === "all" || activeFilter === statusOf(product);
    const matchesQuery = !query || `${product.name} ${product.store || ""} ${product.model || ""}`.toLocaleLowerCase("pt-BR").includes(query);
    return matchesFilter && matchesQuery;
  }).sort((a, b) => a.expiry_date.localeCompare(b.expiry_date));
  grid.replaceChildren();
  for (const product of filtered) grid.append(createCard(product));
  emptyState.classList.toggle("visible", filtered.length === 0);
  grid.hidden = filtered.length === 0;
  const noProducts = products.length === 0;
  $("#empty-title").textContent = noProducts ? "Seu espaço está pronto" : "Nenhum produto encontrado";
  $("#empty-copy").textContent = noProducts
    ? "Cadastre seu primeiro produto para guardar o comprovante e acompanhar a garantia."
    : "Tente mudar a busca ou o filtro para encontrar seus produtos.";
  $("#empty-add").hidden = !noProducts;
  if (counts.soon && !sessionStorage.getItem("notice-dismissed")) {
    $("#notice-title").textContent = counts.soon === 1 ? "Uma garantia está perto do vencimento" : `${counts.soon} garantias estão perto do vencimento`;
    $("#notice-copy").textContent = "Confira seus produtos que vencem nos próximos 30 dias.";
    $("#notice").hidden = false;
  } else $("#notice").hidden = true;
}

function createCard(product) {
  const card = template.content.firstElementChild.cloneNode(true);
  const status = statusOf(product);
  const days = dayDifference(product.expiry_date);
  const totalDays = Math.max(1, (parseLocalDate(product.expiry_date).getTime() - parseLocalDate(product.purchase_date).getTime()) / 86400000);
  const elapsed = Math.max(0, totalDays - Math.max(days, 0));
  const progress = status === "expired" ? 100 : Math.min(100, Math.max(4, elapsed / totalDays * 100));
  card.dataset.id = product.id;
  card.querySelector(".status-pill").classList.add(`status-${status}`);
  card.querySelector(".status-pill").textContent = status === "active" ? "Em dia" : status === "soon" ? "Vencendo em breve" : "Expirada";
  card.querySelector(".product-store").textContent = product.store || "Produto sem loja informada";
  card.querySelector(".product-name").textContent = product.name;
  card.querySelector(".product-model").textContent = product.model || " ";
  card.querySelector(".purchase-label").textContent = formatDate(product.purchase_date);
  card.querySelector(".expiry-label").textContent = formatDate(product.expiry_date);
  card.querySelector(".remaining-label").textContent = status === "expired" ? "PRAZO ENCERRADO" : `${Math.max(days, 0)} DIAS`;
  const progressBar = card.querySelector(".track-progress");
  progressBar.style.width = `${progress}%`;
  if (status !== "active") progressBar.classList.add(`progress-${status}`);
  const dot = card.querySelector(".track-dot");
  dot.style.left = `${progress}%`;
  if (status === "soon") dot.style.background = "#efc46d";
  if (status === "expired") dot.style.background = "#d16c6c";
  const daysBadge = card.querySelector(".days-badge");
  daysBadge.textContent = daysCopy(days);
  if (status !== "active") daysBadge.classList.add(`badge-${status}`);
  card.querySelector('[data-action="receipt"]').hidden = !product.receipt_path;
  card.querySelector(".card-menu-trigger").addEventListener("click", (event) => {
    event.stopPropagation();
    const menu = card.querySelector(".card-menu");
    document.querySelectorAll(".card-menu").forEach((item) => { if (item !== menu) item.hidden = true; });
    menu.hidden = !menu.hidden;
  });
  card.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", () => {
    card.querySelector(".card-menu").hidden = true;
    if (button.dataset.action === "edit") openForm(product);
    if (button.dataset.action === "receipt") void openReceipt(product);
    if (button.dataset.action === "delete") askDelete(product);
  }));
  return card;
}

function resetForm() {
  form.reset();
  $("#product-id").value = "";
  $("#warranty-months").value = 12;
  $("#purchase-date").value = localDateString();
  $("#dialog-title").textContent = "Adicionar produto";
  $("#save-product").textContent = "Salvar produto";
  $("#receipt-name").textContent = "Anexar comprovante";
  $("#remove-receipt").hidden = true;
  $("#form-error").hidden = true;
  retainedReceipt = null;
}

function openForm(product) {
  resetForm();
  if (product) {
    $("#dialog-title").textContent = "Editar produto";
    $("#save-product").textContent = "Salvar alterações";
    $("#product-id").value = product.id;
    $("#product-name").value = product.name;
    $("#product-store").value = product.store || "";
    $("#product-model").value = product.model || "";
    $("#purchase-date").value = product.purchase_date;
    $("#warranty-months").value = product.warranty_months;
    $("#product-notes").value = product.notes || "";
    retainedReceipt = product.receipt_path || null;
    if (retainedReceipt) {
      $("#receipt-name").textContent = retainedReceipt.split("/").pop().replace(/^[-\da-f]+-/, "") || "Comprovante anexado";
      $("#remove-receipt").hidden = false;
    }
  }
  dialog.showModal();
  $("#product-name").focus();
}

async function openReceipt(product) {
  const tab = window.open("about:blank", "_blank");
  if (!tab) return showToast("Permita a abertura de uma nova aba para visualizar o comprovante.");
  tab.opener = null;
  const { data, error } = await supabase.storage.from(RECEIPT_BUCKET).createSignedUrl(product.receipt_path, 60);
  if (error) {
    tab.close();
    return showToast("Não foi possível abrir o comprovante.");
  }
  tab.location.replace(data.signedUrl);
}

async function submitForm(event) {
  event.preventDefault();
  const error = $("#form-error");
  error.hidden = true;
  const purchaseDate = $("#purchase-date").value;
  const warrantyMonths = Number($("#warranty-months").value);
  if (purchaseDate > localDateString()) return setFormError("A data da compra não pode estar no futuro.");
  if (!Number.isInteger(warrantyMonths) || warrantyMonths < 0 || warrantyMonths > 600) return setFormError("Informe um prazo de 0 a 600 meses.");
  const file = $("#receipt-file").files[0];
  if (file && file.size > MAX_RECEIPT_SIZE) return setFormError("O comprovante deve ter até 10 MB.");
  if (file && !ALLOWED_RECEIPT_TYPES.has(file.type)) return setFormError("Anexe uma imagem JPG, PNG, WebP, GIF, HEIC ou um PDF.");

  const id = $("#product-id").value;
  const previous = products.find((product) => product.id === id);
  const oldPath = previous?.receipt_path || null;
  let receiptPath = retainedReceipt;
  let uploadedPath = null;
  $("#save-product").disabled = true;
  try {
    if (file) {
      const safeName = file.name.normalize("NFKD").replace(/[^\w.-]+/g, "-").slice(-100) || "comprovante";
      uploadedPath = `${currentUser.id}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from(RECEIPT_BUCKET).upload(uploadedPath, file, {
        cacheControl: "3600", contentType: file.type, upsert: false,
      });
      if (uploadError) throw uploadError;
      receiptPath = uploadedPath;
    }
    const payload = {
      user_id: currentUser.id,
      name: $("#product-name").value.trim(),
      store: $("#product-store").value.trim(),
      model: $("#product-model").value.trim(),
      purchase_date: purchaseDate,
      warranty_months: warrantyMonths,
      expiry_date: addMonths(purchaseDate, warrantyMonths),
      notes: $("#product-notes").value.trim(),
      receipt_path: receiptPath,
      updated_at: new Date().toISOString(),
    };
    const result = previous
      ? await supabase.from(DB_TABLE).update(payload).eq("id", id).eq("user_id", currentUser.id).select().single()
      : await supabase.from(DB_TABLE).insert(payload).select().single();
    if (result.error) throw result.error;
    if (oldPath && oldPath !== receiptPath) {
      const { error: removeError } = await supabase.storage.from(RECEIPT_BUCKET).remove([oldPath]);
      if (removeError) showToast("Produto salvo; o comprovante antigo não pôde ser removido.");
    }
    dialog.close();
    await loadProducts();
    showToast(previous ? "Produto atualizado na sua conta." : "Produto salvo na sua conta.");
  } catch (err) {
    if (uploadedPath) await supabase.storage.from(RECEIPT_BUCKET).remove([uploadedPath]);
    setFormError(friendlyError(err, "Não foi possível salvar. Confira sua conexão e tente de novo."));
  } finally {
    $("#save-product").disabled = false;
  }
}

function setFormError(message) {
  const error = $("#form-error");
  error.textContent = message;
  error.hidden = false;
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2800);
}

function friendlyError(error, fallback) {
  const message = error instanceof Error ? error.message : String(error || "");
  if (/row-level security|permission denied/i.test(message)) return "Sua conta não tem permissão para acessar este item.";
  if (/fetch|network|failed to fetch/i.test(message)) return "Sem conexão com o Supabase. Confira a internet e tente novamente.";
  return fallback || message;
}

function askDelete(product) {
  pendingDelete = product;
  $("#confirm-title").textContent = `Apagar “${product.name}”?`;
  $("#confirm-copy").textContent = product.receipt_path ? "O cadastro e o comprovante serão removidos da sua conta." : "Este produto será removido da sua conta.";
  $("#confirm-dialog").showModal();
}

async function deleteProduct() {
  if (!pendingDelete) return;
  const product = pendingDelete;
  $("#confirm-delete").disabled = true;
  const { error } = await supabase.from(DB_TABLE).delete().eq("id", product.id).eq("user_id", currentUser.id);
  if (error) showToast(friendlyError(error, "Não foi possível apagar o produto."));
  else {
    if (product.receipt_path) {
      const { error: storageError } = await supabase.storage.from(RECEIPT_BUCKET).remove([product.receipt_path]);
      if (storageError) showToast("Produto removido; o comprovante antigo não pôde ser apagado.");
    }
    await loadProducts();
    showToast("Produto removido da sua conta.");
  }
  pendingDelete = null;
  $("#confirm-delete").disabled = false;
  $("#confirm-dialog").close();
}

async function loadProducts() {
  if (!currentUser) return;
  const { data, error } = await supabase.from(DB_TABLE).select("*").eq("user_id", currentUser.id).order("expiry_date", { ascending: true });
  if (error) throw error;
  products = data || [];
  render();
}

function fileToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64, type) {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new Blob([bytes], { type });
}

async function exportBackup() {
  const backupProducts = await Promise.all(products.map(async (product) => {
    const { id, user_id, created_at, updated_at, ...fields } = product;
    let receipt = null;
    if (product.receipt_path) {
      const { data, error } = await supabase.storage.from(RECEIPT_BUCKET).download(product.receipt_path);
      if (error) throw error;
      receipt = { name: product.receipt_path.split("/").pop(), type: data.type || "application/octet-stream", data: await fileToBase64(data) };
    }
    return { ...fields, receipt };
  }));
  const backup = { app: "Garantia By Borges & Rangel", version: 1, exportedAt: new Date().toISOString(), products: backupProducts };
  const file = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = `garantia-backup-${localDateString()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("Backup exportado, incluindo os comprovantes.");
}

async function importBackup(file) {
  const backup = JSON.parse(await file.text());
  if (!(["Garantia", "Garantia By Borges & Rangel"].includes(backup.app)) || !Array.isArray(backup.products)) {
    throw new Error("Esse arquivo não parece ser um backup do Garantia.");
  }
  if (!confirm(`Importar ${backup.products.length} produto(s) para sua conta? Os produtos existentes serão mantidos.`)) return;
  const rows = [];
  const uploadedPaths = [];
  try {
    for (const item of backup.products) {
      const purchaseDate = item.purchase_date || item.purchaseDate;
      const warrantyMonths = Number(item.warranty_months ?? item.warrantyMonths);
      if (!item.name || !purchaseDate || !Number.isInteger(warrantyMonths) || warrantyMonths < 0 || warrantyMonths > 600) continue;
      let receiptPath = null;
      if (item.receipt?.data) {
        const blob = base64ToBlob(item.receipt.data, item.receipt.type || "application/octet-stream");
        if (blob.size > MAX_RECEIPT_SIZE || !ALLOWED_RECEIPT_TYPES.has(blob.type)) continue;
        const safeName = String(item.receipt.name || "comprovante").normalize("NFKD").replace(/[^\w.-]+/g, "-").slice(-100);
        receiptPath = `${currentUser.id}/${crypto.randomUUID()}-${safeName}`;
        const { error } = await supabase.storage.from(RECEIPT_BUCKET).upload(receiptPath, blob, { contentType: blob.type, upsert: false });
        if (error) throw error;
        uploadedPaths.push(receiptPath);
      }
      rows.push({
        user_id: currentUser.id,
        name: String(item.name).slice(0, 100),
        store: String(item.store || "").slice(0, 100),
        model: String(item.model || "").slice(0, 100),
        purchase_date: purchaseDate,
        warranty_months: warrantyMonths,
        expiry_date: item.expiry_date || addMonths(purchaseDate, warrantyMonths),
        notes: String(item.notes || "").slice(0, 500),
        receipt_path: receiptPath,
      });
    }
    if (rows.length) {
      const { error } = await supabase.from(DB_TABLE).insert(rows);
      if (error) throw error;
    }
    await loadProducts();
    showToast(`${rows.length} produto(s) importado(s) para sua conta.`);
  } catch (error) {
    if (uploadedPaths.length) await supabase.storage.from(RECEIPT_BUCKET).remove(uploadedPaths);
    throw error;
  }
}

async function clearAllData() {
  if (!products.length) return showToast("Não há produtos para apagar.");
  if (!confirm("Apagar todos os produtos e comprovantes da sua conta? Esta ação não pode ser desfeita.")) return;
  const paths = products.map((product) => product.receipt_path).filter(Boolean);
  const { error } = await supabase.from(DB_TABLE).delete().eq("user_id", currentUser.id);
  if (error) return showToast(friendlyError(error, "Não foi possível apagar os dados."));
  if (paths.length) {
    const { error: storageError } = await supabase.storage.from(RECEIPT_BUCKET).remove(paths);
    if (storageError) showToast("Cadastros apagados; alguns comprovantes antigos não foram removidos.");
  }
  await loadProducts();
  showToast("Os produtos da sua conta foram apagados.");
}

function setTheme(theme) {
  document.body.classList.toggle("light", theme === "light");
  localStorage.setItem("garantia-theme", theme);
  $("#theme-toggle").setAttribute("aria-label", theme === "light" ? "Ativar tema escuro" : "Ativar tema claro");
  $("#theme-toggle").title = theme === "light" ? "Ativar tema escuro" : "Ativar tema claro";
}

function showLoginMessage(message, isError = true) {
  const element = $("#login-message");
  element.textContent = message;
  element.hidden = !message;
  element.classList.toggle("success", !isError);
}

async function applySession(session) {
  const user = session?.user;
  if (!user) {
    currentUser = null;
    products = [];
    $("#app-shell").hidden = true;
    $("#login-screen").hidden = false;
    render();
    return;
  }
  if (currentUser?.id === user.id) return;
  currentUser = user;
  $("#account-email").textContent = user.email || "Conta conectada";
  $("#login-screen").hidden = true;
  $("#app-shell").hidden = false;
  try { await loadProducts(); }
  catch (error) { showToast(friendlyError(error, "Não foi possível carregar seus produtos.")); }
}

function bindEvents() {
  $("#login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!supabase) return showLoginMessage("A configuração do Supabase ainda não foi carregada.");
    const button = $("#login-submit");
    button.disabled = true;
    button.textContent = "Entrando…";
    showLoginMessage("");
    const { data, error } = await supabase.auth.signInWithPassword({ email: $("#login-email").value.trim(), password: $("#login-password").value });
    button.disabled = false;
    button.textContent = "Entrar";
    if (error) return showLoginMessage(/invalid login credentials/i.test(error.message) ? "E-mail ou senha incorretos." : friendlyError(error, "Não foi possível entrar."));
    await applySession(data.session);
  });
  $("#sign-out").addEventListener("click", async () => {
    const { error } = await supabase.auth.signOut();
    if (error) showToast("Não foi possível sair da conta.");
  });
  $("#add-product").addEventListener("click", () => openForm());
  $("#empty-add").addEventListener("click", () => openForm());
  $("#close-dialog").addEventListener("click", () => dialog.close());
  $("#cancel-dialog").addEventListener("click", () => dialog.close());
  form.addEventListener("submit", submitForm);
  $("#receipt-file").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    $("#receipt-name").textContent = file.name;
    $("#remove-receipt").hidden = false;
  });
  $("#remove-receipt").addEventListener("click", () => {
    retainedReceipt = null;
    $("#receipt-file").value = "";
    $("#receipt-name").textContent = "Anexar comprovante";
    $("#remove-receipt").hidden = true;
  });
  $("#search").addEventListener("input", render);
  $("#filter-button").addEventListener("click", () => {
    const menu = $("#filter-menu");
    menu.hidden = !menu.hidden;
    $("#filter-button").setAttribute("aria-expanded", String(!menu.hidden));
  });
  $("#filter-menu").addEventListener("click", (event) => {
    const option = event.target.closest("[data-filter]");
    if (!option) return;
    activeFilter = option.dataset.filter;
    $("#filter-label").textContent = FILTER_NAMES[activeFilter];
    $("#filter-menu").hidden = true;
    $("#filter-button").setAttribute("aria-expanded", "false");
    render();
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".product-card")) document.querySelectorAll(".card-menu").forEach((menu) => { menu.hidden = true; });
    if (!event.target.closest(".inventory-tools")) $("#filter-menu").hidden = true;
  });
  $("#dismiss-notice").addEventListener("click", () => {
    sessionStorage.setItem("notice-dismissed", "1");
    $("#notice").hidden = true;
  });
  $("#confirm-cancel").addEventListener("click", () => $("#confirm-dialog").close());
  $("#confirm-delete").addEventListener("click", () => void deleteProduct());
  $("#export-data").addEventListener("click", () => void exportBackup().catch((error) => showToast(friendlyError(error, "Não foi possível exportar o backup."))));
  $("#import-file").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try { await importBackup(file); }
    catch (error) { showToast(friendlyError(error, "Não foi possível importar o backup.")); }
    event.target.value = "";
  });
  $("#clear-data").addEventListener("click", () => void clearAllData());
  $("#theme-toggle").addEventListener("click", () => setTheme(document.body.classList.contains("light") ? "dark" : "light"));
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
}

async function init() {
  setTheme(localStorage.getItem("garantia-theme") || "dark");
  bindEvents();
  if (!supabase) {
    showLoginMessage("A configuração do Supabase não foi encontrada.");
    $("#login-submit").disabled = true;
    return;
  }
  supabase.auth.onAuthStateChange((_event, session) => window.setTimeout(() => void applySession(session), 0));
  const { data, error } = await supabase.auth.getSession();
  if (error) showLoginMessage(friendlyError(error, "Não foi possível verificar sua sessão."));
  await applySession(data?.session || null);
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("./sw.js").catch(() => {});
}

void init();
