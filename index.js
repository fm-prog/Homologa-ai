document.addEventListener('DOMContentLoaded', function() {
  const fileInput = document.getElementById('fileInput');
  const processBtn = document.getElementById('processBtn');
  const classificarBtn = document.getElementById('classificacaoBtn');
  const previewSection = document.getElementById('previewSection');
  const previewTable = document.getElementById('previewTable');
  const statsInfo = document.getElementById('statsInfo');
  const statusMessage = document.getElementById('statusMessage');
  const resultsSection = document.getElementById('resultsSection');
  const originalCount = document.getElementById('originalCount');
  const uniqueCount = document.getElementById('uniqueCount');
  const duplicatesTable = document.getElementById('duplicatesTable');
  const duplicatesSection = document.getElementById('duplicatesSection');
  const homologacaoBtn = document.getElementById('homologacaoBtn');
  const differencesSection = document.getElementById('differencesSection');
  const differencesTable = document.getElementById('differencesTable');
  const downloadPdfBtn = document.getElementById('downloadPdfBtn');
  const groupingFieldsSection = document.getElementById('groupingFieldsSection');
  const groupingFieldsContainer = document.getElementById('groupingFieldsContainer');
  const containerCheck = document.querySelector('.checkbox-container');
  const buttonOrdem = document.getElementById('sortByNameCheckbox'); 
  const backToTopBtn = document.getElementById("backToTopBtn");
  let workbook = null;
  let cleanedData = [];
  let duplicatesInfo = [];
  let currentHeaders = [];
  let semHora = false;
  let allKeys = [];

  // Função para mostrar o modal com a mensagem e aplicar a cor de fundo
  function mostrarModal(mensagem, categoria) {
  
    const modal = document.getElementById('meuModal');
    const modalContent = modal.querySelector('.modal-content');
    const mensagemModal = document.getElementById('mensagemModal');
  
    if (mensagemModal) {
  
        // Define o texto da mensagem no modal
        mensagemModal.innerHTML = mensagem;
  
        // Remove classes de categoria anteriores
        modalContent.classList.remove('success', 'error', 'info');
  
        // Adiciona a classe correspondente à categoria
        if (categoria) {
  
            modalContent.classList.add(categoria);
  
        }
  
        // Exibe o modal
        modal.style.display = 'block';
  
    }
  
  
  
    // Fecha o modal ao clicar no botão de fechar
    const fecharBtn = modal.querySelector('.fechar');

    fecharBtn.onclick = function () {
        modal.style.display = 'none';
    };
  
  
  
    // Fecha o modal ao clicar fora dele
    window.onclick = function (event) {
        if (event.target === modal) {
  
          modal.style.display = 'none';
  
        }
  
    };

  
    // Fecha automaticamente após 2 segundos
    setTimeout(() => {
        fecharModal();
    }, 2000);
  
  }
  
    // Função para fechar o modal
  function fecharModal() {
    
    const modal = document.getElementById('meuModal');
  
    if (modal) {
  
      modal.style.display = 'none';
  
    }
  
  }
  
  // Verifica se há mensagens de flash
  if (typeof flashMessages !== 'undefined' && flashMessages.length > 0) {

    // Itera sobre as mensagens e exibe a primeira (ou todas, se desejar)
    flashMessages.forEach(([categoria, mensagem]) => {
  
        mostrarModal(mensagem, categoria);
  
    });
  
  }
  
  // Função para definir a mensagem de status com a cor correta
  function setStatusMessage(message, type) {
      statusMessage.textContent = message;
      statusMessage.className = `text-sm italic text-center sm:text-right`;
      if (type === 'success') {
          statusMessage.classList.add('text-green-600');
      } else if (type === 'error') {
          statusMessage.classList.add('text-red-500');
      } else {
          statusMessage.classList.add('text-blue-600');
      }
  }
  
  // Define a mensagem inicial como neutra
  setStatusMessage('Aguardando arquivo...', 'neutral');
  
  // Adiciona Listenner no botão de selecionar o arquivo
  fileInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;
  
      setStatusMessage('Lendo arquivo...', 'neutral');
      processBtn.disabled = true;
      homologacaoBtn.classList.add('hidden');
      classificarBtn.classList.add('hidden');
      downloadPdfBtn.classList.add('hidden');
      resultsSection.classList.add('hidden');
      previewSection.classList.add('hidden');
      groupingFieldsSection.classList.add('hidden');
  
      const reader = new FileReader();
      reader.onload = function(e) {
          try {
              const data = new Uint8Array(e.target.result);
              workbook = XLSX.read(data, { type: 'array' });
  
              const firstSheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[firstSheetName];
              const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
              if (jsonData.length <= 1) {
                  setStatusMessage('A planilha está vazia ou não tem dados suficientes.', 'error');
                  mostrarModal('A planilha está vazia ou não tem dados suficientes.', 'error');
                  return;
              }
  
              currentHeaders = jsonData[0].map(h => h ? h.toString().trim() : '');
              const dateKey = currentHeaders.find(h => h.toLowerCase().includes('submission date') || h.toLowerCase().includes('data de envio'));
  
              if (!dateKey) {
                  setStatusMessage('Erro: A planilha deve conter a coluna "Submission Date".', 'error');
                  mostrarModal('Erro: A planilha deve conter a coluna "Submission Date".','error');
                  return;
              }
  
              showPreview(jsonData);
              populateGroupingFields(currentHeaders);
              processBtn.disabled = false;
              setStatusMessage('Arquivo carregado. Selecione os campos para a análise de duplicidade e clique em Processar.', 'success');
              mostrarModal('Arquivo carregado. Selecione os campos para a análise de duplicidade e clique em Processar!', 'success');
  
          } catch (error) {
              console.error(error);
              setStatusMessage('Erro ao ler arquivo: ' + error.message, 'error');
              mostrarModal('Erro ao ler arquivo: ' + error.message, 'error');
          }
      };
      reader.readAsArrayBuffer(file);
  });
  
  // Popula os checkboxes para seleção dos campos de agrupamento
  function populateGroupingFields(headers) {
      groupingFieldsContainer.innerHTML = '';
      groupingFieldsSection.classList.remove('hidden');
  
      const commonKeys = headers.filter(h => 
          h.toLowerCase().includes('cpf')
      );

      allKeys = headers;
      
      headers.forEach(header => {
          const checkboxDiv = document.createElement('div');
          checkboxDiv.className = 'flex items-center';
          
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.id = `field-${header}`;
          checkbox.value = header;
          checkbox.className = 'h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500';
  
          const label = document.createElement('label');
          label.htmlFor = `field-${header}`;
          label.textContent = header;
          label.className = 'ml-2 text-sm text-gray-700';
  
          checkboxDiv.appendChild(checkbox);
          checkboxDiv.appendChild(label);
          groupingFieldsContainer.appendChild(checkboxDiv);
          
          if (commonKeys.includes(header)) {
              checkbox.checked = true;
          }
      });
  }
  
  // Adiciona Listenner no botão de processar o arquivo
  processBtn.addEventListener('click', function(e) {
      containerCheck.style.display = 'flex';
    
      if (this.disabled) {
          e.preventDefault();
          setStatusMessage('Processamento concluído! O botão "Processar Planilha" foi desativado. Para processar um novo arquivo, selecione-o.', 'neutral');
          mostrarModal('Processamento concluído!','success');
          return;
      }
      
      const selectedFields = Array.from(groupingFieldsContainer.querySelectorAll('input:checked')).map(cb => cb.value);
      if (selectedFields.length === 0) {
          setStatusMessage('Por favor, selecione pelo menos um campo para identificar duplicatas.', 'error');
          mostrarModal('Por favor, selecione pelo menos um campo para identificar duplicatas.', 'error');
          return;
      }
  
      if (!workbook) return;
  
      setStatusMessage('Processando...', 'neutral');
      this.disabled = true;
  
      setTimeout(() => {
          try {
              processData(selectedFields);

              if (semHora){
              mostrarModal('A coluna "submission date" não contém Hora, Minuto ou Segundo, o padrão 00:00 foi definido!<br>A acurácia para determinar a inscrição mais recente diminuiu!','info');
              }else{
              mostrarModal('Processamento concluído!', 'success');
              }

              setStatusMessage('Processamento concluído! Os dados estão prontos.', 'success');

              homologacaoBtn.classList.remove('hidden');
              homologacaoBtn.disabled = false;
              classificarBtn.classList.remove('hidden');
              classificarBtn.disabled = false;
              if (duplicatesInfo.length > 0) {
                  downloadPdfBtn.classList.remove('hidden');
                  downloadPdfBtn.disabled = false;
              } else {
                  mostrarModal('Não foram encontradas inscrições duplicadas!', 'success');
                  downloadPdfBtn.classList.add('hidden');
                  downloadPdfBtn.disabled = true;
              }
              resultsSection.classList.remove('hidden');
          } catch (error) {
              console.error(error);
              setStatusMessage('Erro no processamento: ' + error.message, 'error');
              mostrarModal('Erro no processamento: ' + error.message, 'error');
          }
      }, 1000);
  });
  
  // Mostra uma prévia dos dados carregados
  function showPreview(data) {
      const headers = data[0];
      const sampleRows = data.slice(1, Math.min(data.length, 6));
  
      previewTable.querySelector('thead tr').innerHTML = '';
      previewTable.querySelector('tbody').innerHTML = '';
  
      headers.forEach(header => {
          const th = document.createElement('th');
          th.className = 'py-2 px-4 border-b border-gray-200 text-left text-xs font-semibold ' + 
                           (header.toLowerCase().includes('cpf') ? 'text-blue-800 bg-blue-50' : 'text-gray-600 uppercase');
          th.textContent = header;
          previewTable.querySelector('thead tr').appendChild(th);
      });
  
      sampleRows.forEach(row => {
          const tr = document.createElement('tr');
          headers.forEach((_, index) => {
              const td = document.createElement('td');
              td.className = 'py-2 px-4 border-b border-gray-200 text-sm ' + 
                               (headers[index].toLowerCase().includes('cpf') ? 'font-medium text-blue-700' : '');
              td.textContent = row[index] !== undefined ? row[index] : '';
              tr.appendChild(td);
          });
          previewTable.querySelector('tbody').appendChild(tr);
      });
  
      statsInfo.textContent = `Mostrando ${sampleRows.length} de ${data.length - 1} registros.`;
      previewSection.classList.remove('hidden');
  }
  
  // Processa os dados para encontrar duplicatas
  function processData(groupingKeys) {
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
  
      if (jsonData.length === 0) {
          throw new Error('Planilha vazia');
      }
      
      const firstRow = jsonData[0];
      const dateKey = Object.keys(firstRow).find(key => key.toString().toLowerCase().includes('submission date'));
  
      if (!dateKey) {
          throw new Error('Coluna "Submission Date" é necessária');
      }
      
      const groupedData = {};
      jsonData.forEach(row => {
          const groupKeyValues = groupingKeys.map(key => {
              const formattedKey = key.endsWith(':') ? key : `${key}:`;
              const value = row[key] ? row[key].toString().trim() : '';
              return `${formattedKey} ${value}`;
          }).join(', ');
  
          if (!groupKeyValues) return;
  
          if (!groupedData[groupKeyValues]) {
              groupedData[groupKeyValues] = [];
          }
          groupedData[groupKeyValues].push(row);
      });
  
      cleanedData = [];
      duplicatesInfo = [];
  
      Object.keys(groupedData).forEach(key => {
          const group = groupedData[key];
          if (group.length === 0) return;
  
          let mostRecent = group[0];
          //console.log(mostRecent[dateKey]);
          let mostRecentDate = parseDate(mostRecent[dateKey]);
          //console.log(mostRecentDate);
  
          group.forEach((row) => {
              const currentDate = parseDate(row[dateKey]);
  
              if (currentDate && (!mostRecentDate || currentDate.isAfter(mostRecentDate))) {
                  mostRecent = row;
                  mostRecentDate = currentDate;
              }
          });
  
          if (!mostRecent || typeof mostRecent !== 'object') {
              console.warn(`Pulando grupo ${key} devido a dados inválidos.`);
              return;
          }
  
          cleanedData.push(mostRecent);
          
  
          if (group.length > 1) {
              const diffFields = {};
              Object.keys(mostRecent).forEach(fieldKey => {
                  const uniqueValues = new Set();
                  group.forEach(row => {
                      const value = row[fieldKey] !== undefined && row[fieldKey] !== null ? String(row[fieldKey]).replace(/[\n\r]/g, ' ').trim() : '';
                      uniqueValues.add(JSON.stringify(value));
                  });
                  
                  if (uniqueValues.size > 1) {
                      diffFields[fieldKey] = Array.from(uniqueValues).map(v => JSON.parse(v));
                  }
              });
  
              const groupingFieldsDisplay = groupingKeys.map(key => {
                  const formattedKey = key.endsWith(':') ? key : `${key}:`;
                  const value = group[0][key] ? group[0][key].toString().trim() : '';
                  return `${formattedKey} ${value}`;
              }).join(', ');
  
              duplicatesInfo.push({
                  groupingFields: groupingFieldsDisplay,
                  count: group.length,
                  mostRecentDate: mostRecentDate ? mostRecentDate.format('DD/MM/YYYY - HH:mm') : 'N/A',
                  differences: diffFields,
                  mostRecentRecord: mostRecent
              });
          }
      });
  
      originalCount.textContent = jsonData.length;
      uniqueCount.textContent = cleanedData.length;
      
      const noDuplicatesMessage = duplicatesSection.querySelector('.no-duplicates-message');
      if (noDuplicatesMessage) noDuplicatesMessage.remove();
  
      if (duplicatesInfo.length > 0) {
          duplicatesSection.classList.remove('hidden');
          differencesSection.classList.remove('hidden');
          
          renderDuplicatesTable();
          renderDifferencesTable(groupingKeys);
      } else {
          duplicatesSection.classList.remove('hidden');
          differencesSection.classList.add('hidden');
          const noDuplicatesMessage = document.createElement('p');
          noDuplicatesMessage.className = 'no-duplicates-message text-center text-gray-500 italic mt-4';
          noDuplicatesMessage.textContent = 'Nenhuma inscrição duplicada encontrada!';
          duplicatesSection.appendChild(noDuplicatesMessage);
      }
  }

  // Renderiza a tabela de duplicatas
  function renderDuplicatesTable() {
      const duplicatesTableBody = duplicatesTable.querySelector('tbody');
      duplicatesTableBody.innerHTML = '';
      duplicatesInfo.forEach(info => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
              <td class="py-2 px-4 border-b border-gray-200 text-sm font-medium text-blue-700">${info.groupingFields}</td>
              <td class="py-2 px-4 border-b border-gray-200 text-sm">${info.count}</td>
              <td class="py-2 px-4 border-b border-gray-200 text-sm">${info.mostRecentDate}</td>
          `;
          duplicatesTableBody.appendChild(tr);
      });
  }
  
  // Renderiza a tabela de diferenças
  function renderDifferencesTable(groupingKeys) {
      const differencesTableBody = differencesTable.querySelector('tbody');
      differencesTableBody.innerHTML = '';
      
      duplicatesInfo.forEach(info => {
          if (Object.keys(info.differences).length > 0) {
              const headerRow = document.createElement('tr');
              const headerCell = document.createElement('td');
              headerCell.colSpan = 3;
              headerCell.className = 'px-6 py-3 bg-blue-100 text-sm font-bold text-blue-800 border-b border-blue-200 sticky top-0';
              headerCell.textContent = `Detalhes da Duplicidade: ${info.groupingFields}`;
              headerRow.appendChild(headerCell);
              differencesTableBody.appendChild(headerRow);
  
              Object.keys(info.differences).forEach(key => {
                  const tr = document.createElement('tr');
                  const mostRecentValue = String(info.mostRecentRecord[key] || '').replace(/[\n\r]/g, ' ').trim();
                  const otherValues = info.differences[key].filter(v => JSON.stringify(v) !== JSON.stringify(mostRecentValue));
                  const otherValuesString = otherValues.map(v => String(v).replace(/[\n\r]/g, ' ').trim()).join(', ');
                  
                  tr.innerHTML = `
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">${key}</td>
                      <td class="px-6 py-4 text-sm font-medium text-green-800 bg-green-50 rounded-lg">${mostRecentValue}</td>
                      <td class="px-6 py-4 text-sm text-gray-500">${otherValuesString || '-'}</td>
                  `;
                  differencesTableBody.appendChild(tr);
              });
          }
      });
  }
  
  // Array que associa cada regex a uma função de parse
  const regexParsers = [
  // 09/01/2025 - OK
  {
    regex: /^(\d{2})\/(\d{2})\/(\d{4})$/,
    parse: (match) => ({ day: parseInt(match[1]), month: parseInt(match[2]) -1, year: parseInt(match[3]) })
  },
  // set 1, 2025 - OK
  {
    regex: /^([a-zA-Z]{3}) (\d{1,2}), (\d{4})$/,
    parse: (match) => ({ month: match[1], day: parseInt(match[2]), year: parseInt(match[3]) })
  },
  // set 1, 2025 - Ok
  {
    regex: /^([a-zA-Z]{3})\. (\d{1,2}), (\d{4})$/,
    parse: (match) => ({ month: match[1], day: parseInt(match[2]), year: parseInt(match[3]) })
  },
  // setembro 1, 2025 - Ok
  {
    regex: /^([a-zA-Záàâãéèêíïóôõöúçñ\s]+) (\d{1,2}), (\d{4})$/,
    parse: (match) => ({ month: match[1], day: parseInt(match[2]), year: parseInt(match[3]) })
  },
  // Seg, set 1, 2025 - Ok
  {
    regex: /^[a-zA-Záàâãéèêíïóôõöúçñ]+, ([a-zA-Z]{3})\. (\d{1,2}), (\d{4})$/,
    parse: (match) => ({ month: match[1], day: parseInt(match[2]), year: parseInt(match[3]) })
  },
  // Segunda-feira, setembro 1, 2025 - OK
  {
    regex: /^[a-zA-Záàâãéèêíïóôõöúçñ-]+, ([a-zA-Záàâãéèêíïóôõöúçñ]+) (\d{1,2}), (\d{4})$/,
    parse: (match) => ({ month: match[1], day: parseInt(match[2]), year: parseInt(match[3]) })
  },
  // set 1, 2025 18:47 - OK
  {
    regex: /^([a-zA-Z]{3})\. (\d{1,2}), (\d{4}) (\d{2}):(\d{2})$/,
    parse: (match) => ({ month: match[1], day: parseInt(match[2]), year: parseInt(match[3]), hour: parseInt(match[4]), minute: parseInt(match[5]) })
  },
  // setembro 1, 2025 18:47 - OK
  {
    regex: /^([a-zA-Záàâãéèêíïóôõöúçñ\s]+) (\d{1,2}), (\d{4}) (\d{2}):(\d{2})$/,
    parse: (match) => ({ month: match[1], day: parseInt(match[2]), year: parseInt(match[3]), hour: parseInt(match[4]), minute: parseInt(match[5]) })
  },
  // Seg, set 1, 2025 18:47 - OK
  {
    regex: /^[a-zA-Záàâãéèêíïóôõöúçñ]+, ([a-zA-Z]{3})\. (\d{1,2}), (\d{4}) (\d{2}):(\d{2})$/,
    parse: (match) => ({ month: match[1], day: parseInt(match[2]), year: parseInt(match[3]), hour: parseInt(match[4]), minute: parseInt(match[5]) })
  },
  // Segunda-feira, setembro 1, 2025 18:47 - OK
  {
    regex: /^[a-zA-Záàâãéèêíïóôõöúçñ-]+, ([a-zA-Záàâãéèêíïóôõöúçñ]+) (\d{1,2}), (\d{4}) (\d{2}):(\d{2})$/,
    parse: (match) => ({ month: match[1], day: parseInt(match[2]), year: parseInt(match[3]), hour: parseInt(match[4]), minute: parseInt(match[5]) })
  },
  // 2025-09-01 18:47:55 - OK
  {
    regex: /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/,
    parse: (match) => ({ year: parseInt(match[1]), month: parseInt(match[2]) - 1, day: parseInt(match[3]), hour: parseInt(match[4]), minute: parseInt(match[5]), second: parseInt(match[6]) })
  },
  // 01-09-2025 18:47:55 - OK
  {
    regex: /^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2}):(\d{2})$/,
    parse: (match) => ({ day: parseInt(match[1]), month: parseInt(match[2]) - 1, year: parseInt(match[3]), hour: parseInt(match[4]), minute: parseInt(match[5]), second: parseInt(match[6]) })
  },
  // 2025/09/01 18:47:55 - OK
  {
    regex: /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})$/,
    parse: (match) => ({ year: parseInt(match[1]), month: parseInt(match[2]) - 1, day: parseInt(match[3]), hour: parseInt(match[4]), minute: parseInt(match[5]), second: parseInt(match[6]) })
  },
  // 01/09/2025 18:47:55 - OK
  {
    regex: /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/,
    parse: (match) => ({ day: parseInt(match[1]), month: parseInt(match[2]) - 1, year: parseInt(match[3]), hour: parseInt(match[4]), minute: parseInt(match[5]), second: parseInt(match[6]) })
  }
  ];
  
  const monthMap = {
      'jan': 0, 'fev': 1, 'mar': 2, 'abr': 3, 'mai': 4,
      'jun': 5, 'jul': 6, 'ago': 7, 'set': 8, 'out': 9,
      'nov': 10, 'dez': 11,
      'janeiro': 0, 'fevereiro': 1, 'março': 2, 'abril': 3,
      'maio': 4, 'junho': 5, 'julho': 6, 'agosto': 7,
      'setembro': 8, 'outubro': 9, 'novembro': 10, 'dezembro': 11
  };
  
  function getMonthNumber(monthName) {
      const cleanName = monthName.toLowerCase().replace('.', '');
      return monthMap[cleanName];
  }

  // Função para analisar a data usando regex e moment.js
  function parseDate(dateValue) {
    if (!dateValue) return null;
    if (dateValue instanceof Date) {
      return moment(dateValue).tz('America/Sao_Paulo');
    }
  
    const dateString = dateValue.toString();
  
    // Itera sobre o array de parsers
    for (const parser of regexParsers) {
      const match = dateString.match(parser.regex);
  
      if (match) {
        console.log(`Encontrou o match! A regex é: ${parser.regex.source}, o valor é: ${dateString}`);
        const parsedData = parser.parse(match);
  
        // Se o mês é uma string, converte para número
        if (typeof parsedData.month === 'string') {
          const monthNumber = getMonthNumber(parsedData.month);
          if (monthNumber === undefined) {
            console.error(`Mês inválido: ${parsedData.month}`);
            return null;
          }
          parsedData.month = monthNumber;
        }

        console.log(parsedData);

        if (!parsedData.hour && !parsedData.minute && !parsedData.second) {
            semHora = true;
        }
        
        // Cria o objeto Moment a partir dos dados extraídos
        const momentObj = moment.tz(parsedData, 'America/Sao_Paulo');
        return momentObj.isValid() ? momentObj : null;
      }
    }
  
    // Se nenhum dos parsers deu match, tenta o parse padrão do moment
    const parsed = moment.tz(dateString, 'America/Sao_Paulo');
    return parsed.isValid() ? parsed : null;
  }

  // Adiciona Listenner no botão de Homologação
  homologacaoBtn.addEventListener('click', function() {

      if (buttonOrdem.checked){

        cleanedData.sort((a, b) => {
          const nomeA = a["Nome:"].toUpperCase(); // Converte para maiúsculas para garantir a ordem correta
          const nomeB = b["Nome:"].toUpperCase(); // Converte para maiúsculas para garantir a ordem correta
        
          if (nomeA < nomeB) {
            return -1;
          }
          if (nomeA > nomeB) {
            return 1;
          }
        
          return 0;
        });
        
      }
      
      localStorage.setItem('processedData', JSON.stringify({
          data: cleanedData,
          viewType: 'homologacao'
      }));
      window.location.href = 'homologacao.html';
  });
  
  downloadPdfBtn.addEventListener('click', function() {
      setStatusMessage('Gerando relatório PDF...', 'neutral');
      setTimeout(() => {
          generatePdfReport();
          setStatusMessage('Relatório PDF gerado com sucesso!', 'success');
          mostrarModal('Relatório PDF gerado com sucesso!', 'success');
      }, 100);
  });

  // Adiciona Listenner no botão de Classificação
  classificarBtn.addEventListener('click', function() {

      if (buttonOrdem.checked){
        cleanedData.sort((a, b) => {
          const nomeA = a["Nome:"].toUpperCase(); // Converte para maiúsculas para garantir a ordem correta
          const nomeB = b["Nome:"].toUpperCase(); // Converte para maiúsculas para garantir a ordem correta
        
          if (nomeA < nomeB) {
            return -1;
          }
          if (nomeA > nomeB) {
            return 1;
          }
        
          return 0;
        });
        
      }
      
      localStorage.setItem('processedData', JSON.stringify({
          data: cleanedData,
          viewType: 'classificacao'
      }));

      localStorage.setItem('allKeys', JSON.stringify(allKeys));
      
      window.location.href = 'classificacao.html';
  });
  




  
  // Gera o relatório PDF usando jsPDF e jsPDF-AutoTable
  function generatePdfReport() {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(22);
      doc.text("Relatório de Registros Duplicados", 14, 20);
  
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(12);
      doc.text(`Total de registros originais: ${originalCount.textContent}`, 14, 30);
      doc.text(`Total de registros únicos: ${uniqueCount.textContent}`, 14, 36);
  
      let startY = 50;
      
      doc.autoTable({
          startY: startY,
          head: [['Campos de Duplicidade', 'Ocorrências', 'Data Mais Recente']],
          body: duplicatesInfo.map(info => [info.groupingFields, info.count, info.mostRecentDate]),
          theme: 'striped',
          headStyles: { fillColor: [240, 240, 240], textColor: [50, 50, 50], fontStyle: 'bold' },
          styles: { overflow: 'linebreak' },
          bodyStyles: { textColor: [50, 50, 50] },
          didDrawPage: function (data) {
              doc.setFontSize(10);
              doc.text(`Página ${doc.internal.getNumberOfPages()}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
          }
      });
  
      startY = doc.autoTable.previous.finalY + 10;
      
      duplicatesInfo.forEach(info => {
          if (Object.keys(info.differences).length > 0) {
              if (startY + 20 > doc.internal.pageSize.height) {
                  doc.addPage();
                  startY = 20;
              }
              
              doc.setFontSize(14);
              doc.setFont('Helvetica', 'bold');
              doc.text(`Detalhes da Duplicidade: ${info.groupingFields}`, 14, startY);
              startY += 8;
              
              const tableHeaders = [['Campo', 'Valor Mantido', 'Outros Valores']];
              const tableRows = [];
  
              Object.keys(info.differences).forEach(key => {
                  const mostRecentValue = String(info.mostRecentRecord[key] || '').replace(/[\n\r]/g, ' ').trim();
                  const otherValues = info.differences[key].filter(v => JSON.stringify(v) !== JSON.stringify(mostRecentValue));
                  const otherValuesString = otherValues.map(v => String(v).replace(/[\n\r]/g, ' ').trim()).join('\n');
                  
                  tableRows.push([
                      key,
                      mostRecentValue,
                      otherValuesString || '-'
                  ]);
              });
              
            
              doc.autoTable({
              startY: startY,
                  head: tableHeaders,
                  body: tableRows,
                  theme: 'striped',
                  headStyles: { fillColor: [240, 240, 240], textColor: [50, 50, 50], fontStyle: 'bold' },
                  styles: { overflow: 'linebreak' },
                  bodyStyles: { textColor: [50, 50, 50] },
                  columnStyles: {
                      0: { fontStyle: 'bold', minCellWidth: 30 },
                      1: { minCellWidth: 60 },
                      2: { minCellWidth: 60 }
                  },
                  didDrawCell: function(data) {
                      // no colors
                  },
                  didDrawPage: function (data) {
                      doc.setFontSize(10);
                      doc.text(`Página ${doc.internal.getNumberOfPages()}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
                  }
              });
              startY = doc.autoTable.previous.finalY + 15;
          }
      });
  
      doc.save('relatorio_duplicados.pdf');
  }

  // Lógica para o botão "Voltar ao Topo"
  window.onscroll = function() {
      if (document.body.scrollTop > 200 || document.documentElement.scrollTop > 200) {
          backToTopBtn.classList.add('show');
      } else {
          backToTopBtn.classList.remove('show');
      }
  };
  
  window.scrollToTop = function() {
      window.scrollTo({
          top: 0,
          behavior: 'smooth'
      });
  };


  
});