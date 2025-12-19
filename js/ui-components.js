// js/ui-components.js - Componentes de interface do usuário
import { db } from './db.js';
import { auth } from './auth.js';
import { showLoading, hideLoading, showToast, showConfirm } from './utils.js';

const ui = {
  // Inicializar componentes UI
  init() {
    this.initModals();
    this.initNotifications();
    this.initSkeletonLoading();
  },
  
  // ========== TELAS ==========
  
  // Tela de boas-vindas
  async renderWelcomeScreen() {
    return `
      <section class="tela ativa">
        <div class="welcome-content">
          <img src="logo.jpg" class="avatar" alt="Avatar AC" loading="lazy" />
          <div class="welcome-text">
            <h2><i class="fas fa-bus"></i> Bem-vindo ao Portal de Transporte</h2>
            <p>Rotas, registro de entrada/saída e avisos oficiais da <strong>AC Parceria e Terraplenagem</strong>.</p>
            <div class="alert-card">
              <div class="alert-icon">
                <i class="fas fa-clock"></i>
              </div>
              <div class="alert-content">
                <strong>Importante:</strong> O formulário de controle de veículo deve ser preenchido <strong>2× ao dia</strong> — ao iniciar a jornada (entrada) e ao finalizar (saída).
              </div>
            </div>
            <button class="btn btn-primary btn-large" onclick="app.entrarNoPortal()">
              <i class="fas fa-sign-in-alt"></i> Entrar no Portal
            </button>
          </div>
        </div>
      </section>
    `;
  },
  
  // Tela de escolha de perfil
  renderPerfilScreen() {
    return `
      <section class="tela">
        <div class="section-header">
          <h2><i class="fas fa-user-circle"></i> Como você está acessando?</h2>
          <p>Selecione seu perfil para continuar</p>
        </div>
        
        <div class="cards-grid">
          <div class="profile-card" onclick="app.selecionarPerfil('motorista')">
            <div class="card-icon motorista">
              <i class="fas fa-bus"></i>
            </div>
            <h3>Motorista</h3>
            <p>Acesso para condução e compartilhamento de rota em tempo real</p>
            <div class="card-features">
              <span><i class="fas fa-map-marker-alt"></i> GPS</span>
              <span><i class="fas fa-route"></i> Rotas</span>
              <span><i class="fas fa-bell"></i> Notificações</span>
            </div>
          </div>
          
          <div class="profile-card" onclick="app.selecionarPerfil('passageiro')">
            <div class="card-icon passageiro">
              <i class="fas fa-users"></i>
            </div>
            <h3>Passageiro</h3>
            <p>Acompanhe a rota e a localização do ônibus em tempo real</p>
            <div class="card-features">
              <span><i class="fas fa-map"></i> Mapa</span>
              <span><i class="fas fa-clock"></i> Tempo Real</span>
              <span><i class="fas fa-info-circle"></i> Informações</span>
            </div>
          </div>
          
          <div class="profile-card" onclick="app.selecionarPerfil('admin')">
            <div class="card-icon admin">
              <i class="fas fa-cogs"></i>
            </div>
            <h3>Administrador</h3>
            <p>Gestão, avisos, monitoramento e controle do sistema</p>
            <div class="card-features">
              <span><i class="fas fa-chart-line"></i> Dashboard</span>
              <span><i class="fas fa-bell"></i> Notificações</span>
              <span><i class="fas fa-shield-alt"></i> Controle</span>
            </div>
          </div>
        </div>
        
        <div class="action-footer">
          <button class="btn btn-secondary btn-voltar">
            <i class="fas fa-arrow-left"></i> Voltar
          </button>
        </div>
      </section>
    `;
  },
  
  // Tela de login do motorista
  renderLoginMotorista() {
    return `
      <section class="tela">
        <div class="section-header">
          <h2><i class="fas fa-bus"></i> Login do Motorista</h2>
          <p>Informe sua matrícula para continuar</p>
        </div>
        
        <div class="auth-card">
          <div class="auth-icon">
            <i class="fas fa-id-card"></i>
          </div>
          
          <div class="form-group">
            <label for="matriculaMotorista">
              <i class="fas fa-hashtag"></i> Matrícula
            </label>
            <input
              id="matriculaMotorista"
              type="text"
              placeholder="Digite sua matrícula"
              class="form-input"
              aria-label="Matrícula do motorista"
              maxlength="10"
              autocomplete="off"
            />
            <div class="form-hint">
              <i class="fas fa-info-circle"></i> Exemplo: AC1234
            </div>
          </div>
          
          <button class="btn btn-primary btn-block" onclick="ui.loginMotorista()" id="loginBtn">
            <i class="fas fa-sign-in-alt"></i> Entrar
          </button>
          
          <div class="auth-footer">
            <p><i class="fas fa-exclamation-triangle"></i> Apenas motoristas autorizados</p>
          </div>
        </div>
        
        <div class="action-footer">
          <button class="btn btn-secondary btn-voltar">
            <i class="fas fa-arrow-left"></i> Voltar
          </button>
        </div>
      </section>
    `;
  },
  
  // Tela de seleção de ônibus
  async renderSelecaoOnibus() {
    try {
      showLoading('Carregando frota...');
      
      // Buscar ônibus do Firebase
      const onibusList = await db.getOnibus();
      
      let onibusHTML = '';
      
      if (onibusList.length === 0) {
        onibusHTML = `
          <div class="empty-state">
            <i class="fas fa-bus-slash"></i>
            <h4>Nenhum ônibus disponível</h4>
            <p>Contate a administração para cadastrar veículos.</p>
          </div>
        `;
      } else {
        onibusHTML = onibusList.map(onibus => `
          <div class="onibus-card" onclick="ui.selecionarOnibus('${onibus.placa}')">
            <div class="onibus-icon">
              <i class="fas fa-bus"></i>
            </div>
            <div class="onibus-info">
              <h4>${onibus.placa}</h4>
              <p><strong>TAG AC:</strong> ${onibus.tag_ac}</p>
              <p><strong>TAG VALE:</strong> ${onibus.tag_vale}</p>
              <small><i class="fas fa-paint-brush"></i> ${onibus.cor}</small>
              <small><i class="fas fa-building"></i> ${onibus.empresa}</small>
            </div>
            <div class="onibus-select">
              <i class="fas fa-chevron-right"></i>
            </div>
          </div>
        `).join('');
      }
      
      return `
        <section class="tela">
          <div class="section-header">
            <h2><i class="fas fa-bus"></i> Selecione seu Ônibus</h2>
            <p>Escolha o ônibus que você está conduzindo hoje</p>
          </div>
          
          <div class="onibus-list">
            ${onibusHTML}
          </div>
          
          <div class="action-footer">
            <button class="btn btn-secondary btn-voltar">
              <i class="fas fa-arrow-left"></i> Voltar
            </button>
          </div>
        </section>
      `;
      
    } catch (error) {
      console.error('Erro ao carregar ônibus:', error);
      return this.renderErrorScreen('Erro ao carregar frota de ônibus');
    } finally {
      hideLoading();
    }
  },
  
  // Tela do motorista
  async renderTelaMotorista() {
    const user = window.appState.user;
    const onibus = window.appState.onibusAtivo;
    const rotaAtiva = window.appState.rotaAtiva;
    
    return `
      <section class="tela">
        <div class="user-header">
          <div class="user-avatar">
            <i class="fas fa-user-circle"></i>
          </div>
          <div class="user-info">
            <h2>Olá, ${user?.nome || 'Motorista'}!</h2>
            <div class="user-details">
              <span class="user-badge">
                <i class="fas fa-id-card"></i> ${user?.matricula || '---'}
              </span>
              ${onibus ? `
                <span class="user-badge">
                  <i class="fas fa-bus"></i> ${onibus.placa}
                </span>
              ` : ''}
            </div>
            ${onibus ? `
              <div class="user-tags">
                <span class="user-tag"><i class="fas fa-tag"></i> ${onibus.tag_ac}</span>
                <span class="user-tag"><i class="fas fa-id-card"></i> ${onibus.tag_vale}</span>
              </div>
            ` : ''}
          </div>
        </div>
        
        ${rotaAtiva ? `
          <div class="status-card">
            <div class="status-header">
              <i class="fas fa-route"></i>
              <h3>Rota Ativa</h3>
            </div>
            <div class="status-content">
              <p><strong>${rotaAtiva.nome}</strong></p>
              <p>Distância: ${window.appState.distanciaTotal.toFixed(2)} km</p>
              <button class="btn btn-danger" onclick="app.pararRota()">
                <i class="fas fa-stop"></i> Parar Rota
              </button>
            </div>
          </div>
        ` : ''}
        
        <div class="cards-grid">
          <div class="feature-card" onclick="app.mostrarTela('rotas')">
            <div class="card-icon primary">
              <i class="fas fa-route"></i>
            </div>
            <h3>Selecionar Rota</h3>
            <p>Escolha a rota que irá conduzir hoje</p>
          </div>
          
          <div class="feature-card" onclick="ui.mostrarAvisos()">
            <div class="card-icon warning">
              <i class="fas fa-bullhorn"></i>
            </div>
            <h3>Avisos & Comunicados</h3>
            <p>Informações importantes da empresa</p>
            ${window.appState.avisosAtivos.length > 0 ? `
              <span class="badge">${window.appState.avisosAtivos.length}</span>
            ` : ''}
          </div>
          
          <div class="feature-card" onclick="window.open('https://forms.gle/UDniKxPqcMKGUhFQA', '_blank')">
            <div class="card-icon info">
              <i class="fas fa-clipboard-check"></i>
            </div>
            <h3>Controle de Veículo</h3>
            <p>Preencha entrada e saída (obrigatório)</p>
          </div>
          
          <div class="feature-card" onclick="app.mostrarTela('feedback', { perfil: 'motorista' })">
            <div class="card-icon secondary">
              <i class="fas fa-comment-dots"></i>
            </div>
            <h3>Feedback</h3>
            <p>Melhorias ou reclamações</p>
          </div>
          
          <div class="feature-card" onclick="app.mostrarTela('escala')">
            <div class="card-icon dark">
              <i class="fas fa-calendar-alt"></i>
            </div>
            <h3>Minha Escala</h3>
            <p>Verifique sua escala de trabalho</p>
          </div>
          
          <div class="feature-card emergency" onclick="app.ativarEmergencia()">
            <div class="card-icon danger">
              <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3>🚨 EMERGÊNCIA</h3>
            <p>Botão de emergência/pânico</p>
          </div>
          
          <div class="feature-card whatsapp" onclick="ui.abrirSuporteWhatsApp()">
            <div class="card-icon">
              <i class="fab fa-whatsapp"></i>
            </div>
            <h3>Suporte WhatsApp</h3>
            <p>Contato de suporte 24h</p>
          </div>
          
          ${rotaAtiva ? `
            <div class="feature-card" onclick="app.verMapaRota('${rotaAtiva.id}', '${rotaAtiva.nome}')">
              <div class="card-icon success">
                <i class="fas fa-map"></i>
              </div>
              <h3>Ver Mapa da Rota</h3>
              <p>Visualize sua rota no mapa</p>
            </div>
          ` : ''}
        </div>
        
        <div class="action-footer">
          <button class="btn btn-secondary" onclick="app.logout()">
            <i class="fas fa-sign-out-alt"></i> Sair
          </button>
        </div>
      </section>
    `;
  },
  
  // Tela de rotas
  async renderTelaRotas() {
    try {
      showLoading('Carregando rotas...');
      
      const rotas = await db.getRotas();
      const motoristasAtivos = await db.getMotoristasAtivos();
      
      // Agrupar motoristas por rota
      const motoristasPorRota = {};
      motoristasAtivos.forEach(m => {
        if (!motoristasPorRota[m.rota]) {
          motoristasPorRota[m.rota] = [];
        }
        motoristasPorRota[m.rota].push(m);
      });
      
      let rotasHTML = '';
      
      if (rotas.length === 0) {
        rotasHTML = `
          <div class="empty-state">
            <i class="fas fa-route"></i>
            <h4>Nenhuma rota cadastrada</h4>
            <p>Contate a administração para cadastrar rotas.</p>
          </div>
        `;
      } else {
        rotasHTML = rotas.map(rota => {
          const motoristasNaRota = motoristasPorRota[rota.nome] || [];
          const podeIniciar = window.appState.user && window.appState.onibusAtivo;
          
          return `
            <div class="route-item ${rota.tipo}" data-tipo="${rota.tipo}">
              <div class="route-info">
                <div class="route-header">
                  <span class="route-icon">
                    ${rota.tipo === 'adm' ? '🏢' : rota.tipo === 'retorno' ? '🔄' : '🚛'}
                  </span>
                  <div>
                    <div class="route-nome">${rota.nome}</div>
                    <small class="route-desc">${rota.descricao || ''}</small>
                  </div>
                </div>
                <div class="route-status">
                  ${motoristasNaRota.length > 0 ? `
                    <small>✅ ${motoristasNaRota.length} motorista(s) ativo(s)</small>
                  ` : `
                    <small>⏳ Nenhum motorista ativo</small>
                  `}
                </div>
              </div>
              <div class="route-actions">
                ${podeIniciar ? `
                  <button class="btn" onclick="app.iniciarRota('${rota.id}', '${rota.nome}')">
                    <i class="fas fa-play"></i> Iniciar
                  </button>
                ` : `
                  <button class="btn disabled" disabled>
                    <i class="fas fa-exclamation-circle"></i> Selecione ônibus
                  </button>
                `}
                <button class="btn secondary" onclick="app.verMapaRota('${rota.id}', '${rota.nome}')">
                  <i class="fas fa-map"></i> Mapa
                </button>
                ${motoristasNaRota.length > 0 ? `
                  <button class="btn outline" onclick="ui.verMotoristasRota('${rota.nome}')">
                    <i class="fas fa-users"></i> Ver (${motoristasNaRota.length})
                  </button>
                ` : ''}
              </div>
            </div>
          `;
        }).join('');
      }
      
      return `
        <section class="tela">
          <div class="section-header">
            <h2><i class="fas fa-route"></i> Rotas Disponíveis</h2>
            <p>Selecione abaixo a rota que você irá conduzir</p>
            <button class="btn btn-secondary btn-voltar">
              <i class="fas fa-arrow-left"></i> Voltar
            </button>
          </div>
          
          <div class="search-filter">
            <div class="search-box">
              <i class="fas fa-search"></i>
              <input 
                type="text" 
                id="routeSearch" 
                class="search-input" 
                placeholder="Buscar rota..." 
                oninput="ui.searchRoutes()"
              />
            </div>
            
            <div class="filter-tabs">
              <button class="filter-tab active" onclick="ui.filterRoutes('all')">Todas</button>
              <button class="filter-tab" onclick="ui.filterRoutes('adm')">ADM</button>
              <button class="filter-tab" onclick="ui.filterRoutes('operacional')">Operacional</button>
              <button class="filter-tab" onclick="ui.filterRoutes('retorno')">Retorno</button>
            </div>
          </div>
          
          <div class="routes-container">
            ${rotasHTML}
          </div>
        </section>
      `;
      
    } catch (error) {
      console.error('Erro ao carregar rotas:', error);
      return this.renderErrorScreen('Erro ao carregar rotas');
    } finally {
      hideLoading();
    }
  },
  
  // Tela do passageiro
  async renderTelaPassageiro() {
    return `
      <section class="tela">
        <div class="section-header">
          <h2><i class="fas fa-users"></i> Passageiro</h2>
          <p>Acompanhe sua rota em tempo real</p>
        </div>
        
        <div class="cards-grid">
          <div class="feature-card" onclick="app.mostrarTela('rotas-passageiro')">
            <div class="card-icon primary">
              <i class="fas fa-route"></i>
            </div>
            <h3>Ver Rotas</h3>
            <p>Veja as rotas disponíveis e motoristas ativos</p>
          </div>
          
          <div class="feature-card" onclick="ui.mostrarAvisos()">
            <div class="card-icon warning">
              <i class="fas fa-bullhorn"></i>
            </div>
            <h3>Avisos</h3>
            <p>Comunicados importantes</p>
          </div>
          
          <div class="feature-card" onclick="app.mostrarTela('feedback', { perfil: 'passageiro' })">
            <div class="card-icon secondary">
              <i class="fas fa-comment-dots"></i>
            </div>
            <h3>Feedback</h3>
            <p>Sugestões ou reclamações</p>
          </div>
          
          <div class="feature-card whatsapp" onclick="ui.abrirSuporteWhatsApp()">
            <div class="card-icon">
              <i class="fab fa-whatsapp"></i>
            </div>
            <h3>Suporte WhatsApp</h3>
            <p>Contato de suporte</p>
          </div>
        </div>
        
        <div class="rotas-ativas-section">
          <h3><i class="fas fa-bus"></i> Rotas Ativas Agora</h3>
          <div class="rotas-ativas-container" id="rotasAtivasList">
            <div class="skeleton-loading">
              <div class="skeleton-line"></div>
              <div class="skeleton-line"></div>
              <div class="skeleton-line"></div>
            </div>
          </div>
        </div>
        
        <div class="action-footer">
          <button class="btn btn-secondary btn-voltar">
            <i class="fas fa-arrow-left"></i> Voltar
          </button>
        </div>
      </section>
    `;
  },
  
  // Tela de rotas para passageiro
  async renderRotasPassageiro() {
    try {
      showLoading('Carregando informações...');
      
      const rotas = await db.getRotas();
      const motoristasAtivos = await db.getMotoristasAtivos();
      
      // Agrupar motoristas por rota
      const motoristasPorRota = {};
      motoristasAtivos.forEach(m => {
        if (!motoristasPorRota[m.rota]) {
          motoristasPorRota[m.rota] = [];
        }
        motoristasPorRota[m.rota].push(m);
      });
      
      let rotasHTML = '';
      
      if (rotas.length === 0) {
        rotasHTML = `
          <div class="empty-state">
            <i class="fas fa-route"></i>
            <h4>Nenhuma rota disponível</h4>
            <p>Não há rotas cadastradas no momento.</p>
          </div>
        `;
      } else {
        rotasHTML = rotas.map(rota => {
          const motoristasNaRota = motoristasPorRota[rota.nome] || [];
          
          return `
            <div class="rota-passageiro-card ${motoristasNaRota.length > 0 ? 'com-motorista' : 'sem-motorista'}">
              <div class="rota-passageiro-header">
                <div class="rota-passageiro-icon">
                  ${rota.tipo === 'adm' ? '🏢' : rota.tipo === 'retorno' ? '🔄' : '🚛'}
                </div>
                <div class="rota-passageiro-info">
                  <h4>${rota.nome}</h4>
                  <p class="rota-descricao">${rota.descricao || ''}</p>
                  <div class="rota-passageiro-status">
                    ${motoristasNaRota.length > 0 ? `
                      <span class="status-online">
                        <i class="fas fa-circle"></i> ${motoristasNaRota.length} motorista(s) ativo(s)
                      </span>
                    ` : `
                      <span class="status-offline">
                        <i class="fas fa-circle"></i> Sem motoristas ativos
                      </span>
                    `}
                  </div>
                </div>
              </div>
              
              ${motoristasNaRota.length > 0 ? `
                <div class="motoristas-na-rota">
                  <h5><i class="fas fa-users"></i> Motoristas ativos:</h5>
                  ${motoristasNaRota.map(motorista => {
                    const ultimaAtualizacao = motorista.ultimaAtualizacao ? 
                      new Date(motorista.ultimaAtualizacao.toDate()) : 
                      new Date();
                    
                    return `
                      <div class="motorista-passageiro-item">
                        <div class="motorista-info">
                          <strong><i class="fas fa-user"></i> ${motorista.motorista}</strong>
                          <span class="onibus-info">${motorista.onibus}</span>
                        </div>
                        <div class="motorista-detalhes">
                          ${motorista.distancia ? `
                            <span class="detalhe-item">
                              <i class="fas fa-road"></i> ${motorista.distancia} km
                            </span>
                          ` : ''}
                          ${motorista.velocidade ? `
                            <span class="detalhe-item">
                              <i class="fas fa-tachometer-alt"></i> ${motorista.velocidade} km/h
                            </span>
                          ` : ''}
                          <span class="detalhe-item">
                            <i class="fas fa-clock"></i> ${this.calcularTempoDecorrido(ultimaAtualizacao)}
                          </span>
                        </div>
                        <div class="motorista-acoes">
                          <button class="btn small" onclick="app.verMapaRota('${rota.id}', '${rota.nome}')">
                            <i class="fas fa-map-marker-alt"></i> Ver Mapa
                          </button>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              ` : ''}
              
              <div class="rota-passageiro-actions">
                <button class="btn secondary" onclick="app.verMapaRota('${rota.id}', '${rota.nome}')">
                  <i class="fas fa-map"></i> Ver Rota no Mapa
                </button>
              </div>
            </div>
          `;
        }).join('');
      }
      
      return `
        <section class="tela">
          <div class="section-header">
            <h2><i class="fas fa-route"></i> Todas as Rotas Disponíveis</h2>
            <p>Veja todas as rotas da empresa e motoristas ativos em tempo real</p>
            <button class="btn btn-secondary btn-voltar">
              <i class="fas fa-arrow-left"></i> Voltar
            </button>
          </div>
          
          <div class="rotas-passageiro-grid">
            ${rotasHTML}
          </div>
        </section>
      `;
      
    } catch (error) {
      console.error('Erro ao carregar rotas passageiro:', error);
      return this.renderErrorScreen('Erro ao carregar informações');
    } finally {
      hideLoading();
    }
  },
  
  // Tela de login do administrador
  renderLoginAdmin() {
    return `
      <section class="tela">
        <div class="section-header">
          <h2><i class="fas fa-cogs"></i> Acesso Administrativo</h2>
          <p>Acesso restrito à equipe de gestão</p>
        </div>
        
        <div class="auth-card">
          <div class="auth-icon admin">
            <i class="fas fa-shield-alt"></i>
          </div>
          
          <div class="form-group">
            <label for="adminEmail">
              <i class="fas fa-envelope"></i> E-mail
            </label>
            <input type="email" id="adminEmail" placeholder="seu@email.com" class="form-input" />
          </div>
          
          <div class="form-group">
            <label for="adminSenha">
              <i class="fas fa-lock"></i> Senha
            </label>
            <input type="password" id="adminSenha" placeholder="Sua senha" class="form-input" />
          </div>
          
          <button class="btn btn-primary btn-block" onclick="ui.loginAdmin()">
            <i class="fas fa-sign-in-alt"></i> Entrar
          </button>
          
          <div class="auth-footer">
            <p><i class="fas fa-exclamation-circle"></i> Acesso restrito aos administradores</p>
          </div>
        </div>
        
        <div class="action-footer">
          <button class="btn btn-secondary btn-voltar">
            <i class="fas fa-arrow-left"></i> Voltar
          </button>
        </div>
      </section>
    `;
  },
  
  // Tela de feedback
  renderFeedbackScreen(perfil) {
    return `
      <section class="tela">
        <div class="section-header">
          <h2><i class="fas fa-comment-dots"></i> Feedback - ${perfil === 'motorista' ? 'Motorista' : 'Passageiro'}</h2>
          <p>Envie sugestões, melhorias ou reclamações</p>
          <button class="btn btn-secondary btn-voltar">
            <i class="fas fa-arrow-left"></i> Voltar
          </button>
        </div>
        
        <div class="feedback-form">
          <div class="form-group">
            <label>Tipo</label>
            <select id="feedbackTipo" class="form-input">
              <option value="sugestao">Sugestão</option>
              <option value="melhoria">Melhoria</option>
              <option value="reclamacao">Reclamação</option>
              <option value="elogio">Elogio</option>
              <option value="problema">Problema Técnico</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Mensagem</label>
            <textarea id="feedbackMensagem" class="form-input" rows="5" 
              placeholder="Descreva sua mensagem... (mínimo 10 caracteres)"></textarea>
          </div>
          
          <div class="form-actions">
            <button class="btn btn-primary" onclick="ui.enviarFeedback('${perfil}')">
              <i class="fas fa-paper-plane"></i> Enviar Feedback
            </button>
            <button class="btn btn-secondary btn-voltar">
              <i class="fas fa-times"></i> Cancelar
            </button>
          </div>
        </div>
      </section>
    `;
  },
  
  // Tela de escala
  async renderEscalaScreen() {
    try {
      const user = window.appState.user;
      
      if (!user || !user.matricula) {
        return this.renderErrorScreen('Matrícula não encontrada');
      }
      
      showLoading('Carregando escala...');
      
      const escala = await db.getEscalaPorMatricula(user.matricula);
      
      if (!escala) {
        return `
          <section class="tela">
            <div class="section-header">
              <h2><i class="fas fa-calendar-alt"></i> Minha Escala</h2>
              <p>Confira sua escala de trabalho</p>
              <button class="btn btn-secondary btn-voltar">
                <i class="fas fa-arrow-left"></i> Voltar
              </button>
            </div>
            
            <div class="empty-state">
              <i class="fas fa-calendar-times"></i>
              <h4>Nenhuma escala encontrada</h4>
              <p>Sua matrícula (${user.matricula}) não possui escala cadastrada.</p>
              <p>Entre em contato com a administração.</p>
            </div>
          </section>
        `;
      }
      
      const diasSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
      
      const diasHTML = diasSemana.map(dia => {
        const diaEscala = escala.dias?.find(d => d.dia && d.dia.trim().toLowerCase() === dia.toLowerCase());
        
        return `
          <div class="dia-escala ${diaEscala ? '' : 'folga'}">
            <div class="dia-nome">${dia}</div>
            <div class="dia-info">
              ${diaEscala ? `
                <span class="turno ${this.getTurnoClass(diaEscala.horario)}">
                  ${diaEscala.horario || '00:00 - 00:00'}
                </span>
                <span class="rota">${diaEscala.rota || 'Sem rota'}</span>
                ${diaEscala.onibus ? `<small class="onibus-escala">${diaEscala.onibus}</small>` : ''}
              ` : `
                <span class="folga-text">FOLGA</span>
              `}
            </div>
          </div>
        `;
      }).join('');
      
      return `
        <section class="tela">
          <div class="section-header">
            <h2><i class="fas fa-calendar-alt"></i> Minha Escala</h2>
            <p>Confira sua escala de trabalho</p>
            <button class="btn btn-secondary btn-voltar">
              <i class="fas fa-arrow-left"></i> Voltar
            </button>
          </div>
          
          <div class="escala-container">
            <div class="escala-card">
              <div class="escala-header">
                <h3>${escala.motorista || user.nome}</h3>
                <span class="escala-periodo">${escala.periodo || 'Escala semanal'}</span>
              </div>
              
              <div class="escala-dias">
                ${diasHTML}
              </div>
              
              <div class="escala-footer">
                <p><i class="fas fa-info-circle"></i> Para alterações na escala, contate a administração.</p>
              </div>
            </div>
          </div>
        </section>
      `;
      
    } catch (error) {
      console.error('Erro ao carregar escala:', error);
      return this.renderErrorScreen('Erro ao carregar escala');
    } finally {
      hideLoading();
    }
  },
  
  // Tela de erro
  renderErrorScreen(mensagem) {
    return `
      <section class="tela">
        <div class="error-state">
          <i class="fas fa-exclamation-triangle"></i>
          <h4>Erro</h4>
          <p>${mensagem}</p>
          <button class="btn btn-secondary btn-voltar">
            <i class="fas fa-arrow-left"></i> Voltar
          </button>
        </div>
      </section>
    `;
  },
  
  // ========== FUNÇÕES DE INTERAÇÃO ==========
  
  // Login do motorista
  async loginMotorista() {
    try {
      const input = document.getElementById('matriculaMotorista');
      const btn = document.getElementById('loginBtn');
      
      if (!input) return;
      
      const matricula = input.value.trim().toUpperCase();
      
      if (!matricula) {
        showToast('error', 'Informe sua matrícula');
        input.focus();
        return;
      }
      
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validando...';
      
      await auth.loginMotorista(matricula);
      
      // Ir para seleção de ônibus
      app.mostrarTela('selecao-onibus');
      
    } catch (error) {
      showToast('error', error.message || 'Erro ao fazer login');
    } finally {
      const btn = document.getElementById('loginBtn');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
      }
    }
  },
  
  // Selecionar ônibus
  async selecionarOnibus(placa) {
    try {
      const onibusList = await db.getOnibus();
      const onibus = onibusList.find(o => o.placa === placa);
      
      if (!onibus) {
        showToast('error', 'Ônibus não encontrado');
        return;
      }
      
      const confirmado = await showConfirm(
        'Confirmar Ônibus',
        `Você selecionou o ônibus ${placa}.\n\nTAG AC: ${onibus.tag_ac}\nTAG VALE: ${onibus.tag_vale}\n\nConfirmar seleção?`,
        'Confirmar',
        'Cancelar'
      );
      
      if (!confirmado) return;
      
      // Salvar seleção
      window.appState.onibusAtivo = onibus;
      localStorage.setItem('onibus_ativo', JSON.stringify(onibus));
      
      // Atualizar UI
      auth.atualizarInfoOnibus();
      
      // Solicitar permissão de GPS
      try {
        showLoading('Obtendo localização...');
        await auth.solicitarPermissaoGPS();
        
        showToast('success', `Ônibus ${placa} selecionado com sucesso!`);
        app.mostrarTela('motorista');
        
      } catch (gpsError) {
        console.warn('GPS não disponível:', gpsError);
        showToast('warning', 'Localização não disponível. Você pode ativar depois.');
        app.mostrarTela('motorista');
      }
      
    } catch (error) {
      console.error('Erro ao selecionar ônibus:', error);
      showToast('error', 'Erro ao selecionar ônibus');
    } finally {
      hideLoading();
    }
  },
  
  // Login do administrador
  async loginAdmin() {
    try {
      const email = document.getElementById('adminEmail')?.value;
      const senha = document.getElementById('adminSenha')?.value;
      
      if (!email || !senha) {
        showToast('error', 'Preencha e-mail e senha');
        return;
      }
      
      await auth.loginAdmin(email, senha);
      
      // Ir para dashboard admin
      app.mostrarTela('admin-dashboard');
      
    } catch (error) {
      showToast('error', error.message || 'Erro ao fazer login');
    }
  },
  
  // Enviar feedback
  async enviarFeedback(perfil) {
    try {
      const tipo = document.getElementById('feedbackTipo')?.value;
      const mensagem = document.getElementById('feedbackMensagem')?.value;
      
      if (!tipo || !mensagem) {
        showToast('error', 'Preencha todos os campos');
        return;
      }
      
      if (mensagem.length < 10) {
        showToast('error', 'A mensagem deve ter pelo menos 10 caracteres');
        return;
      }
      
      const dados = {
        tipo: tipo,
        mensagem: mensagem,
        perfil: perfil,
        status: 'pendente',
        timestamp: new Date()
      };
      
      if (perfil === 'motorista' && window.appState.user) {
        dados.motorista = window.appState.user.nome;
        dados.matricula = window.appState.user.matricula;
      }
      
      // Registrar no Firebase
      await db.registrarFeedback(dados);
      
      showToast('success', 'Feedback enviado com sucesso!');
      
      // Voltar para tela anterior
      if (perfil === 'motorista') {
        app.mostrarTela('motorista');
      } else {
        app.mostrarTela('passageiro');
      }
      
    } catch (error) {
      console.error('Erro ao enviar feedback:', error);
      showToast('error', 'Erro ao enviar feedback');
    }
  },
  
  // Mostrar avisos
  async mostrarAvisos() {
    const avisos = window.appState.avisosAtivos;
    
    if (avisos.length === 0) {
      showToast('info', 'Nenhum aviso no momento');
      return;
    }
    
    const avisosHTML = avisos.map(aviso => `
      <div class="aviso-item">
        <div class="aviso-header">
          <strong>${aviso.titulo}</strong>
          <small>${aviso.timestamp ? new Date(aviso.timestamp.toDate()).toLocaleDateString() : ''}</small>
        </div>
        <p>${aviso.mensagem}</p>
        <small class="aviso-destino">Para: ${aviso.destino || 'Todos'}</small>
      </div>
    `).join('');
    
    await Swal.fire({
      title: '📢 Avisos e Comunicados',
      html: `
        <div class="avisos-list">
          ${avisosHTML}
        </div>
      `,
      width: 600,
      confirmButtonText: 'Fechar',
      confirmButtonColor: '#b00000'
    });
  },
  
  // Ver motoristas na rota
  async verMotoristasRota(nomeRota) {
    try {
      showLoading('Carregando motoristas...');
      
      const motoristas = await db.getMotoristasAtivosPorRota(nomeRota);
      
      if (motoristas.length === 0) {
        showToast('info', 'Nenhum motorista ativo nesta rota');
        return;
      }
      
      const motoristasHTML = motoristas.map(m => `
        <div class="motorista-modal-item">
          <div class="motorista-info">
            <strong><i class="fas fa-user"></i> ${m.motorista}</strong>
            <small>${m.onibus} • ${m.rota}</small>
          </div>
          <div class="motorista-detalhes">
            <span><i class="fas fa-road"></i> ${m.distancia || '0'} km</span>
            <span><i class="fas fa-tachometer-alt"></i> ${m.velocidade || '0'} km/h</span>
          </div>
          <button class="btn btn-small" onclick="app.verMapaRota('', '${m.rota}')">
            <i class="fas fa-map"></i> Ver no Mapa
          </button>
        </div>
      `).join('');
      
      await Swal.fire({
        title: `👥 Motoristas na Rota ${nomeRota}`,
        html: `
          <div class="motoristas-modal-list">
            ${motoristasHTML}
          </div>
        `,
        width: 600,
        confirmButtonText: 'Fechar'
      });
      
    } catch (error) {
      console.error('Erro ao carregar motoristas:', error);
      showToast('error', 'Erro ao carregar motoristas');
    } finally {
      hideLoading();
    }
  },
  
  // Abrir suporte WhatsApp
  abrirSuporteWhatsApp() {
    const telefone = '5593992059914';
    const mensagem = encodeURIComponent('Olá! Preciso de suporte no Portal de Transporte da AC Parceria.');
    const url = `https://wa.me/${telefone}?text=${mensagem}`;
    
    window.open(url, '_blank', 'noopener,noreferrer');
  },
  
  // Buscar rotas
  searchRoutes() {
    const searchTerm = document.getElementById('routeSearch')?.value.toLowerCase();
    const routeItems = document.querySelectorAll('.route-item');
    
    routeItems.forEach(item => {
      const routeName = item.querySelector('.route-nome')?.textContent.toLowerCase();
      const routeDesc = item.querySelector('.route-desc')?.textContent.toLowerCase();
      
      if (routeName.includes(searchTerm) || routeDesc.includes(searchTerm) || !searchTerm) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });
  },
  
  // Filtrar rotas
  filterRoutes(type) {
    const routeItems = document.querySelectorAll('.route-item');
    const filterTabs = document.querySelectorAll('.filter-tab');
    
    filterTabs.forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    
    routeItems.forEach(item => {
      const itemType = item.dataset.tipo;
      
      if (type === 'all' || itemType === type) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });
  },
  
  // ========== UTILIDADES ==========
  
  // Calcular tempo decorrido
  calcularTempoDecorrido(timestamp) {
    if (!timestamp) return 'Agora mesmo';
    
    const agora = new Date();
    const data = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffMs = agora - data;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `${diffMins} min atrás`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d atrás`;
  },
  
  // Obter classe do turno
  getTurnoClass(horario) {
    if (!horario) return 'manha';
    if (horario.includes('06:00')) return 'manha';
    if (horario.includes('14:00')) return 'tarde';
    if (horario.includes('22:00')) return 'noite';
    return 'manha';
  },
  
  // Inicializar modais
  initModals() {
    // Fechar modais com ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal-back');
        modals.forEach(modal => modal.remove());
      }
    });
    
    // Fechar modal clicando fora
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-back')) {
        e.target.remove();
      }
    });
  },
  
  // Inicializar notificações
  initNotifications() {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  },
  
  // Inicializar skeleton loading
  initSkeletonLoading() {
    // Adicionar estilos para skeleton
    const style = document.createElement('style');
    style.textContent = `
      .skeleton-loading {
        padding: 20px;
      }
      
      .skeleton-line {
        height: 20px;
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: loading 1.5s infinite;
        border-radius: 4px;
        margin-bottom: 10px;
      }
      
      .skeleton-line:last-child {
        width: 60%;
      }
      
      @keyframes loading {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
      
      body.dark .skeleton-line {
        background: linear-gradient(90deg, #2d2d44 25%, #3d3d5a 50%, #2d2d44 75%);
      }
    `;
    
    document.head.appendChild(style);
  }
};

// Exportar funções globais
window.ui = ui;

export { ui };
