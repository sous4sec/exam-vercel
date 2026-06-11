(function() {
  'use strict';

  // DOM elements
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const fileName = document.getElementById('fileName');
  const btnProcess = document.getElementById('btnProcess');
  const btnClear = document.getElementById('btnClear');
  const progress = document.getElementById('progress');
  const progressFill = document.getElementById('progressFill');
  const progressLabel = document.getElementById('progressLabel');
  const alertError = document.getElementById('alertError');
  const resultCard = document.getElementById('resultCard');
  const resultStats = document.getElementById('resultStats');
  const resultBody = document.getElementById('resultBody');
  const btnDownload = document.getElementById('btnDownload');
  const btnReset = document.getElementById('btnReset');
  const toastContainer = document.getElementById('toastContainer');

  // Checklist elements
  const check1 = document.getElementById('check1');
  const check2 = document.getElementById('check2');
  const check3 = document.getElementById('check3');

  // State
  let uploadedFile = null;
  let resultB64 = null;
  let resultFilename = 'resultado.xlsx';

  // Toast
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fa-regular ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i><span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Update checklist
  function updateChecklist() {
    if (uploadedFile) {
      check1.classList.add('done');
      check2.classList.add('done');
      check3.classList.add('done');
      btnProcess.disabled = false;
      btnClear.disabled = false;
    } else {
      check1.classList.remove('done');
      check2.classList.remove('done');
      check3.classList.remove('done');
      btnProcess.disabled = true;
      btnClear.disabled = true;
    }
  }

  // Hide error
  function hideError() {
    alertError.classList.remove('show');
  }

  // Show error
  function showError(message) {
    alertError.textContent = message;
    alertError.classList.add('show');
  }

  // Set progress
  function setProgress(percent, label) {
    progressFill.style.width = percent + '%';
    if (label) progressLabel.textContent = label;
  }

  // Handle file selection
  function setFile(file) {
    if (!file) return;
    
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      showError('Formato inválido. Use arquivos .xlsx ou .xls');
      return;
    }
    
    uploadedFile = file;
    fileName.textContent = file.name;
    hideError();
    updateChecklist();
    showToast(`Arquivo "${file.name}" carregado`, 'success');
  }

  // Clear upload
  function clearUpload() {
    uploadedFile = null;
    resultB64 = null;
    fileName.textContent = '';
    fileInput.value = '';
    progress.classList.remove('show');
    resultCard.style.display = 'none';
    hideError();
    updateChecklist();
    showToast('Upload removido', 'success');
  }

  // Dropzone events
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('drag');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag');
    const file = e.dataTransfer.files[0];
    if (file) setFile(file);
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) setFile(fileInput.files[0]);
  });

  btnClear.addEventListener('click', clearUpload);

  // Process file
  btnProcess.addEventListener('click', async () => {
    if (!uploadedFile) {
      showError('Selecione um arquivo primeiro');
      return;
    }

    hideError();
    resultCard.style.display = 'none';
    progress.classList.add('show');
    setProgress(10, 'Enviando arquivo...');

    const formData = new FormData();
    formData.append('arquivo', uploadedFile);

    try {
      setProgress(30, 'Processando distribuição...');
      const response = await fetch('/api/processar', {
        method: 'POST',
        body: formData
      });

      setProgress(70, 'Gerando relatório...');
      const data = await response.json();

      if (data.erro) {
        throw new Error(data.erro);
      }

      setProgress(100, 'Concluído!');
      setTimeout(() => {
        progress.classList.remove('show');
        showResult(data);
      }, 400);

    } catch (err) {
      progress.classList.remove('show');
      showError(err.message || 'Erro ao processar arquivo');
      showToast(err.message || 'Erro ao processar', 'error');
    }
  });

  // Show result
  function showResult(data) {
    resultB64 = data.arquivo_b64;
    resultFilename = data.filename;

    resultStats.innerHTML = `<strong>${data.total_alunos}</strong> alunos distribuídos em <strong>${data.resumo.length}</strong> salas`;

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
    showToast('Distribuição gerada com sucesso!', 'success');
  }

  // Download result
  btnDownload.addEventListener('click', () => {
    if (!resultB64) return;

    const binary = atob(resultB64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = resultFilename;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Download iniciado', 'success');
  });

  // Reset
  btnReset.addEventListener('click', () => {
    clearUpload();
    resultCard.style.display = 'none';
  });
})();
