(function () {
  const API = '/agendamentos';

  const el = {
    btnNovo: document.getElementById('btn-novo'),
    btnFiltrar: document.getElementById('btn-filtrar'),
    filterStatus: document.getElementById('filter-status'),
    filterData: document.getElementById('filter-data'),
    filterId: document.getElementById('filter-id'),
    listLoading: document.getElementById('list-loading'),
    listError: document.getElementById('list-error'),
    listEmpty: document.getElementById('list-empty'),
    table: document.getElementById('table-agendamentos'),
    tableBody: document.getElementById('table-body'),
    listCount: document.getElementById('list-count'),
    modalOverlay: document.getElementById('modal-overlay'),
    modalTitle: document.getElementById('modal-title'),
    modalClose: document.getElementById('modal-close'),
    form: document.getElementById('form-agendamento'),
    formId: document.getElementById('form-id'),
    formData: document.getElementById('form-data'),
    formHora: document.getElementById('form-hora'),
    formWebhook: document.getElementById('form-webhook'),
    formDados: document.getElementById('form-dados'),
    formCancel: document.getElementById('form-cancel'),
    formSubmit: document.getElementById('form-submit'),
  };

  function getStatusBadgeClass(status) {
    const s = (status || '').toLowerCase();
    if (s === 'agendado') return 'badge-agendado';
    if (s === 'executado') return 'badge-executado';
    if (s === 'cancelado') return 'badge-cancelado';
    if (s === 'falhou') return 'badge-falhou';
    return 'badge-agendado';
  }

  function formatHora(str) {
    if (!str) return '—';
    if (str.length === 5) return str;
    return str.substring(0, 8);
  }

  function formatData(str) {
    if (!str) return '—';
    return str.substring(0, 10);
  }

  function dadosPreview(dados) {
    if (!dados || typeof dados !== 'object') return '—';
    try {
      const s = JSON.stringify(dados);
      return s.length > 40 ? s.substring(0, 40) + '…' : s;
    } catch {
      return '—';
    }
  }

  function getQueryParams() {
    const status = el.filterStatus.value.trim();
    const data = el.filterData.value.trim();
    const id = el.filterId.value.trim();
    const q = new URLSearchParams();
    if (status) q.set('status', status);
    if (data) q.set('data', data);
    if (id) q.set('id', id);
    return q.toString();
  }

  function setListState(loading, error, empty, itemsLength) {
    el.listLoading.hidden = !loading;
    el.listError.hidden = !error;
    if (error) el.listError.textContent = error;
    el.listEmpty.hidden = !empty;
    el.table.hidden = loading || !!error || empty;
    el.listCount.textContent = itemsLength === undefined ? '' : itemsLength + (itemsLength === 1 ? ' item' : ' itens');
  }

  function renderRow(item) {
    const tr = document.createElement('tr');
    const canEdit = item.status === 'Agendado';
    const canCancel = item.status === 'Agendado';
    tr.innerHTML =
      '<td>' + formatData(item.data) + '</td>' +
      '<td>' + formatHora(item.hora) + '</td>' +
      '<td class="webhook-cell" title="' + (item.webhookUrl || '') + '">' + (item.webhookUrl || '—') + '</td>' +
      '<td><span class="badge ' + getStatusBadgeClass(item.status) + '">' + (item.status || '—') + '</span></td>' +
      '<td class="dados-cell" title="' + (typeof item.dados === 'object' ? JSON.stringify(item.dados) : '') + '">' + dadosPreview(item.dados) + '</td>' +
      '<td class="td-actions">' +
        (canEdit ? '<button type="button" class="btn btn-secondary btn-sm btn-edit" data-id="' + item.id + '">Editar</button>' : '') +
        (canCancel ? '<button type="button" class="btn btn-danger btn-sm btn-cancel" data-id="' + item.id + '">Cancelar</button>' : '') +
        (!canEdit && !canCancel ? '—' : '') +
      '</td>';
    return tr;
  }

  async function loadList() {
    setListState(true, false, false);
    const qs = getQueryParams();
    const url = qs ? API + '?' + qs : API;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Erro ao carregar: ' + res.status);
      const json = await res.json();
      const items = json.agendamentos || [];
      setListState(false, false, items.length === 0, items.length);
      el.tableBody.innerHTML = '';
      items.forEach(function (item) {
        el.tableBody.appendChild(renderRow(item));
      });
      el.tableBody.querySelectorAll('.btn-edit').forEach(function (btn) {
        btn.addEventListener('click', function () { openEdit(btn.dataset.id); });
      });
      el.tableBody.querySelectorAll('.btn-cancel').forEach(function (btn) {
        btn.addEventListener('click', function () { cancelar(btn.dataset.id); });
      });
    } catch (err) {
      setListState(false, err.message || 'Falha ao conectar na API.', false, 0);
    }
  }

  function openCreate() {
    el.formId.value = '';
    el.modalTitle.textContent = 'Novo agendamento';
    el.form.reset();
    el.formDados.value = '{}';
    el.formData.value = '';
    el.formHora.value = '';
    el.formWebhook.value = '';
    el.modalOverlay.hidden = false;
    el.modalOverlay.setAttribute('aria-hidden', 'false');
    el.formData.focus();
  }

  async function openEdit(id) {
    try {
      const res = await fetch(API + '/' + encodeURIComponent(id));
      if (!res.ok) throw new Error('Agendamento não encontrado');
      const item = await res.json();
      el.formId.value = item.id || '';
      el.modalTitle.textContent = 'Editar agendamento';
      el.formData.value = formatData(item.data) || '';
      var h = (item.hora || '').substring(0, 5);
      if ((item.hora || '').length >= 8) h = item.hora.substring(0, 8);
      el.formHora.value = h || '';
      el.formWebhook.value = item.webhookUrl || '';
      el.formDados.value = typeof item.dados === 'object' && item.dados !== null
        ? JSON.stringify(item.dados, null, 2)
        : '{}';
      el.modalOverlay.hidden = false;
      el.modalOverlay.setAttribute('aria-hidden', 'false');
      el.formData.focus();
    } catch (err) {
      alert(err.message || 'Erro ao carregar agendamento.');
    }
  }

  function closeModal() {
    el.modalOverlay.hidden = true;
    el.modalOverlay.setAttribute('aria-hidden', 'true');
  }

  function horaToApi(horaStr) {
    if (!horaStr) return '00:00';
    var parts = horaStr.split(':');
    var h = (parts[0] || '0').padStart(2, '0');
    var m = (parts[1] || '0').padStart(2, '0');
    var s = (parts[2] || '0').padStart(2, '0');
    return h + ':' + m + (s !== '00' ? ':' + s : '');
  }

  async function submitForm(e) {
    e.preventDefault();
    var dados = {};
    try {
      var raw = (el.formDados.value || '').trim();
      if (raw) dados = JSON.parse(raw);
    } catch {
      alert('Dados inválidos: informe um JSON válido.');
      return;
    }
    var payload = {
      data: el.formData.value,
      hora: horaToApi(el.formHora.value),
      webhookUrl: el.formWebhook.value.trim(),
      dados: dados,
    };
    var id = el.formId.value.trim();
    var url = API;
    var method = 'POST';
    if (id) {
      url = API + '/' + encodeURIComponent(id);
      method = 'PUT';
    }
    el.formSubmit.disabled = true;
    try {
      var res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      var body = await res.json().catch(function () { return {}; });
      if (!res.ok) {
        throw new Error(body.error || body.details ? JSON.stringify(body.details) : 'Erro ' + res.status);
      }
      closeModal();
      loadList();
    } catch (err) {
      alert(err.message || 'Erro ao salvar.');
    } finally {
      el.formSubmit.disabled = false;
    }
  }

  async function cancelar(id) {
    if (!confirm('Cancelar este agendamento? Ele aparecerá como Cancelado na listagem.')) return;
    try {
      var res = await fetch(API + '/' + encodeURIComponent(id), { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ' + res.status);
      loadList();
    } catch (err) {
      alert(err.message || 'Erro ao cancelar.');
    }
  }

  el.btnNovo.addEventListener('click', openCreate);
  el.btnFiltrar.addEventListener('click', loadList);
  el.modalClose.addEventListener('click', closeModal);
  el.formCancel.addEventListener('click', closeModal);
  el.form.addEventListener('submit', submitForm);
  el.modalOverlay.addEventListener('click', function (e) {
    if (e.target === el.modalOverlay) closeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !el.modalOverlay.hidden) closeModal();
  });

  loadList();
})();
