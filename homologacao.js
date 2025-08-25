document.addEventListener('DOMContentLoaded', () => {
    const dataDisplayContainer = document.getElementById('data-display-container');
    const singleCardView = document.getElementById('single-card-view');
    const optionsGrid = document.getElementById('options-grid');
    const undecidedInfoBox = document.getElementById('undecided-info-box');
    const undecidedTitle = document.getElementById('undecided-title');
    const undecidedBadge = document.getElementById('undecided-badge');
    const deferidosBadge = document.getElementById('deferidos-badge');
    const indeferidosBadge = document.getElementById('indeferidos-badge');
    const generateReportBtn = document.getElementById('generateReportBtn');
    const groupingPanel = document.getElementById('grouping-panel');
    const groupingFieldsContainer = document.getElementById('grouping-fields-container');
    const addGroupFieldBtn = document.getElementById('add-group-field-btn');
    const loadingMessage = document.getElementById('loading-message');
    const noDataMessage = document.getElementById('no-data-message');
    const navigationControls = document.getElementById('navigation-controls');
    const backToGroupsBtn = document.getElementById('backToGroupsBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const counterSpan = document.getElementById('counter');
    const searchInput = document.getElementById('searchInput');
    const searchBar = document.getElementById('searchBar');
    const processedDataKey = 'processedData';
    const hiddenFieldsKey = 'hiddenFields';
    const decisionsKey = 'decisions';
    const groupingConfigKey = 'groupingConfig';
    const openedDocumentsKey = 'openedDocuments';
    let processedData = [];
    let hiddenFields = new Set();
    let decisions = {};
    let openedDocuments = new Set();
    let allKeys = [];
    let groupingFields = [];
    let filteredData = [];
    let currentCardIndex = 0;


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

    function saveHiddenFields() {
        localStorage.setItem(hiddenFieldsKey, JSON.stringify(Array.from(hiddenFields)));
    }

    function loadHiddenFields() {
        const stored = localStorage.getItem(hiddenFieldsKey);
        if (stored) {
            hiddenFields = new Set(JSON.parse(stored));
        }
    }

    function saveDecisions() {
        localStorage.setItem(decisionsKey, JSON.stringify(decisions));
    }

    function loadDecisions() {
        const stored = localStorage.getItem(decisionsKey);
        if (stored) {
            decisions = JSON.parse(stored);
        }
    }
    
    function saveOpenedDocuments() {
        localStorage.setItem(openedDocumentsKey, JSON.stringify(Array.from(openedDocuments)));
    }

    function loadOpenedDocuments() {
        const stored = localStorage.getItem(openedDocumentsKey);
        if (stored) {
            openedDocuments = new Set(JSON.parse(stored));
        }
    }

    function saveGroupingConfig() {
        const selects = groupingFieldsContainer.querySelectorAll('select');
        const config = Array.from(selects).map(s => s.value).filter(v => v !== "");
        localStorage.setItem(groupingConfigKey, JSON.stringify(config));
    }

    function loadGroupingConfig() {
        const stored = localStorage.getItem(groupingConfigKey);
        if (stored) {
            groupingFields = JSON.parse(stored);
        } else {
            groupingFields = [];
        }
        if (groupingFields.length === 0) {
            groupingFields.push("");
        }
    }

    function addGroupingField(value = "") {
        const newFieldDiv = document.createElement('div');
        newFieldDiv.className = 'grouping-field-row';
        const select = document.createElement('select');
        select.className = 'mt-1 block w-full';
        select.innerHTML = '<option value="">Nenhum</option>' + allKeys.map(key => `<option value="${key}" ${key === value ? 'selected' : ''}>${key.replace(/:$/, '')}</option>`).join('');
        select.addEventListener('change', () => {
            saveGroupingConfig();
            reloadAndRender();
        });

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.innerHTML = `<i class="fas fa-minus"></i>`;
        removeBtn.addEventListener('click', () => {
            newFieldDiv.remove();
            saveGroupingConfig();
            reloadAndRender();
        });

        newFieldDiv.appendChild(select);
        newFieldDiv.appendChild(removeBtn);
        groupingFieldsContainer.appendChild(newFieldDiv);
    }

    function populateGroupingOptions() {
        if (allKeys.length === 0) return;
        groupingFieldsContainer.innerHTML = '';
        groupingFields.forEach(field => addGroupingField(field));
    }

    function getGroupedData(data) {
        const groupingKeys = Array.from(groupingFieldsContainer.querySelectorAll('select')).map(s => s.value).filter(v => v !== "");
        
        if (groupingKeys.length === 0) {
            return { 'Todos': { 'Inscrições': data } };
        }

        let grouped = {};

        data.forEach(item => {
            let currentLevel = grouped;
            groupingKeys.forEach((key, index) => {
                const groupKey = item[key] || 'Não informado';
                if (index === groupingKeys.length - 1) {
                    if (!currentLevel[groupKey]) {
                        currentLevel[groupKey] = [];
                    }
                    const rawUniqueId = item['CPF:'] || item['E-mail:'];
                    const uniqueId = (rawUniqueId || '').toString().replace(/[\.\-]/g, '');
                    currentLevel[groupKey].push({ ...item, uniqueId });
                } else {
                    if (!currentLevel[groupKey]) {
                        currentLevel[groupKey] = {};
                    }
                    currentLevel = currentLevel[groupKey];
                }
            });
        });

        return grouped;
    }
    
    function renderGroupedData(data, groupingKeys) {
        dataDisplayContainer.innerHTML = '';
        if (Object.keys(data).length === 0) {
            dataDisplayContainer.innerHTML = '<p class="text-center text-gray-500 italic">Nenhum registro a ser exibido com base nos critérios de agrupamento.</p>';
            return;
        }

        function renderRecursive(container, data, keys, level = 0) {
            const currentKey = keys[level];
            
            for (const groupKey in data) {
                if (data.hasOwnProperty(groupKey)) {
                    const subgroup = data[groupKey];
                    
                    const groupCard = document.createElement('div');
                    groupCard.className = 'group-card';
                    
                    const titleElement = document.createElement('h2');
                    titleElement.textContent = `${(currentKey || 'Grupo').replace(/:$/, '')}: ${groupKey}`;
                    groupCard.appendChild(titleElement);
                    
                    if (Array.isArray(subgroup)) {
                        const subgroupDetails = document.createElement('details');
                        subgroupDetails.open = true;

                        const subgroupSummary = document.createElement('summary');
                        subgroupSummary.className = 'group-summary';
                        subgroupSummary.style.display = 'flex';
                        subgroupSummary.style.justifyContent = 'space-between';
                        subgroupSummary.style.alignItems = 'center';
                        
                        const countSpan = document.createElement('span');
                        countSpan.textContent = `Inscrições (${subgroup.length})`;

                        const evaluateButton = document.createElement('button');
                        evaluateButton.className = 'nav-btn';
                        evaluateButton.innerHTML = `<i class="fas fa-play"></i> Avaliar Subgrupo`;
                        evaluateButton.addEventListener('click', () => {
                            if (subgroup.length === 0){
                              evaluateButton.style.display = 'none';
                              mostrarModal('Não foram encontradas correspondências nesse subgrupo!','error')
                            }
                            else
                            {
                              evaluateButton.style.display = 'flex'; 
                              startInteractiveEvaluation(subgroup);
                            }
                        });
                        
                        subgroupSummary.appendChild(countSpan);
                        subgroupSummary.appendChild(evaluateButton);
                        subgroupDetails.appendChild(subgroupSummary);
                        
                        groupCard.appendChild(subgroupDetails);
                    } else {
                         const nestedDetails = document.createElement('details');
                         nestedDetails.className = 'subgroup-card';
                         nestedDetails.open = true;
                         
                         const nestedSummary = document.createElement('summary');
                         nestedSummary.className = 'group-summary';
                         nestedSummary.textContent = `${(currentKey || 'Subgrupo').replace(/:$/, '')}: ${groupKey}`;
                         nestedDetails.appendChild(nestedSummary);

                         renderRecursive(nestedDetails, subgroup, keys, level + 1);
                         
                         groupCard.appendChild(nestedDetails);
                    }
                    
                    container.appendChild(groupCard);
                }
            }
        }
        
        renderRecursive(dataDisplayContainer, data, groupingKeys);
    }
    
    function startInteractiveEvaluation(subgroupRecords) {
        filteredData = subgroupRecords;
        currentCardIndex = 0;
        dataDisplayContainer.style.display = 'none';
        groupingPanel.style.display = 'none';
        searchBar.style.display = 'none';
        navigationControls.style.display = 'flex';
        singleCardView.style.display = 'block';
        renderCurrentCard();
    }
    
    function startUndecidedEvaluation() {
         const undecidedRecords = processedData.filter(item => {
             const uniqueId = (item['CPF:'] || item['E-mail:'] || '').toString().replace(/[\.\-]/g, '');
             return !decisions[uniqueId] || !decisions[uniqueId].status;
         });

         if (undecidedRecords.length > 0) {
             filteredData = undecidedRecords;
             currentCardIndex = 0;
             dataDisplayContainer.style.display = 'none';
             groupingPanel.style.display = 'none';
             searchBar.style.display = 'none';
             navigationControls.style.display = 'flex';
             singleCardView.style.display = 'block';
             renderCurrentCard();
         } else {
             mostrarModal('Todas as inscrições já foram avaliadas!','success');
         }
    }
    
    function startDeferidosEvaluation() {
         const deferidosRecords = processedData.filter(item => {
             const uniqueId = (item['CPF:'] || item['E-mail:'] || '').toString().replace(/[\.\-]/g, '');
             return decisions[uniqueId] && decisions[uniqueId].status === 'deferida';
         });

         if (deferidosRecords.length > 0) {
             filteredData = deferidosRecords;
             currentCardIndex = 0;
             dataDisplayContainer.style.display = 'none';
             groupingPanel.style.display = 'none';
             searchBar.style.display = 'none';
             navigationControls.style.display = 'flex';
             singleCardView.style.display = 'block';
             renderCurrentCard();
         } else {
             mostrarModal('Não há inscrições deferidas para visualizar.','error');
             
         }
    }
    
    function startIndeferidosEvaluation() {
         const indeferidosRecords = processedData.filter(item => {
             const uniqueId = (item['CPF:'] || item['E-mail:'] || '').toString().replace(/[\.\-]/g, '');
             return decisions[uniqueId] && decisions[uniqueId].status === 'indeferida';
         });

         if (indeferidosRecords.length > 0) {
             filteredData = indeferidosRecords;
             currentCardIndex = 0;
             dataDisplayContainer.style.display = 'none';
             groupingPanel.style.display = 'none';
             searchBar.style.display = 'none';
             navigationControls.style.display = 'flex';
             singleCardView.style.display = 'block';
             renderCurrentCard();
         } else {
             mostrarModal('Não há inscrições indeferidas para visualizar.','error');
         }
    }

    function backToGroupView() {
        dataDisplayContainer.style.display = 'block';
        groupingPanel.style.display = 'flex';
        searchBar.style.display = 'flex';
        navigationControls.style.display = 'none';
        singleCardView.style.display = 'none';
        reloadAndRender();
    }

    function createRecordCard(item, index) {
        const rawUniqueId = item['CPF:'] || item['E-mail:'] || `id-${index}`;
        const uniqueId = (rawUniqueId || '').toString().replace(/[\.\-]/g, '');
        const decision = decisions[uniqueId] || { status: null, motivo: '' };

        let cardClasses = `data-card record-card-wrapper mb-4`;
        if (decision.status) {
            cardClasses += ` status-${decision.status}`;
        }

        const cardWrapper = document.createElement('div');
        cardWrapper.className = cardClasses;
        cardWrapper.id = `record-${uniqueId}`;

        let html = '';
        for (const key of allKeys) {
            if (!hiddenFields.has(key)) {
                let value = item[key];
                let fieldClass = '';

                if (key.toLowerCase().trim() === 'nome:') {
                    value = (value || '').toUpperCase();
                }

                if (typeof value === 'string' && value.startsWith('http')) {
                    const linksArray = value.split('\n').filter(link => link.trim() !== '');
                    let linksHtml = '';
                    const pdfjsViewerUrl = "https://mozilla.github.io/pdf.js/web/viewer.html";
                    
                    linksArray.forEach(link => {
                        const trimmedLink = link.trim();
                        const viewerUrl = `${pdfjsViewerUrl}?file=${encodeURIComponent(trimmedLink)}`;
                        const isOpened = openedDocuments.has(trimmedLink);
                        
                        linksHtml += `<a href="${viewerUrl}" target="_blank" data-original-url="${trimmedLink}" class="document-link-button ${isOpened ? 'document-link-opened' : ''}" title="Abrir Documento"><i class="fas fa-file-alt"></i> Abrir Documento</a>`;
                    });
                    value = linksHtml;
                } else if (value === null || value === undefined || value === '') {
                    value = 'Não informado';
                }

                html += `
                    <div class="data-field ${fieldClass}">
                        <strong>${key}</strong>
                        <p>${value}</p>
                    </div>
                `;
            }
        }

        const decisionCardHtml = `
            <div class="decision-card">
                ${decision.status ? `
                    <h3>Status da Inscrição</h3>
                    <span class="status-badge ${decision.status}">${decision.status}</span>
                    ${decision.motivo ? `<p class="status-justificativa">Motivo: ${decision.motivo}</p>` : ''}
                    <button class="nav-btn clear-decision-btn" data-id="${uniqueId}">Limpar Decisão</button>
                ` : `
                    <h3>Avaliar Inscrição</h3>
                    <div class="decision-buttons">
                        <button class="decision-btn deferida" data-id="${uniqueId}" data-status="deferida">Deferida</button>
                        <button class="decision-btn indeferida" data-id="${uniqueId}" data-status="indeferida">Indeferida</button>
                    </div>
                    <div class="justificativa-area">
                        <label for="justificativa-${uniqueId}">Motivo do indeferimento:</label>
                        <textarea id="justificativa-${uniqueId}" rows="3" placeholder="Digite o motivo aqui..."></textarea>
                        <button class="nav-btn save-justificativa-btn" data-id="${uniqueId}">Salvar</button>
                    </div>
                `}
            </div>
        `;

        cardWrapper.innerHTML = decisionCardHtml + html;
        addDecisionListeners(cardWrapper, uniqueId);
        return cardWrapper;
    }
    
    function renderCurrentCard() {
        singleCardView.innerHTML = '';
        if (filteredData.length === 0) {
            navigationControls.style.display = 'none';
            return;
        }

        const currentItem = filteredData[currentCardIndex];
        if (currentItem) {
            const card = createRecordCard(currentItem, currentCardIndex);
            singleCardView.appendChild(card);
            addDocumentLinkListeners(card);
        }
        updateNavigationButtons();
    }

    function updateNavigationButtons() {
        counterSpan.textContent = `${currentCardIndex + 1} de ${filteredData.length}`;
        prevBtn.disabled = currentCardIndex === 0;
        nextBtn.disabled = currentCardIndex === filteredData.length - 1;
    }

    function addDecisionListeners(card, uniqueId) {
        const deferidaBtn = card.querySelector('.decision-btn.deferida');
        const indeferidaBtn = card.querySelector('.decision-btn.indeferida');
        const clearBtn = card.querySelector('.clear-decision-btn');
        
        const handleDecisionAndAdvance = (status, motivo) => {
            handleDecision(status, uniqueId, motivo);

            const currentIsLast = (currentCardIndex === filteredData.length - 1);
            
            const isUndecidedMode = (filteredData.some(item => !decisions[item.uniqueId] || !decisions[item.uniqueId].status));
            const isDeferidosMode = (filteredData.some(item => decisions[item.uniqueId] && decisions[item.uniqueId].status === 'deferida'));
            const isIndeferidosMode = (filteredData.some(item => decisions[item.uniqueId] && decisions[item.uniqueId].status === 'indeferida'));
            
            // If the user is in a filtered mode (pendentes, deferidos, indeferidos), re-filter and re-render.
            if (isUndecidedMode || isDeferidosMode || isIndeferidosMode) {
                let filteredRecords = [];
                if (isUndecidedMode) {
                    filteredRecords = processedData.filter(item => {
                        const uid = (item['CPF:'] || item['E-mail:'] || '').toString().replace(/[\.\-]/g, '');
                        return !decisions[uid] || !decisions[uid].status;
                    });
                } else if (isDeferidosMode) {
                    filteredRecords = processedData.filter(item => {
                        const uid = (item['CPF:'] || item['E-mail:'] || '').toString().replace(/[\.\-]/g, '');
                        return decisions[uid] && decisions[uid].status === 'deferida';
                    });
                } else if (isIndeferidosMode) {
                    filteredRecords = processedData.filter(item => {
                        const uid = (item['CPF:'] || item['E-mail:'] || '').toString().replace(/[\.\-]/g, '');
                        return decisions[uid] && decisions[uid].status === 'indeferida';
                    });
                }

                if (filteredRecords.length === 0) {
                    mostrarModal('A lista de inscrições chegou ao fim!','success');
                    backToGroupView();
                    return;
                }
                
                filteredData = filteredRecords;
                if (currentCardIndex >= filteredData.length) {
                    currentCardIndex = 0;
                }
                renderCurrentCard();
            } else { // Normal flow
                if (!currentIsLast) {
                    currentCardIndex++;
                    renderCurrentCard();
                } else {
                    mostrarModal('Você chegou ao fim desta lista!','success');
                    backToGroupView();
                }
            }
        };

        if (deferidaBtn) {
            deferidaBtn.addEventListener('click', () => {
                handleDecisionAndAdvance('deferida', '');
            });
        }
        if (indeferidaBtn) {
            const justificativaArea = card.querySelector('.justificativa-area');
            const saveBtn = card.querySelector('.save-justificativa-btn');
            const textarea = card.querySelector(`#justificativa-${uniqueId}`);

            indeferidaBtn.addEventListener('click', () => {
                justificativaArea.classList.add('show');
                if (textarea) textarea.focus();
            });

            saveBtn.addEventListener('click', () => {
                const motivo = textarea ? textarea.value : '';
                handleDecisionAndAdvance('indeferida', motivo);
            });
        }
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                delete decisions[uniqueId];
                saveDecisions();
                updateStatusBox();
                renderCurrentCard();
            });
        }
    }
    
    function addDocumentLinkListeners(card) {
        const documentLinks = card.querySelectorAll('.document-link-button');
        documentLinks.forEach(link => {
            link.addEventListener('click', () => {
                const url = event.currentTarget.getAttribute('data-original-url');
                if (!openedDocuments.has(url)) {
                    openedDocuments.add(url);
                    saveOpenedDocuments();
                    link.classList.add('document-link-opened');
                }
            });
        });
    }

    function handleDecision(status, uniqueId, motivo) {
        decisions[uniqueId] = { status, motivo };
        saveDecisions();
        updateStatusBox();
    }

    function getUndecidedCount() {
        let count = 0;
        processedData.forEach(item => {
            const rawUniqueId = item['CPF:'] || item['E-mail:'];
            const uniqueId = (rawUniqueId || '').toString().replace(/[\.\-]/g, '');
            if (!decisions[uniqueId] || !decisions[uniqueId].status) {
                count++;
            }
        });
        return count;
    }
    
    function getDeferidosCount() {
        let count = 0;
        processedData.forEach(item => {
            const rawUniqueId = item['CPF:'] || item['E-mail:'];
            const uniqueId = (rawUniqueId || '').toString().replace(/[\.\-]/g, '');
            if (decisions[uniqueId] && decisions[uniqueId].status === 'deferida') {
                count++;
            }
        });
        return count;
    }
    
    function getIndeferidosCount() {
        let count = 0;
        processedData.forEach(item => {
            const rawUniqueId = item['CPF:'] || item['E-mail:'];
            const uniqueId = (rawUniqueId || '').toString().replace(/[\.\-]/g, '');
            if (decisions[uniqueId] && decisions[uniqueId].status === 'indeferida') {
                count++;
            }
        });
        return count;
    }

    function checkIfAllDecided() {
        return getUndecidedCount() === 0;
    }

    function updateStatusBox() {
        const undecidedCount = getUndecidedCount();
        const deferidosCount = getDeferidosCount();
        const indeferidosCount = getIndeferidosCount();

        undecidedBadge.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Pendentes: ${undecidedCount}`;
        deferidosBadge.innerHTML = `<i class="fas fa-check"></i> Deferidas: ${deferidosCount}`;
        indeferidosBadge.innerHTML = `<i class="fas fa-times"></i> Indeferidas: ${indeferidosCount}`;
        
        undecidedBadge.style.display = 'inline-flex';
        deferidosBadge.style.display = 'inline-flex';
        indeferidosBadge.style.display = 'inline-flex';

        if (checkIfAllDecided()) {
            undecidedTitle.textContent = 'Avaliação Concluída!';
            undecidedInfoBox.classList.add('completed');
            undecidedBadge.style.display = 'none';
            generateReportBtn.style.display = 'inline-flex';
        } else {
            undecidedTitle.textContent = 'Status da Avaliação';
            undecidedInfoBox.classList.remove('completed');
            undecidedBadge.style.display = 'inline-flex';
            generateReportBtn.style.display = 'none';
        }
        undecidedInfoBox.classList.add('show');
    }

    function reloadAndRender() {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredBySearch = processedData.filter(item => {
            for (const key in item) {
                if (item.hasOwnProperty(key) && String(item[key]).toLowerCase().includes(searchTerm)) {
                    return true;
                }
            }
            console.log('Isso mesmo!');
            return false;
            
        });
        
        const groupedData = getGroupedData(filteredBySearch);
        const groupingKeys = Array.from(groupingFieldsContainer.querySelectorAll('select')).map(s => s.value).filter(v => v !== "");
        renderGroupedData(groupedData, groupingKeys);
        updateStatusBox();
    }

    const storedProcessedData = localStorage.getItem(processedDataKey);
    if (storedProcessedData) {
        try {
            const parsed = JSON.parse(storedProcessedData);
            processedData = parsed.data;

            if (!processedData || processedData.length === 0) {
                loadingMessage.style.display = 'none';
                noDataMessage.style.display = 'block';
                mostrarModal('Erro ao carregar os dados!','error');
                return;
            }

            allKeys = Object.keys(processedData[0]);
            loadHiddenFields();
            loadDecisions();
            loadOpenedDocuments();
            createOptionsCheckboxes();
            populateGroupingOptions();
            reloadAndRender();
            loadingMessage.style.display = 'none';

        } catch (error) {
            console.error('Erro ao carregar dados do Local Storage:', error);
            loadingMessage.style.display = 'none';
            noDataMessage.textContent = 'Erro ao carregar dados. Por favor, verifique a planilha na página anterior.';
            noDataMessage.style.display = 'block';
            mostrarModal('Erro ao carregar dados do Local Storage:', error);
        }
    } else {
        loadingMessage.style.display = 'none';
        noDataMessage.style.display = 'block';
    }

    function createOptionsCheckboxes() {
        optionsGrid.innerHTML = '';
        allKeys.forEach(key => {
            const isHidden = hiddenFields.has(key);
            const sanitizedKey = key.replace(/:$/, '');
            optionsGrid.innerHTML += `
                <div class="field-option">
                    <input type="checkbox" id="check-${sanitizedKey}" data-key="${key}" ${!isHidden ? 'checked' : ''}>
                    <label for="check-${sanitizedKey}">${sanitizedKey}</label>
                </div>
            `;
        });

        optionsGrid.addEventListener('change', (event) => {
            const target = event.target;
            if (target.type === 'checkbox') {
                const key = target.getAttribute('data-key');
                if (target.checked) {
                    hiddenFields.delete(key);
                } else {
                    hiddenFields.add(key);
                }
                saveHiddenFields();
                backToGroupView();
            }
        });
    }
    
    addGroupFieldBtn.addEventListener('click', () => addGroupingField());
    generateReportBtn.addEventListener('click', () => {
        generateWordReport();
    });

    undecidedBadge.addEventListener('click', () => {
        startUndecidedEvaluation();
    });
    deferidosBadge.addEventListener('click', () => {
        startDeferidosEvaluation();
    });
    indeferidosBadge.addEventListener('click', () => {
        startIndeferidosEvaluation();
    });

    backToGroupsBtn.addEventListener('click', backToGroupView);
    prevBtn.addEventListener('click', () => {
        if (currentCardIndex > 0) {
            currentCardIndex--;
            renderCurrentCard();
        }
    });
    nextBtn.addEventListener('click', () => {
        if (currentCardIndex < filteredData.length - 1) {
            currentCardIndex++;
            renderCurrentCard();
        }
    });

    searchInput.addEventListener('keyup', reloadAndRender);

    function renderReportRecursiveHtml(data, keys, level = 0) {
        let html = '';
        const currentKey = keys[level] || 'Grupo';

        for (const groupKey in data) {
            if (data.hasOwnProperty(groupKey)) {
                const subgroup = data[groupKey];
                const cleanedKey = currentKey.replace(/:$/, '');

                html += `<h${level + 2} style="font-family: 'Poppins', sans-serif; font-size: ${18 - (level * 2)}px; font-weight: 600; margin-top: 20px; margin-bottom: 10px; color: #2c3e50;">${cleanedKey}: ${groupKey}</h${level + 2}>`;
                html += '<hr style="border: 0; height: 1px; background-color: #e0e0e0; margin-bottom: 15px;">';

                if (Array.isArray(subgroup)) {
                    let tableRows = '';
                    subgroup.forEach(item => {
                        const rawUniqueId = item['CPF:'] || item['E-mail:'];
                        const uniqueId = (rawUniqueId || '').toString().replace(/[\.\-]/g, '');
                        const decision = decisions[uniqueId];
                        const nome = (item['Nome:'] || '').toUpperCase();
                        const situacao = decision ? decision.status.toUpperCase() : '';
                        const motivo = (decision && decision.motivo) ? decision.motivo : '';

                        let rowStyle = '';
                        let situacaoColor = '';
                        if (decision && decision.status === 'deferida') {
                            rowStyle = 'background-color:#e8f9ee;';
                            situacaoColor = 'color:#27ae60; font-weight: bold;';
                        } else if (decision && decision.status === 'indeferida') {
                            rowStyle = 'background-color:#fbedeb;';
                            situacaoColor = 'color:#e74c3c; font-weight: bold;';
                        } else {
                            rowStyle = '';
                        }

                        tableRows += `
                            <tr style="${rowStyle}">
                                <td style="padding: 8px; border: 1px solid #ddd; text-align: left; vertical-align: top; font-size: 12px;">${nome}</td>
                                <td style="padding: 8px; border: 1px solid #ddd; text-align: center; vertical-align: top; font-size: 12px; ${situacaoColor}">${situacao}</td>
                                <td style="padding: 8px; border: 1px solid #ddd; text-align: left; vertical-align: top; font-size: 12px; font-weight: bold;">${motivo}</td>
                            </tr>
                        `;
                    });

                    html += `
                        <table style="width:100%; border-collapse: collapse; font-family: 'Poppins', sans-serif;">
                            <thead>
                                <tr style="background-color: #3498db; color: white;">
                                    <th style="padding: 8px; border: 1px solid #2980b9; text-align: center; font-weight: 600; font-size: 12px;">NOME</th>
                                    <th style="padding: 8px; border: 1px solid #2980b9; text-align: center; font-weight: 600; font-size: 12px;">HOMOLOGAÇÃO</th>
                                    <th style="padding: 8px; border: 1px solid #2980b9; text-align: center; font-weight: 600; font-size: 12px;">MOTIVO</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRows}
                            </tbody>
                        </table>
                    `;
                } else {
                    html += renderReportRecursiveHtml(subgroup, keys, level + 1);
                }
            }
        }
        return html;
    }

    function generateWordReport() {
        const groupedData = getGroupedData(processedData);
        const groupingKeys = Array.from(groupingFieldsContainer.querySelectorAll('select')).map(s => s.value).filter(v => v !== "");
        
        const reportContent = renderReportRecursiveHtml(groupedData, groupingKeys);

        const reportHeaderHtml = `
            <div style="font-family: 'Poppins', sans-serif; text-align: center; margin-bottom: 30px;">
                <h1 style="font-size: 24px; font-weight: 700; color: #2c3e50; margin: 0;">Relatório de Homologação</h1>
                <p style="font-size: 14px; color: #7f8c8d; margin: 5px 0 0 0;">Relatório gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
            </div>
        `;

        const header = '<html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
                           'xmlns:w="urn:schemas-microsoft-com:office:word" ' +
                           'xmlns="http://www.w3.org/TR/REC-html40">' +
                           '<head><meta charset="utf-8"><title>Relatório de Homologação</title></head><body>';
        const footer = '</body></html>';
        const htmlContent = header + reportHeaderHtml + reportContent + footer;

        const blob = new Blob([htmlContent], { type: 'application/msword' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Relatorio_Homologacao_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.doc`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        mostrarModal('Relatório Word Gerado com sucesso!','success');
    }

  // Lógica para o botão "Voltar ao Topo"
  const backToTopBtn = document.getElementById("backToTopBtn");
  
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