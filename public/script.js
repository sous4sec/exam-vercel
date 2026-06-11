(function() {
  'use strict';

  // Theme Toggle
  const themeToggle = document.getElementById('themeToggle');
  const htmlElement = document.body;
  
  function setTheme(theme) {
    htmlElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }
  
  function toggleTheme() {
    const currentTheme = htmlElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  }
  
  themeToggle.addEventListener('click', toggleTheme);
  
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    setTheme(savedTheme);
  } else {
    setTheme('light');
  }
  
  // DOM Elements
  const dropzone = document.getElementById('dropzone');
  const dropzoneDefault = document.getElementById('dropzoneDefault');
  const dropzoneSuccess = document.getElementById('dropzoneSuccess');
  const uploadFileName = document.getElementById('uploadFileName');
  const fileInput = document.getElementById('fileInput');
  const btnProcess = document.getElementById('btnProcess');
  const btnClear = document.getElementById('btnClear');
  const progressWrapper = document.getElementById('progressWrapper');
  const progressBar = document.getElementById('progressBar');
  const progressLabel = document.getElementById('progressLabel');
  const progressPercent = document.getElementById('progressPercent');
  const errorAlert = document.getElementById('errorAlert');
  const errorMessage = document.getElementById('errorMessage');
  const resultCard = document.getElementById('resultCard');
  const resultSummary = document.getElementById('resultSummary');
  const resultBody = document.getElementById('resultBody');
  const btnDownload = document.getElementById('btnDownload');
  const btnNewDistribution = document.getElementById('btnNewDistribution');
  const toastContainer = document.getElementById('toastContainer');
  
  // State
  let uploadedFile = null;
  let resultB64 = null;
  let resultFilename = 'resultado.xlsx';
  
  // Toast function
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `custom-toast ${type}`;
    toast.innerHTML = `<i class="fa-regular ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'} me-2"></i><span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
  
  // Hide error
  function hideError() {
    errorAlert.style.display = 'none';
    errorMessage.textContent = '';
    errorAlert.classList.remove('show');
  }
  
  // Show error
  function showError(message) {
    errorMessage.textContent = message;
    errorAlert.style.display = 'block';
    errorAlert.classList.add('show');
    setTimeout(() => {
      errorAlert.classList.remove('show');
      setTimeout(() => {
        errorAlert.style.display = 'none';
      }, 300);
    }, 5000);
  }
  
  // Set progress
  function setProgress(percent, label) {
    progressBar.style.width = `${percent}%`;
    progressPercent.textContent = `${percent}%`;
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
    dropzoneDefault.style.display = 'none';
    dropzoneSuccess.style.display = 'flex';
    uploadFileName.textContent = file.name;
    hideError();
    btnProcess.disabled = false;
    btnClear.disabled = false;
    showToast(`Arquivo "${file.name}" carregado com sucesso`, 'success');
  }
  
  // Clear upload
  function clearUpload() {
    uploadedFile = null;
    resultB64 = null;
    dropzoneDefault.style.display = 'flex';
    dropzoneSuccess.style.display = 'none';
    uploadFileName.textContent = '';
    fileInput.value = '';
    progressWrapper.style.display = 'none';
    resultCard.style.display = 'none';
    hideError();
    btnProcess.disabled = true;
    btnClear.disabled = true;
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
    progressWrapper.style.display = 'block';
    setProgress(0, 'Iniciando...');
    
    const formData = new FormData();
    formData.append('arquivo', uploadedFile);
    
    try {
      setProgress(15, 'Enviando arquivo...');
      const response = await fetch('/api/processar', {
        method: 'POST',
        body: formData
      });
      
      setProgress(40, 'Processando distribuição...');
      const data = await response.json();
      
      if (data.erro) {
        throw new Error(data.erro);
      }
      
      setProgress(80, 'Gerando relatório...');
      
      setTimeout(() => {
        setProgress(100, 'Concluído!');
        setTimeout(() => {
          progressWrapper.style.display = 'none';
          showResult(data);
        }, 400);
      }, 300);
      
    } catch (err) {
      progressWrapper.style.display = 'none';
      showError(err.message || 'Erro ao processar arquivo');
      showToast(err.message || 'Erro ao processar', 'error');
    }
  });
  
  // Show result
  function showResult(data) {
    resultB64 = data.arquivo_b64;
    resultFilename = data.filename;
    
    resultSummary.innerHTML = `<strong>${data.total_alunos}</strong> alunos · <strong>${data.resumo.length}</strong> salas ocupadas`;
    
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
  
  // New distribution
  btnNewDistribution.addEventListener('click', () => {
    clearUpload();
    resultCard.style.display = 'none';
  });
})();
