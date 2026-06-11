(function() {
  'use strict';

  // DOM elements
  const dropzone = document.getElementById('dropzone');
  const dzDefault = document.getElementById('dzDefault');
  const dzSuccess = document.getElementById('dzSuccess');
  const dzFileName = document.getElementById('dzFileName');
  const fileInput = document.getElementById('fileInput');
  const btnGerar = document.getElementById('btnGerar');
  const btnLimpar = document.getElementById('btnLimpar');
  const progressCard = document.getElementById('progressCard');
  const progressFill = document.getElementById('progressFill');
  const progressLabel = document.getElementById('progressLabel');
  const resultCard = document.getElementById('resultCard');
  const resultStats = document.getElementById('resultStats');
  const resultBody = document.getElementById('resultBody');
  const btnDownload = document.getElementById('btnDownload');
  const btnReset = document.getElementById('btnReset');
  const toastStack = document.getElementById('toastStack');

  // checklist
  const checkFormat = document.getElementById('checkFormat');
  const checkUpload = document.getElementById('checkUpload');
  const checkReady = document.getElementById('checkReady');

  // navigation
  const navBtns = document.querySelectorAll('.nav-btn');
  const pages = document.querySelectorAll('.page');

  // state
  let uploadedFile = null;
  let currentResult = null; // { b64, filename, data }

  // ==================== NAVEGAÇÃO ====================
  function navigate(pageId) {
    pages.forEach(page => page.classList.remove('active'));
    document.getElementById(`page-${pageId}`).classList.add('active');
    navBtns.forEach(btn => {
      if (btn.dataset.page === pageId) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  }

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });

  // ==================== TOAST ====================
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-regular fa-circle-check' : (type === 'error' ? 'fa-regular fa-circle-exclamation' : 'fa-regular fa-circle-info');
    toast.innerHTML = `<i class="${icon} ti"></i><span>${message}</span>`;
    toastStack.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }

  // ==================== CHECKLIST ====================
  function updateChecklist() {
    const hasFile = !!uploadedFile;
    checkFormat.classList.toggle('done', hasFile);
    checkUpload.classList.toggle('done', hasFile);
    checkReady.classList.toggle('done', hasFile && btnGerar && !btnGerar.disabled);
    if (hasFile) checkReady.classList.add('done');
    else checkReady.classList.remove('done');
  }

  // ==================== UPLOAD ====================
  function handleFile(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      showToast('formato inválido. use .xlsx ou .xls', 'error');
      return;
    }
    uploadedFile = file;
    dzDefault.style.display = 'none';
    dzSuccess.style.display = 'flex';
    dzFileName.textContent = file.name;
    btnGerar.disabled = false;
    btnLimpar.disabled = false;
    updateChecklist();
    showToast(`arquivo "${file.name}" carregado`, 'success');
  }

  function clearUpload() {
    uploadedFile = null;
    currentResult = null;
    dzDefault.style.display = 'flex';
    dzSuccess.style.display = 'none';
    dzFileName.textContent = '';
    btnGerar.disabled = true;
    btnLimpar.disabled = true;
    progressCard.style.display = 'none';
    resultCard.style.display = 'none';
    fileInput.value = '';
    updateChecklist();
    showToast('upload removido', 'info');
  }

  dropzone.addEventListener('click', () => {
    if (!uploadedFile) fileInput.click();
  });
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleFile(e.target.files[0]);
  });

  // drag & drop
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dz-drag');
  });
  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dz-drag');
  });
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dz-drag');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  btnLimpar.addEventListener('click', clearUpload);

  // ==================== PROCESSAMENTO (API) ====================
  function setProgress(percent, label) {
    progressFill.style.width = `${percent}%`;
    if (label) progressLabel.textContent = label;
  }

  btnGerar.addEventListener('click', async () => {
    if (!uploadedFile) return;

    // show progress
    progressCard.style.display = 'block';
    resultCard.style.display = 'none';
    setProgress(10, 'enviando arquivo...');

    const formData = new FormData();
    formData.append('arquivo', uploadedFile);

    try {
      setProgress(30, 'processando distribuição...');
      const response = await fetch('/api/processar', {
        method: 'POST',
        body: formData
      });

      setProgress(80, 'gerando relatório...');
      const data = await response.json();

      if (data.erro) {
        throw new Error(data.erro);
      }

      setProgress(100, 'concluído!');
      setTimeout(() => {
        progressCard.style.display = 'none';
        showResult(data);
      }, 400);

    } catch (err) {
      progressCard.style.display = 'none';
      showToast(err.message || 'erro ao processar', 'error');
    }
  });

  function showResult(data) {
    currentResult = {
      b64: data.arquivo_b64,
      filename: data.filename,
      resumo: data.resumo,
      total_alunos: data.total_alunos
    };

    resultStats.innerHTML = `<strong>${data.total_alunos}</strong> alunos · <strong>${data.resumo.length}</strong> salas ocupadas`;
    resultBody.innerHTML = '';
    data.resumo.forEach(row => {
      resultBody.innerHTML += `
        <tr>
          <td>Sala ${row.sala}</td>
          <td>${row.ano1 || 0}</td>
          <td>${row.ano2 || 0}</td>
          <td>${row.ano3 || 0}</td>
          <td><strong>${row.total}</strong></td>
        </tr>
      `;
    });
    resultCard.style.display = 'block';
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ==================== DOWNLOAD RESULTADO ====================
  btnDownload.addEventListener('click', () => {
    if (!currentResult || !currentResult.b64) return;
    const binary = atob(currentResult.b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentResult.filename || 'distribuicao_salas.xlsx';
    a.click();
    URL.revokeObjectURL(url);
    showToast('download iniciado', 'success');
  });

  btnReset.addEventListener('click', () => {
    clearUpload();
    resultCard.style.display = 'none';
  });

  // ==================== DOWNLOAD MODELO ====================
  async function downloadTemplate() {
    try {
      const response = await fetch('/api/template');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'modelo_alunos.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      showToast('modelo baixado', 'success');
    } catch (err) {
      showToast('erro ao baixar modelo', 'error');
    }
  }

  const modelBtns = document.querySelectorAll('#btnDownloadModelo, #btnDownloadModelo2');
  modelBtns.forEach(btn => {
    btn.addEventListener('click', downloadTemplate);
  });

  // inicialização
  navigate('organizar');
  updateChecklist();
})();
