document.addEventListener('DOMContentLoaded', () => {
    // === CONSTANTES E VARIÁVEIS ===
    const PROCESSED_DATA_KEY = 'processedData';
    const ALL_KEYS_KEY = 'allKeys';
    const CRITERIA_KEY = 'classificationCriteria'; // Armazena [{ name: 'Nome', maxScore: 10.0 }, ...]
    const CLASSIFICATIONS_KEY = 'classifications'; 

    let processedData = [];
    let allKeys = [];
    let criteria = []; // Lista de objetos de critérios
    let totalMaxScore = 0.0;
    // classifications: { [uniqueId]: { scores: { [criterionName]: Number }, totalScore: Number, groupedBy: String } }
    let classifications = {};
    let filteredData = []; 
    let currentGroupingField = '';
    let currentFilterValue = 'ALL'; 
    let currentScoringSubmissionId = null; 

    // === ELEMENTOS DOM ===
    const statusMessage = document.getElementById('statusMessage');
    const totalMaxScoreDisplayCriteria = document.getElementById('totalMaxScoreDisplayCriteria');
    const tableTotalMaxScoreDisplay = document.getElementById('tableTotalMaxScoreDisplay');
    const criteriaContainer = document.getElementById('criteriaContainer'); 
    const newCriterionNameInput = document.getElementById('newCriterionNameInput');
    const newCriterionMaxScoreInput = document.getElementById('newCriterionMaxScoreInput');
    const addCriterionBtn = document.getElementById('addCriterionBtn'); 
    const groupingFieldSelect = document.getElementById('groupingFieldSelect');
    const filterValueSelect = document.getElementById('filterValueSelect'); 
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const submissionsTableBody = document.getElementById('submissionsTableBody');
    const generateClassificationReportBtn = document.getElementById('generateClassificationReportBtn');
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn'); 
    const submissionsCountDisplay = document.getElementById('submissionsCountDisplay');

    
    // Modal Elementos
    const scoringModal = document.getElementById('scoringModal');
    const closeScoringModal = document.getElementById('closeScoringModal');
    const currentSubmissionName = document.getElementById('currentSubmissionName');
    const modalTotalMaxScore = document.getElementById('modalTotalMaxScore');
    const criteriaScoringInputs = document.getElementById('criteriaScoringInputs');
    const modalTotalScore = document.getElementById('modalTotalScore');
    const saveScoresBtn = document.getElementById('saveScoresBtn');

    // === FUNÇÕES DE UTILIDADE ===

    function mostrarModal(mensagem, categoria) {
        const modal = document.getElementById('meuModal');
        const modalContent = modal.querySelector('.modal-content');
        const mensagemModal = document.getElementById('mensagemModal');

        if (mensagemModal) {
            mensagemModal.innerHTML = mensagem;
            modalContent.classList.remove('success', 'error', 'info');
            if (categoria) {
                modalContent.classList.add(categoria);
            }
            modal.style.display = 'block';
        }

        const fecharBtn = modal.querySelector('.fechar');
        fecharBtn.onclick = function () { modal.style.display = 'none'; };
        window.onclick = function (event) {
            if (event.target === modal) { modal.style.display = 'none'; }
        };

        setTimeout(() => { modal.style.display = 'none'; }, 3000);
    }

    function getUniqueId(item) {
        const rawUniqueId = item['CPF:'] || item['E-mail:'] || item['ID:'] || JSON.stringify(item);
        return (rawUniqueId || '').toString().replace(/[\.\-]/g, '');
    }

    // === FUNÇÕES DE ARMAZENAMENTO (LOCAL STORAGE) ===

    function calculateTotalMaxScore() {
        totalMaxScore = criteria.reduce((sum, c) => sum + c.maxScore, 0.0);
        const displayScore = totalMaxScore.toFixed(2).replace('.', ',');
        totalMaxScoreDisplayCriteria.textContent = displayScore;
        tableTotalMaxScoreDisplay.textContent = displayScore;
        modalTotalMaxScore.textContent = displayScore;
        generateClassificationReportBtn.disabled = criteria.length === 0;
    }

    function saveCriteria() {
        localStorage.setItem(CRITERIA_KEY, JSON.stringify(criteria));
        calculateTotalMaxScore();
        renderCriteriaDisplay();
    }

    function loadCriteria() {
        const stored = localStorage.getItem(CRITERIA_KEY);
        criteria = stored ? JSON.parse(stored) : [];
        calculateTotalMaxScore();
        renderCriteriaDisplay()
    }

    function saveClassifications() {
        localStorage.setItem(CLASSIFICATIONS_KEY, JSON.stringify(classifications));
    }

    function loadClassifications() {
        const stored = localStorage.getItem(CLASSIFICATIONS_KEY);
        classifications = stored ? JSON.parse(stored) : {};
    }

    function loadData() {
        const dataStored = localStorage.getItem(PROCESSED_DATA_KEY);
        const keysStored = localStorage.getItem(ALL_KEYS_KEY);

        console.log('Dados carregados do Local Storage:', { dataStored, keysStored });
        console.log('Chaves disponíveis para agrupamento:', keysStored ? JSON.parse(keysStored) : []);

        if (dataStored && keysStored) {
            const parsedData = JSON.parse(dataStored);
            allKeys = JSON.parse(keysStored);
            loadCriteria(); 
            loadClassifications();

            console.log('Dados processados após parsing:', parsedData);

             // Aqui está o ajuste:
            processedData = Array.isArray(parsedData.data) ? parsedData.data : [];
            console.log('Dados processados após parsing:', processedData);
            
            if (processedData.length > 0) {
                // Array apenas com os nomes
                const nomes = processedData.map(item => item['Nome:']).filter(nome => !!nome);


                // Se quiser ver no console:
                console.log('Nomes encontrados:', nomes);

                filteredData = processedData.map(item => ({
                    ...item,
                    uniqueId: getUniqueId(item)
                }));
                statusMessage.classList.add('hidden');
                initializeGroupingFields();
            } else {
                statusMessage.textContent = 'Dados carregados, mas a lista está vazia. Processar a planilha novamente.';
                statusMessage.classList.remove('hidden');
            }
        } else {
            statusMessage.textContent = 'Nenhum dado de planilha encontrado no Local Storage. Por favor, processe a planilha na página inicial.';
            statusMessage.classList.remove('hidden');
            generateClassificationReportBtn.disabled = true;
        }
    }

    // === FUNÇÕES DE RENDERIZAÇÃO DA INTERFACE ===

    function renderCriteriaDisplay() {
        criteriaContainer.innerHTML = '';
        
        criteria.forEach(c => {
            const displayMaxScore = c.maxScore.toFixed(2).replace('.', ',');
            
            const chip = document.createElement('span');
            chip.className = 'criteria-chip';
            chip.innerHTML = `
                <span class="font-bold">${c.name}</span> 
                <span class="text-xs ml-2">(Max: ${displayMaxScore})</span>
                <button class="remove-criterion-btn" data-name="${c.name}">&times;</button>
            `;
            chip.querySelector('.remove-criterion-btn').addEventListener('click', removeCriterion);
            criteriaContainer.appendChild(chip);
        });
    }

    function initializeGroupingFields() {
        groupingFieldSelect.innerHTML = '<option value="">Nenhum Agrupamento</option>';
        allKeys.forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = key.replace(/:$/, '');
            groupingFieldSelect.appendChild(option);
        });
        updateFilterValueSelect(); 
    }

    function updateFilterValueSelect() {
        filterValueSelect.innerHTML = '<option value="ALL">Mostrar Todas (Sem Filtro)</option>';
        filterValueSelect.disabled = !currentGroupingField;
        
        if (currentGroupingField) {
            const uniqueValues = new Set();
            filteredData.forEach(item => {
                const value = item[currentGroupingField];
                if (value) {
                    uniqueValues.add(value);
                }
            });

            const sortedValues = Array.from(uniqueValues).sort();

            sortedValues.forEach(value => {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = value;
                filterValueSelect.appendChild(option);
            });
        }
        
        filterValueSelect.value = currentFilterValue;
        renderSubmissions();
    }

    function renderSubmissions() {
        submissionsTableBody.innerHTML = '';
        let dataToRender = [...filteredData];
        
        // 1. Filtragem por Agrupamento (Separação)
        if (currentGroupingField && currentFilterValue !== 'ALL') {
             dataToRender = dataToRender.filter(item => 
             item[currentGroupingField] !== undefined && 
             item[currentGroupingField] !== null &&
             item[currentGroupingField].toString().trim() === currentFilterValue.toString().trim()
         );
        }

        const submissionCount = dataToRender.length;
        submissionsCountDisplay.textContent = submissionCount;
    
        // Desabilita o botão de exclusão se não houver dados (opcional, mas bom)
        deleteSelectedBtn.disabled = submissionCount === 0; 
        
        
        // 2. Ordenação: por score total (decrescente)
        dataToRender.sort((a, b) => {
            const scoreA = classifications[a.uniqueId]?.totalScore ?? -1;
            const scoreB = classifications[b.uniqueId]?.totalScore ?? -1;
            return scoreB - scoreA;
        });

        dataToRender.forEach(item => {
            const uniqueId = item.uniqueId;
            const classificationObj = classifications[uniqueId] || { totalScore: null };
            
            const totalScore = classificationObj.totalScore !== null ? classificationObj.totalScore.toFixed(2).replace('.', ',') : '—';
            
            const groupedByValue = item[currentGroupingField] || 'N/A';
            const name = item['Nome:'] || item['E-mail:'] || uniqueId;
            const originalIndex = processedData.findIndex(p => getUniqueId(p) === uniqueId) + 1;

            const row = document.createElement('tr');
            
            let scoreClass = 'text-gray-500 font-medium';
            if (classificationObj.totalScore !== null) {
                const percentage = totalMaxScore > 0 ? classificationObj.totalScore / totalMaxScore : 0;
                if (percentage >= 0.75) { 
                    scoreClass = 'text-green-600 font-semibold';
                } else if (percentage < 0.5) { 
                    scoreClass = 'text-red-600 font-semibold';
                } else {
                    scoreClass = 'text-yellow-600 font-semibold';
                }
            }

            row.innerHTML = `
                <td class="px-3 py-4 whitespace-nowrap">
                    <input type="checkbox" class="submission-checkbox rounded text-indigo-600" data-id="${uniqueId}">
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span class="font-bold">${name}</span> <span class="text-xs text-gray-500">(#${originalIndex})</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${groupedByValue}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm ${scoreClass} font-bold">
                    ${totalScore} / ${totalMaxScore.toFixed(2).replace('.', ',')}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex space-x-2">
                    <button class="score-criteria-btn bg-indigo-500 hover:bg-indigo-600 text-white py-1 px-3 rounded text-sm" data-id="${uniqueId}">
                        <i class="fas fa-edit"></i> Pontuar Critérios
                    </button>
                    <button class="delete-submission-btn bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded text-sm" data-id="${uniqueId}">
                        <i class="fas fa-trash"></i> Excluir
                    </button>
                </td>
            `;

            const scoreCriteriaBtn = row.querySelector('.score-criteria-btn');
            scoreCriteriaBtn.addEventListener('click', () => openScoringModal(uniqueId));

            // NOVO EVENT LISTENER PARA EXCLUSÃO INDIVIDUAL
            const deleteSubmissionBtn = row.querySelector('.delete-submission-btn');
            deleteSubmissionBtn.addEventListener('click', () => {
                if (confirm(`Tem certeza que deseja excluir permanentemente a inscrição de ${name}?`)) {
                    deleteSubmissions([uniqueId]);
                }
            });

            submissionsTableBody.appendChild(row);
        });

        document.querySelectorAll('.submission-checkbox').forEach(cb => {
            cb.addEventListener('change', updateSelectAllCheckbox);
        });
        selectAllCheckbox.checked = false;
    }

    function updateSelectAllCheckbox() {
    const allCheckboxes = document.querySelectorAll('.submission-checkbox');
    const checkedCheckboxes = document.querySelectorAll('.submission-checkbox:checked');
    const hasSelections = checkedCheckboxes.length > 0;
    
    // Controla o checkbox "Selecionar Todos"
    selectAllCheckbox.checked = checkedCheckboxes.length === allCheckboxes.length && allCheckboxes.length > 0;
    
    // Controla o botão "Excluir Selecionados"
    if (hasSelections) {
            deleteSelectedBtn.classList.remove('bg-gray-400', 'cursor-not-allowed');
            deleteSelectedBtn.classList.add('bg-red-500', 'hover:bg-red-600');
            deleteSelectedBtn.disabled = false;
        }
        else{
            deleteSelectedBtn.disabled = true;
            deleteSelectedBtn.classList.remove('bg-red-500', 'hover:bg-red-600');
            deleteSelectedBtn.classList.add('bg-gray-400', 'cursor-not-allowed');
        }


    }
    
    // === LÓGICA DO MODAL DE PONTUAÇÃO ===

    function openScoringModal(uniqueId) {
        currentScoringSubmissionId = uniqueId;
        const item = filteredData.find(d => d.uniqueId === uniqueId);
        const currentClassification = classifications[uniqueId] || { scores: {}, totalScore: 0.0 };
        
        currentSubmissionName.textContent = item['Nome:'] || item['E-mail:'] || uniqueId.substring(0, 15) + '...';
        criteriaScoringInputs.innerHTML = '';
        
        let currentTotalScore = 0.0;

        if (criteria.length === 0) {
             criteriaScoringInputs.innerHTML = '<p class="text-red-500 font-bold">Defina critérios na Seção 1 para começar a pontuar!</p>';
             saveScoresBtn.disabled = true;
             modalTotalScore.textContent = '0.0';
             scoringModal.classList.add('active');
             scoringModal.style.display = 'flex';
             return;
        }

        criteria.forEach(c => {
            const currentScore = currentClassification.scores[c.name] ?? null;
            
            const inputId = `score-input-${c.name.replace(/\s/g, '-')}`;
            const displayMaxScore = c.maxScore.toFixed(2).replace('.', ',');
            const displayCurrentScore = currentScore !== null ? currentScore : '';

            const div = document.createElement('div');
            div.className = 'flex items-center justify-between p-3 border rounded bg-gray-50';
            div.innerHTML = `
                <label for="${inputId}" class="font-medium text-gray-700">${c.name} (Max: ${displayMaxScore}):</label>
                <input type="number" step="0.1" min="0" max="${c.maxScore}" 
                       value="${displayCurrentScore}"
                       id="${inputId}"
                       data-criterion-name="${c.name}"
                       data-max-score="${c.maxScore}"
                       class="criterion-score-input w-24 p-2 border rounded text-center">
            `;
            criteriaScoringInputs.appendChild(div);

            if (currentScore !== null) {
                currentTotalScore += currentScore;
            }
        });

        modalTotalScore.textContent = currentTotalScore.toFixed(2).replace('.', ',');
        saveScoresBtn.disabled = false;
        
        // Adiciona listener de input para atualizar a nota total em tempo real
        document.querySelectorAll('.criterion-score-input').forEach(input => {
            input.addEventListener('input', updateModalTotalScore);
        });

        scoringModal.classList.add('active');
        scoringModal.style.display = 'flex';
    }

    function updateModalTotalScore() {
        let newTotalScore = 0.0;
        let isValid = true;

        document.querySelectorAll('.criterion-score-input').forEach(input => {
            const score = parseFloat(input.value.replace(',', '.'));
            const max = parseFloat(input.dataset.maxScore);

            if (!isNaN(score)) {
                if (score < 0 || score > max) {
                    input.classList.add('border-red-500');
                    isValid = false;
                } else {
                    input.classList.remove('border-red-500');
                    newTotalScore += score;
                }
            } else if (input.value.trim() !== '') {
                 // Tratar entradas não numéricas como erro
                 input.classList.add('border-red-500');
                 isValid = false;
            } else {
                 input.classList.remove('border-red-500');
            }
        });

        modalTotalScore.textContent = newTotalScore.toFixed(2).replace('.', ',');
        saveScoresBtn.disabled = !isValid;
    }

    function closeScoringModalHandler() {
        scoringModal.classList.remove('active');
        scoringModal.style.display = 'none';
        currentScoringSubmissionId = null;
    }

    function saveCriteriaScores() {
        if (!currentScoringSubmissionId || saveScoresBtn.disabled) return;
        
        const uniqueId = currentScoringSubmissionId;
        const newScores = {};
        let newTotalScore = 0.0;
        let isScored = false;

        document.querySelectorAll('.criterion-score-input').forEach(input => {
            const criterionName = input.dataset.criterionName;
            const score = parseFloat(input.value.replace(',', '.'));

            if (!isNaN(score) && input.value.trim() !== '') {
                newScores[criterionName] = score;
                newTotalScore += score;
                isScored = true;
            }
        });

        if (isScored) {
            const item = filteredData.find(d => d.uniqueId === uniqueId);
            classifications[uniqueId] = {
                scores: newScores,
                totalScore: newTotalScore,
                groupedBy: currentGroupingField ? item[currentGroupingField] : 'N/A'
            };
            mostrarModal(`Pontuação total de ${newTotalScore.toFixed(2).replace('.', ',')} salva.`, 'success');
        } else {
            delete classifications[uniqueId];
            mostrarModal('Pontuações removidas para esta inscrição.', 'info');
        }

        saveClassifications();
        renderSubmissions();
        closeScoringModalHandler();
    }
    
    // === FUNÇÕES DE AÇÃO E EVENT HANDLERS ===

    function getSelectedSubmissionIds() {
    const selectedIds = [];
    document.querySelectorAll('.submission-checkbox:checked').forEach(checkbox => {
        const id = checkbox.dataset.id;
        if (id) {
            selectedIds.push(id);
        }
    });
    return selectedIds;
    }

    function deleteSubmissions(uniqueIds) {
    if (!Array.isArray(uniqueIds) || uniqueIds.length === 0) {
        return;
    }

    let deletedCount = 0;

    uniqueIds.forEach(id => {
        const initialLength = processedData.length;
        
        // 1. Remover do processedData (dados originais)
        processedData = processedData.filter(item => getUniqueId(item) !== id);

        // 2. Remover do filteredData (dados atualmente em exibição/filtro)
        filteredData = filteredData.filter(item => item.uniqueId !== id);

        // 3. Remover do classifications (pontuações)
        if (classifications[id]) {
            delete classifications[id];
        }

        // Verifica se a exclusão ocorreu
        if (processedData.length < initialLength) {
            deletedCount++;
        }
    });

    if (deletedCount > 0) {
        // Salva as alterações no Local Storage
        localStorage.setItem(PROCESSED_DATA_KEY, JSON.stringify({ data: processedData }));
        saveClassifications();

        // Atualiza a interface
        renderSubmissions();
        updateFilterValueSelect(); // Se a exclusão mudar as opções de filtro/agrupamento

        mostrarModal(`${deletedCount} inscrição(ões) excluída(s) permanentemente.`, 'info');
    } else {
        mostrarModal("Nenhuma inscrição válida foi encontrada para exclusão.", "error");
    }
    }

    function handleDeleteSelectedSubmissions() {
    const selectedIds = getSelectedSubmissionIds();
    
    if (selectedIds.length === 0) {
        mostrarModal("Selecione uma ou mais inscrições para excluir.", "error");
        return;
    }

    const confirmMessage = selectedIds.length === 1 
        ? "Tem certeza que deseja excluir esta inscrição permanentemente?" 
        : `Tem certeza que deseja excluir as ${selectedIds.length} inscrições selecionadas permanentemente?`;

    // Confirmação simples com o browser antes da exclusão
    if (confirm(confirmMessage)) {
        deleteSubmissions(selectedIds);
        // Desmarca o checkbox "Selecionar Todos" após a ação
        selectAllCheckbox.checked = false;
    }
    }

    function addCriterion() {
    const namesRaw = newCriterionNameInput.value.trim();
    const maxRaw = newCriterionMaxScoreInput.value.replace(',', '.').trim();
    const defaultMax = parseFloat(maxRaw);

    if (!namesRaw) {
        mostrarModal('Informe pelo menos um nome de critério.', 'error');
        return;
    }

    // Se defaultMax inválido, consideramos null e exigimos max por linha
    const defaultMaxValid = !isNaN(defaultMax) && defaultMax > 0;

    // Suporta separação por nova linha ou ponto e vírgula
    const lines = namesRaw.split(/\r?\n|;/).map(l => l.trim()).filter(Boolean);

    const added = [];
    const skipped = [];
    const duplicates = [];

    lines.forEach(line => {
        // Permite "Nome|max" ou "Nome: max"
        let parts = line.split('|');
        if (parts.length === 1) {
            parts = line.split(':');
        }
        let name = parts[0].trim();
        let maxScore = defaultMaxValid ? defaultMax : null;

        if (parts.length > 1) {
            const p = parts[1].trim().replace(',', '.');
            const parsed = parseFloat(p);
            if (!isNaN(parsed) && parsed > 0) {
                maxScore = parsed;
            }
        }

        if (!name) {
            skipped.push(line);
            return;
        }

        if (maxScore === null || isNaN(maxScore) || maxScore <= 0) {
            skipped.push(line);
            return;
        }

        if (criteria.some(c => c.name === name)) {
            duplicates.push(name);
            return;
        }

        criteria.push({ name: name, maxScore: maxScore });
        added.push(name);
    });

    if (added.length === 0) {
        mostrarModal('Nenhum critério válido foi adicionado. Verifique nomes e notas máximas.', 'error');
        return;
    }

    newCriterionNameInput.value = '';
    newCriterionMaxScoreInput.value = '';

    saveCriteria();

    let msg = `${added.length} critério(s) adicionados: ${added.join(', ')}`;
    if (duplicates.length) msg += `. Duplicados ignorados: ${duplicates.join(', ')}`;
    if (skipped.length) msg += `. Linhas inválidas: ${skipped.join(' / ')}`;

    mostrarModal(msg, 'success');
    }



    function removeCriterion(event) {
        const nameToRemove = event.target.dataset.name;
        if (nameToRemove) {
            criteria = criteria.filter(c => c.name !== nameToRemove);
            saveCriteria();
            
            Object.keys(classifications).forEach(uniqueId => {
                if (classifications[uniqueId].scores[nameToRemove] !== undefined) {
                    delete classifications[uniqueId].scores[nameToRemove];
                    
                    let newTotal = Object.values(classifications[uniqueId].scores).reduce((sum, score) => sum + score, 0.0);
                    classifications[uniqueId].totalScore = newTotal;

                    if (newTotal === 0.0 && Object.keys(classifications[uniqueId].scores).length === 0) {
                        delete classifications[uniqueId];
                    }
                }
            });

            saveClassifications();
            renderSubmissions();
            mostrarModal(`Critério "${nameToRemove}" removido. Pontuações atualizadas.`, 'success');
        }
    }

    function handleGroupingChange(e) {
        currentGroupingField = e.target.value;
        currentFilterValue = 'ALL'; 
        updateFilterValueSelect();
    }
    
    function handleFilterValueChange(e) {
        currentFilterValue = e.target.value;
        renderSubmissions(); 
    }

    function toggleSelectAll() {
        const isChecked = selectAllCheckbox.checked;

        if (isChecked) {
            deleteSelectedBtn.classList.remove('bg-gray-400', 'cursor-not-allowed');
            deleteSelectedBtn.classList.add('bg-red-500', 'hover:bg-red-600');
            deleteSelectedBtn.disabled = false;
        }
        else{
            deleteSelectedBtn.disabled = true;
            deleteSelectedBtn.classList.remove('bg-red-500', 'hover:bg-red-600');
            deleteSelectedBtn.classList.add('bg-gray-400', 'cursor-not-allowed');
        }

        document.querySelectorAll('.submission-checkbox').forEach(cb => {
            cb.checked = isChecked;
        });
    }


    // Data formatada
    const hoje = new Date();
    const dataFormatada = hoje.toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });


    // === FUNÇÃO DE RELATÓRIO WORD ===
    function generateClassificationReport() {
        const classifiedIds = Object.keys(classifications);
        const anoAtual = hoje.getFullYear();
        const editalNumero = document.getElementById('editalNumero').value || 'XX';
        const processoSeletivo = document.getElementById('processoSeletivo').value || 'XXXXXXXXXXXX';
        const processoMaiusculo = (processoSeletivo || 'xxxxxxxxxxxxxx').toUpperCase();



        if (classifiedIds.length === 0) {
            mostrarModal("Nenhuma inscrição foi pontuada ainda.", "error");
            return;
        }
        
        let reportContent = '';
        const now = new Date();
        const dataFormatada = now.toLocaleDateString("pt-BR", { year: 'numeric', month: 'long', day: 'numeric' });
        
        // 1. Agrupar dados pelo campo de separação
        const groupedByField = {};
        
        const classifiedData = filteredData.map(item => {
            const classificationObj = classifications[item.uniqueId];
            if (classificationObj) {
                return {
                    ...item,
                    ...classificationObj
                };
            }
            return null;
        }).filter(item => item !== null);
        
        classifiedData.forEach(item => {
            const fieldValue = currentGroupingField ? item[currentGroupingField] || 'Não informado!' : 'Todos';
            
            if (!groupedByField[fieldValue]) {
                groupedByField[fieldValue] = [];
            }
            groupedByField[fieldValue].push(item);
        });

        // 2. Iterar sobre os Grupos de Separação
        const sortedFieldValues = Object.keys(groupedByField).sort();

        sortedFieldValues.forEach(fieldValue => {
            let groupSubmissions = groupedByField[fieldValue];
            
            // Ordena os submissions dentro do grupo por Score Total (decrescente)
            groupSubmissions.sort((a, b) => b.totalScore - a.totalScore);
            
            reportContent += `
                <h2 style="font-size: 16pt; font-weight: bold; margin-top: 20pt; text-align: center; color: #2c3e50;">
                    ${currentGroupingField ? `${currentGroupingField.replace(/:$/, '')} - ${fieldValue}` : ''}
                </h2>
                <hr style="border: 0; height: 1px; background-color: #e0e0e0; margin-bottom: 15px;">
            `;
            
            // 3. Tabela de Detalhe por Critério para o Grupo
            reportContent += `
                <table style="width:100%; border-collapse: collapse; font-family: 'Poppins', sans-serif;">
                    <thead>
                        <tr style="background-color: #3498db; color: white;">
                            <th style="padding: 8px; border: 1px solid #2980b9; text-align: center; font-weight: 600; font-size: 10px;">Classificação</th>
                            <th style="padding: 8px; border: 1px solid #2980b9; text-align: center; font-weight: 600; font-size: 10px;">Nome</th>
                            ${criteria.map(c => 
                                `<th style="padding: 8px; border: 1px solid #2980b9; text-align: center; font-weight: 600; font-size: 10px;">${c.name} (Max: ${c.maxScore.toFixed(1).replace('.', ',')})</th>`
                            ).join('')}
                            <th style="padding: 8px; border: 1px solid #2980b9; text-align: center; font-weight: 600; font-size: 10px;">Total</th>
                            <th style="padding: 8px; border: 1px solid #2980b9; text-align: center; font-weight: 600; font-size: 10px;">Resultado</th>
                            <th style="padding: 8px; border: 1px solid #2980b9; text-align: center; font-weight: 600; font-size: 10px;">**</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${groupSubmissions.map((item, index) => {
                            const name = (item['Nome Social:'] && item['Nome Social:'].trim() !== '') ? item['Nome Social:'].toUpperCase() : (item['Nome:'] || '').toUpperCase();
                            const totalScoreDisplay = item.totalScore.toFixed(2).replace('.', ',');
                            
                            const criteriaScores = criteria.map(c => {
                                const score = item.scores[c.name];
                                const scoreDisplay = score !== undefined ? score.toFixed(2).replace('.', ',') : '—';
                                return `<td style="padding: 8px; border: 1px solid #2980b9; text-align: center; font-weight: 600; font-size: 10px;">${scoreDisplay}</td>`;
                            }).join('');
                            
                            return `
                                <tr>
                                    <td style="padding: 8px; border: 1px solid #2980b9; text-align: center; font-weight: 600; font-size: 10px;">${index + 1}</td>
                                    <td style="padding: 8px; border: 1px solid #2980b9; text-align: center; font-weight: 600; font-size: 10px;">${name}</td>
                                    ${criteriaScores}
                                    <td style="padding: 8px; border: 1px solid #2980b9; text-align: center; font-weight: 600; font-size: 10px;">${totalScoreDisplay}</td>
                                    <td style="padding: 8px; border: 1px solid #2980b9; text-align: center; font-weight: 600; font-size: 10px;">-</td>
                                    <td style="padding: 8px; border: 1px solid #2980b9; text-align: center; font-weight: 600; font-size: 10px;">-</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
        });
        
        const reportHeaderHtml = `
            <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
                <tr>
                <td style="width:33%; text-align:center;">
                <img src="data:image/png;base64,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"/>" style="height:60px;">
                </td>
                <td style="width:33%; text-align:center;">
                <img src="data:image/png;base64,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" style="height: 60px;" />
                </td>
                <td style="width:33%; text-align:center;">
                <img src="data:image/png;base64,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g8/bJ0yirKnNfvGDHTt28Iu33377+uuvv/zyy6+//vpbb73Vx+gCAAdAC4VCoVDg0h3P83p6eqDEHK7rcl1oJpPhOjat9c0337xp06a+vj4OTfLHuY1Jf38/J7E4CZBOp9mS4OZXAGDbdjKZJK0lkgHk5HMhw+jt6qyIR1cuXxaNhNKp1MMPP7xs2bLOrk5A6XoaUApDghD9qT6QsHNXS76YQwka1J9feenRR//HdW2BlM2kgBRpzzREKtknBVimdOyCZUrHKfb3954880TlOQKBlKcK+QCgdD1RsOPCVJnsJ9bj+f83ikQivEFHjBjR3d393HPPXXDBBfl8/rOf/azjONu2bevv78/n88lksr29PRaLtbS0MBAkFotxzqyurm779u1Syp07d0opGxoaNmzYwNlLwzB27969ZcsWpRSXcriuywWrQohwOPzyyy//9Kc/jUajdXV13DVLStnW1hYIBAzD6O/v587inuftaWs3hHSdYjaTad3ZXF1ZVVNVnUwmTz311BtuuOHcc8+tr6/fvn07Z14KhUKhWAgGg+9vfH/06NEgsL29XUrZ2dm5Y8cOROR4uWma3JIlFotx+jocDufz+Ugkkslk+PgnrbVTtINWgDxP2U7YChgAdRVV/7RnfxMRR7W5wuywww5LpVLXX3+9EOLLX/4yAHzwwQe//e1vv/Od7wQCgUceecRxnLlz5959993JZLKyshIRL7300lGjRiWTyTvuuKOuru7kk08+7rjjWltbX3311QkTJkybNu2EE07g9ildXV2pVGr16tWjRo362te+9vTTT//4xz/mrMq8efMymcz69ev7+vquvfZarfVTTz3V1NTU19f37LPPXn755dwZ7b777isWi++++y4fCZbJZIYNG3bcccch4u9///uLLrroxhtv/MpXvvLQQw9lMplLL730pJNO2rFjxwsvvLB69eobb7yRsW35fP6ZZ555+OGHhw8f/r3vfS8ej1dVVaVSqUQi0dXV9dxzz+3Zs2fFihXLly9n5+DXv/51V1fXjBkzTj/99GAwuH379tGjR//TSgjHccLhMFdGCCHGjRtXXV29YsWKo446KpfLcUXhk08+yYj+NWvW/PKXv0wmkw888MDq1atHjBixePHiRx55JBwOz5gxI5PJCCEuvvjinp6eZcuW/fCHP/zVr3718ssvP/XUUwBgmuYXvvCFxx9/PJlM/uEPf3j66aebmpo6OzsnT548ZcqUaDR60UUXPf30062trUcccURLS8u4cePOOOOMp556asyYMWeeeeb27dtff/31J554ghkIADZu3HjXXXd9+OGH48aNe+KJJ6SUu3btevHFF8844wyl1MqVK//whz+k0+kLLriAS83a2tq2bdv24IMPImJzc/O3v/3tWbNmnXvuuW+++abWeuTIkT09Pf/93//9+OOPd3Z2jhw5cuzYsYFAYMKECcuWLQuHw0899dTvfvc7wzBGjBiRTqf/aSWED+Pj3eB53tlnn7127drq6uoTTjjh3nvvPf7443t6etra2qZNm7Z58+bW1lYu95s3b9511123du3a/v7+LVu2ZLPZq6++urq6mmetWCyOHj36scceq6mpueWWW3bv3j1mzJipU6c+++yzgUDghBNO6OjomDdv3gUXXDBr1qyRI0d6nldRUXH77bcPHz585cqVTz75pJTyc5/73COPPGLb9ksvvcQg4bq6uptvvnn9+vXt7e1chnrdddd9/etfP+aYY+68884xY8Zs3rz59ttv/+Y3v/mtb32rrq5uzZo169evf+WVVzhH397eXldXV1lZee2113LA4/7771+7di2fjJfP53fv3n3++ed/+ctf7u/vv/LKK1esWJFKpc4777y5c+feeuutO3bs6OnpSSQS8Xj8n1ZCcBFVsVjkeuV4PH733Xffdtttr7/++pYtW84666zVq1fX1tYKIeLx+NSpU8eMGcOoH65PaWhoGDly5Kuvvrp79+5rr7122rRpHFyaNm1aY2NjTU1NZ2fn2LFjJ0yYkM/nOzs7s9lsJpNpamo66aSTPvjgAw5/TZw4UQixbdu2L3/5y8cee+z777/PrRASiQT789XV1YVCgbFnwWCwv79/06ZNXAz30EMPRSKR888/P5PJ1NXVjR07NhqN7tmzp729nYieeuopKWVVVRWWzqfs6+vr7OysrKycN2/epEmTNm/e/PDDD9fW1tbU1DQ1NTmOU1VVFQ6HuW9mIpHo6+v70Y9+NHPmzIULF44ZM6a6ujqfz/f19f3TMgSDdDgXb9s2n/1kmuaIESMWLFhw+umnc/UAg0Y3b97sN9jOZDKbNm1Kp9OcuzdN8/777+/v71+zZo0QYs2aNZlMpqOjI5FIvPfee6yhETEajcbj8T179ixduvSE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1dUvvvjili1bRo4cyWvA53Byo0824jg39tZbb/3hD3+oq6u74oorGGzMqAt/DLZtcwloOp3u7Oz805/+NHnyZG4rmU6nq6qqWMgzEHzs2LGLFi2aO3cuAHAn0Icffvikk046/PDD29raVq5cOWrUKMMw1q9fn81muex24sSJ48aNe/bZZ2tqakKhkNZ62rRpPAmZTGbdunVbtmy59NJLa2truaenbdufplHZ19c3bdq0SZMmnXDCCTNnzvz5z3/um2y5XO7EE0888cQTOe/wN39FoVBYsGBBfX19ZWXlXXfd1d7ezsaa53m2bftN08ptOuaGZDLJxc1ENGbMmFmzZp1yyimTJ08eNWrUe++9t2HDhquvvppH29HRQUS2bbe1teXz+WuvvZbtxEwmM27cuFgsdvjhh7/88su+t8Jqhb83lUqxz9nf379hw4ZLLrmE/8QeCns6XHS/fft2PmLi7rvvbm1t5TEbhnHjjTdyl1nDML73ve/dc889kyZNAgAuyTz22GPfeOMN/wT64cOH33nnnZs3byaiyZMnV1dXjx49mk9M4m+hQ+Ah/h9QOp1Op9Nvvvnma6+9tnTp0u985zuFQuHnP//5xIkTp02b9t577zU1NX344Yfjx49ft26dUurb3/728ccfn8/nX3/99XHjxs2dO7elpWX9+vVHH310RUXF8ccfv3nz5mw2u2vXrjlz5hxxxBGvvPKKYRi/+tWvuG1Ua2sr9zI444wzJk6ceMUVV2zcuJGLDXO53OLFiydPnjx9+vTDDjuspaWFM4RCiO3bt0ej0RdeeOGVV17h2HOhUODt297e/vLLL0+ZMmXatGmPP/74L37xi5EjR77yyisNDQ2vvvrqkiVLstns6NGje3p6Dj/8cEScNm3ab37zm9mzZ9fX169bt46PIznrrLOOOuqo5cuXA0BfX59lWQ888MBnP/vZk0466fvf/z4vpGmajY2Nzc3NbG6zKbNnzx5u1M2GglIqm82OGDHigw8+mD179urVq5ctW/b22283NDTk8/lHH3301VdfbWtru/feew8//PA1a9Y0NzfX1tam0+nnn3++tbWVFZ/rup8aQ7D7kEgkbrvttq1btz7zzDOLFy92HOeBBx6YO3fuL3/5y/Hjx3d3d3NFDeNNtm/fnsvldu7cOX/+/P/zf/7P5ZdfzpncSy655C9/+YtSiluv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" style="height: 60px;" />
                </td>
                </tr>
            </table>
            
            <div style="font-family: 'Poppins', sans-serif; text-align: center; margin-bottom: 10px;">
                <P style="font-size: 16px; font-weight: 700; color: #2c3e50;">UNIVERSIDADE FEDERAL DA BAHIA<br>SUPERINTENDÊNCIA DE EDUCAÇÃO A DISTÂNCIA</p>
                <h2 style="font-size: 16px; font-weight: 500; color: #2c3e50;">EDITAL Nº ${editalNumero}/${anoAtual}<br><br>PROCESSO SELETIVO PARA ${processoMaiusculo}</h2>
                <h3 style="font-size: 16px; font-weight: 700; color: #2c3e50;">Resultado Preliminar</h3>    
            </div>
                <p style="font-size: 16px; color: #2c3e50; text-align:justify;">A Comissão de Seleção torna público o Resultado Preliminar do Processo Seletivo Simplificado para ${processoSeletivo} da SEAD/UFBA, estabelecido no âmbito do Sistema Universidade Aberta do Brasil.</p>
                <p style="font-size: 16px; color: #2c3e50; text-align:justify;">** AC – Ampla Concorrência   PCD – Pessoa Com Deficiência   PPP – Pessoa Preta ou Parda** AC – Ampla Concorrência   PCD – Pessoa Com Deficiência   PPP – Pessoa Preta ou Parda.</p>
        `;

        const header = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório de Classificação</title></head><body>';

        const reportSignature = `<p style="text-align:right; font-weight: 700; margin-top:40px;">Salvador, ${dataFormatada}</p>
        <br><br><br>
        <p style="text-align:center; font-weight: 700;">__________________________________<br>Presidente da Comissão</p>`;
        
        const footer = '</body></html>';
        const conteudoHTML = header + reportHeaderHtml + reportContent + reportSignature + footer;

        const blob = window.htmlDocx.asBlob(conteudoHTML, { orientation: "landscape" }); // Usar orientação paisagem para melhor visualização das colunas de critérios

        saveAs(
            blob,
            `Relatorio_Classificacao_Criterios_${now.toLocaleDateString("pt-BR").replace(/\//g, "-")}.docx`
        );

        mostrarModal("Relatório Word gerado com sucesso!", "success");
    }

    // === INICIALIZAÇÃO E LISTENERS ===
    addCriterionBtn.addEventListener('click', addCriterion);
    groupingFieldSelect.addEventListener('change', handleGroupingChange);
    filterValueSelect.addEventListener('change', handleFilterValueChange);
    selectAllCheckbox.addEventListener('change', toggleSelectAll);
    generateClassificationReportBtn.addEventListener('click', generateClassificationReport);
    deleteSelectedBtn.addEventListener('click', handleDeleteSelectedSubmissions);
    
    // Listeners do Modal
    closeScoringModal.addEventListener('click', closeScoringModalHandler);
    saveScoresBtn.addEventListener('click', saveCriteriaScores);
    scoringModal.addEventListener('click', (e) => {
        if (e.target === scoringModal) {
            closeScoringModalHandler();
        }
    });

    loadData();
});