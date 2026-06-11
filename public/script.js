(function () {
  'use strict';

  /* ── refs ─────────────────────────────────────── */
  const sidebar     = document.getElementById('sidebar');
  const mobOverlay  = document.getElementById('mobOverlay');
  const mobToggle   = document.getElementById('mobToggle');
  const toastStack  = document.getElementById('toastStack');
  const crumb       = document.getElementById('crumbCurrent');

  const dropzone    = document.getElementById('dropzone');
  const dzDefault   = document.getElementById('dzDefault');
  const dzSuccess   = document.getElementById('dzSuccess');
  const dzFileName  = document.getElementById('dzFileName');
  const fileInput   = document.getElementById('fileInput');
  const btnGerar    = document.getElementById('btnGerar');
  const btnLimpar   = document.getElementById('btnLimpar');
  const actionRow   = document.getElementById('actionRow');
  const previewArea = document.getElementById('previewArea');
  const previewData = document.getElementById('previewData');
  const prevNome    = document.getElementById('prevNome');

  const panelProgress   = document.getElementById('panelProgress');
  const panelResult     = document.getElementById('panelResult');
  const progressLabel   = document.getElementById('progressLabel');
  const progFill        = document.getElementById('progFill');
  const resultMeta      = document.getElementById('resultMeta');
  const resultBody      = document.getElementById('resultBody');
  const btnDownloadResult = document.getElementById('btnDownloadResult');
  const btnNovaDistribuicao = document.getElementById('btnNovaDistribuicao');

  const checks = {
    1: document.getElementById('check1'),
    2: document.getElementById('check2'),
    3: document.getElementById('check3'),
  };

  const PAGE_NAMES = { inicio: 'Início', modelo: 'Modelo', organizar: 'Organizar' };
  let uploaded = false;
  let resultB64 = null;
  let resultFilename = 'resultado.xlsx';

  /* ── navigation ───────────────────────────────── */
  function navigate(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.sb-link').forEach(l => l.classList.remove('active'));
    const page = document.getElementById('page-' + id);
    const link = document.querySelector('.sb-link[data-page="' + id + '"]');
    if (page) page.classList.add('active');
    if (link) link.classList.add('active');
    if (crumb) crumb.textContent = PAGE_NAMES[id] || id;
    closeSidebar();
  }

  document.querySelectorAll('.sb-link').forEach(l => {
    l.addEventListener('click', e => { e.preventDefault(); navigate(l.dataset.page); });
  });

  document.querySelectorAll('[data-goto]').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.goto));
  });

  /* ── mobile sidebar ───────────────────────────── */
  function openSidebar()  { sidebar.classList.add('open'); mobOverlay.classList.add('show'); }
  function closeSidebar() { sidebar.classList.remove('open'); mobOverlay.classList.remove('show'); }
  if (mobToggle)  mobToggle.addEventListener('click', openSidebar);
  if (mobOverlay) mobOverlay.addEventListener('click', closeSidebar);

  /* ── toasts ───────────────────────────────────── */
  function toast(msg, type) {
    type = type || 's';
    const icons = { s: 'fa-circle-check', i: 'fa-circle-info', e: 'fa-circle-exclamation' };
    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.innerHTML = `<i class="fa-solid ${icons[type] || icons.i} ti"></i><span>${msg}</span>`;
    toastStack.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      el.addEventListener('animationend', () => el.remove(), { once: true });
    }, 3600);
  }

  /* ── progress ─────────────────────────────────── */
  function setProgress(pct, label) {
    progFill.style.width = pct + '%';
    if (label && progressLabel) progressLabel.textContent = label;
  }

  /* ── upload ───────────────────────────────────── */
  function applyUpload(file) {
    dzDefault.style.display = 'none';
    dzSuccess.style.display = 'flex';
    dzFileName.textContent  = file.name;
    dropzone.classList.remove('dz-drag');
    uploaded = true;
    btnGerar.disabled  = false;
    btnLimpar.disabled = false;
    if (prevNome) prevNome.textContent = file.name;
    animateChecks();
    setTimeout(() => {
      if (previewArea) previewArea.style.display = 'none';
      if (previewData) previewData.style.display = 'flex';
    }, 500);
  }

  function clearUpload() {
    dzDefault.style.display = 'flex';
    dzSuccess.style.display = 'none';
    dzFileName.textContent  = '';
    uploaded = false;
    resultB64 = null;
    btnGerar.disabled  = true;
    btnLimpar.disabled = true;
    resetChecks();
    if (previewArea) previewArea.style.display = 'flex';
    if (previewData) previewData.style.display = 'none';
    if (panelProgress) panelProgress.style.display = 'none';
    if (panelResult)   panelResult.style.display   = 'none';
    if (actionRow)     actionRow.style.display      = 'flex';
    fileInput.value = '';
    toast('Upload removido', 'i');
  }

  function animateChecks() {
    [1, 2, 3].forEach((k, i) => {
      setTimeout(() => { if (checks[k]) checks[k].classList.add('done'); }, 120 * i);
    });
  }

  function resetChecks() {
    [1, 2, 3].forEach(k => { if (checks[k]) checks[k].classList.remove('done'); });
  }

  if (dropzone) {
    dropzone.addEventListener('click', () => { if (!uploaded) fileInput.click(); });
    dropzone.addEventListener('dragenter', e => { e.preventDefault(); dropzone.classList.add('dz-drag'); });
    dropzone.addEventListener('dragover',  e => { e.preventDefault(); dropzone.classList.add('dz-drag'); });
    dropzone.addEventListener('dragleave', e => {
      if (!dropzone.contains(e.relatedTarget)) dropzone.classList.remove('dz-drag');
    });
    dropzone.addEventListener('drop', e => {
      e.preventDefault();
      dropzone.classList.remove('dz-drag');
      const f = e.dataTransfer.files;
      if (f && f.length) applyUpload(f[0]);
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files.length) applyUpload(fileInput.files[0]);
    });
  }

  if (btnLimpar) btnLimpar.addEventListener('click', clearUpload);

  /* ── gerar ────────────────────────────────────── */
  if (btnGerar) {
    btnGerar.addEventListener('click', async () => {
      if (!uploaded || !fileInput.files[0]) return;

      // UI: esconde botões, mostra progresso
      actionRow.style.display    = 'none';
      panelProgress.style.display = 'block';
      panelResult.style.display   = 'none';
      setProgress(10, 'Enviando arquivo…');

      const form = new FormData();
      form.append('arquivo', fileInput.files[0]);

      try {
        setProgress(35, 'Processando distribuição…');
        const resp = await fetch('/api/processar', { method: 'POST', body: form });
        setProgress(75, 'Gerando Excel…');

        const data = await resp.json();

        if (data.erro) {
          panelProgress.style.display = 'none';
          actionRow.style.display     = 'flex';
          toast(data.erro, 'e');
          return;
        }

        setProgress(100, 'Concluído!');
        setTimeout(() => {
          panelProgress.style.display = 'none';
          mostrarResultado(data);
        }, 500);

      } catch (err) {
        panelProgress.style.display = 'none';
        actionRow.style.display     = 'flex';
        toast('Erro de comunicação: ' + err.message, 'e');
      }
    });
  }

  function mostrarResultado(data) {
    resultB64 = data.arquivo_b64;
    resultFilename = data.filename;

    resultMeta.innerHTML =
      `<strong>${data.total_alunos}</strong> alunos distribuídos em ` +
      `<strong>${data.resumo.length}</strong> salas com sucesso.`;

    resultBody.innerHTML = '';
    data.resumo.forEach(r => {
      resultBody.innerHTML +=
        `<tr>
          <td>Sala ${r.sala}</td>
          <td><span class="badge-ano ba1">${r.ano1}</span></td>
          <td><span class="badge-ano ba2">${r.ano2}</span></td>
          <td><span class="badge-ano ba3">${r.ano3}</span></td>
          <td><span class="badge-ano bat">${r.total}</span></td>
        </tr>`;
    });

    panelResult.style.display = 'block';
    panelResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    toast('Excel gerado com sucesso!', 's');
  }

  /* ── download resultado ───────────────────────── */
  if (btnDownloadResult) {
    btnDownloadResult.addEventListener('click', () => {
      if (!resultB64) return;
      const bytes = Uint8Array.from(atob(resultB64), c => c.charCodeAt(0));
      const blob  = new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href = url; a.download = resultFilename; a.click();
      URL.revokeObjectURL(url);
      toast('Download iniciado', 'i');
    });
  }

  /* ── nova distribuição ────────────────────────── */
  if (btnNovaDistribuicao) {
    btnNovaDistribuicao.addEventListener('click', () => {
      panelResult.style.display = 'none';
      clearUpload();
    });
  }

  /* ── hover lift (touch-safe) ──────────────────── */
  document.querySelectorAll('.feat-card, .step-item, .hero-stat').forEach(el => {
    el.addEventListener('mouseenter', () => { el.style.willChange = 'transform'; });
    el.addEventListener('mouseleave', () => { el.style.willChange = ''; });
  });

  /* ── init ─────────────────────────────────────── */
  navigate('inicio');

}());
