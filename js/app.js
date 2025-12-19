// js/app.js - Arquivo principal que importa todos os módulos
import { auth } from './auth.js';
import { db } from './db.js';
import * as ui from './ui-components.js';
import * as tracker from './gps-tracker.js';
import * as map from './map-integration.js';
import * as admin from './admin-panel.js';
import { showLoading, hideLoading, showToast, showConfirm } from './utils.js';

// Estado global da aplicação
window.appState = {
  user: null,
  perfil: null,
  onibusAtivo: null,
  rotaAtiva: null,
  watchId: null,
  isOnline: navigator.onLine,
  avisosAtivos: [],
  escalas: [],
  estatisticas: null,
  ultimaLocalizacao: null,
  distanciaTotal: 0,
  historicoRota: [],
  unsubscribeCallbacks: []
};

// Inicialização da aplicação
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 AC Transporte - Inicializando...');
  
  try {
    // Verificar sessão existente
    await auth.verificarSessao();
    
    // Inicializar componentes UI
    ui.init();
    
    // Inicializar PWA
    initPWA();
    
    // Inicializar tema
    initDarkMode();
    
    // Inicializar monitor de conexão
    initConnectionMonitor();
    
    console.log('✅ Aplicativo inicializado com sucesso');
    
  } catch (error) {
    console.error('❌ Erro na inicialização:', error);
    showToast('error', 'Erro ao inicializar o aplicativo');
  }
});

// ========== NAVEGAÇÃO ENTRE TELAS ==========
window.mostrarTela = async function(telaId, params = {}) {
  console.log('🔄 Navegando para tela:', telaId);
  
  try {
    showLoading('Carregando...');
    
    // Limpar tela atual
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = '';
    
    // Carregar nova tela
    let html = '';
    
    switch(telaId) {
      case 'welcome':
        html = await ui.renderWelcomeScreen();
        break;
        
      case 'escolha-perfil':
        html = ui.renderPerfilScreen();
        break;
        
      case 'login-motorista':
        html = ui.renderLoginMotorista();
        break;
        
      case 'selecao-onibus':
        html = ui.renderSelecaoOnibus();
        break;
        
      case 'motorista':
        html = await ui.renderTelaMotorista();
        break;
        
      case 'rotas':
        html = await ui.renderTelaRotas();
        break;
        
      case 'passageiro':
        html = await ui.renderTelaPassageiro();
        break;
        
      case 'rotas-passageiro':
        html = await ui.renderRotasPassageiro();
        break;
        
      case 'login-admin':
        html = ui.renderLoginAdmin();
        break;
        
      case 'admin-dashboard':
        html = await ui.renderAdminDashboard();
        break;
        
      case 'feedback':
        html = ui.renderFeedbackScreen(params.perfil);
        break;
        
      case 'escala':
        html = await ui.renderEscalaScreen();
        break;
        
      case 'admin-rotas':
        html = await admin.renderGerenciarRotas();
        break;
        
      case 'admin-onibus':
        html = await admin.renderGerenciarOnibus();
        break;
        
      case 'admin-escalas':
        html = await admin.renderGerenciarEscalas();
        break;
        
      case 'mapa-integrado':
        html = await map.renderMapaIntegrado(params);
        break;
        
      case 'historico-rota':
        html = await map.renderHistoricoRota(params);
        break;
        
      default:
        html = await ui.renderWelcomeScreen();
    }
    
    mainContent.innerHTML = html;
    
    // Adicionar evento ao botão de voltar
    const backBtn = mainContent.querySelector('.btn-voltar');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        history.back();
      });
    }
    
  } catch (error) {
    console.error('Erro ao carregar tela:', error);
    showToast('error', 'Erro ao carregar tela');
  } finally {
    hideLoading();
  }
};

// ========== FUNÇÕES PRINCIPAIS ==========
window.entrarNoPortal = function() {
  mostrarTela('escolha-perfil');
};

window.selecionarPerfil = function(perfil) {
  appState.perfil = perfil;
  localStorage.setItem('perfil_ativo', perfil);
  
  if (perfil === 'motorista') {
    mostrarTela('login-motorista');
  } else if (perfil === 'passageiro') {
    mostrarTela('passageiro');
  } else if (perfil === 'admin') {
    mostrarTela('login-admin');
  }
};

window.iniciarRota = async function(rotaId, rotaNome) {
  try {
    const confirmado = await showConfirm(
      'Iniciar Rota',
      `Deseja iniciar a rota "${rotaNome}"?\n\nSua localização será compartilhada em tempo real.`,
      'Iniciar',
      'Cancelar'
    );
    
    if (!confirmado) return;
    
    // Obter ônibus selecionado
    if (!appState.onibusAtivo) {
      const onibusSalvo = localStorage.getItem('onibus_ativo');
      if (onibusSalvo) {
        appState.onibusAtivo = JSON.parse(onibusSalvo);
      } else {
        showToast('warning', 'Selecione um ônibus primeiro');
        mostrarTela('selecao-onibus');
        return;
      }
    }
    
    // Iniciar rastreamento GPS
    await tracker.iniciarRastreamento(rotaId, rotaNome);
    
    showToast('success', `Rota "${rotaNome}" iniciada com sucesso!`);
    mostrarTela('motorista');
    
  } catch (error) {
    console.error('Erro ao iniciar rota:', error);
    showToast('error', 'Erro ao iniciar rota');
  }
};

window.pararRota = async function() {
  try {
    const confirmado = await showConfirm(
      'Parar Rota',
      'Deseja parar o compartilhamento da rota?',
      'Parar',
      'Continuar'
    );
    
    if (!confirmado) return;
    
    await tracker.pararRastreamento();
    showToast('success', 'Rota encerrada com sucesso');
    mostrarTela('motorista');
    
  } catch (error) {
    console.error('Erro ao parar rota:', error);
    showToast('error', 'Erro ao parar rota');
  }
};

window.verMapaRota = async function(rotaId, rotaNome) {
  try {
    // Obter dados da rota do Firebase
    const rotaData = await db.getRota(rotaId);
    
    if (!rotaData) {
      showToast('error', 'Rota não encontrada');
      return;
    }
    
    // Obter motoristas ativos nesta rota
    const motoristasAtivos = await db.getMotoristasAtivosPorRota(rotaNome);
    
    mostrarTela('mapa-integrado', {
      rota: rotaData,
      motoristas: motoristasAtivos,
      modo: 'visualizacao'
    });
    
  } catch (error) {
    console.error('Erro ao carregar mapa:', error);
    showToast('error', 'Erro ao carregar mapa');
  }
};

window.verHistoricoRota = async function(motoristaId, data) {
  try {
    showLoading('Carregando histórico...');
    
    const historico = await db.getHistoricoRota(motoristaId, data);
    
    mostrarTela('historico-rota', {
      motoristaId: motoristaId,
      data: data,
      historico: historico
    });
    
  } catch (error) {
    console.error('Erro ao carregar histórico:', error);
    showToast('error', 'Erro ao carregar histórico');
  } finally {
    hideLoading();
  }
};

window.ativarEmergencia = async function() {
  try {
    const { value: tipo } = await Swal.fire({
      title: '🚨 Tipo de Emergência',
      text: 'Selecione o tipo de emergência:',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Continuar',
      cancelButtonText: 'Cancelar',
      input: 'select',
      inputOptions: {
        acidente: 'Acidente',
        mecanico: 'Problema Mecânico',
        saude: 'Problema de Saúde',
        sinistro: 'Sinistro/Avaria'
      },
      inputPlaceholder: 'Selecione uma opção'
    });
    
    if (!tipo) return;
    
    if (tipo === 'sinistro') {
      window.open('https://forms.gle/ima9J1SrgVyYVgvc9', '_blank');
      return;
    }
    
    const { value: descricao } = await Swal.fire({
      title: 'Descreva a situação',
      text: 'Forneça detalhes sobre a emergência:',
      input: 'textarea',
      inputPlaceholder: 'Descreva brevemente a situação...',
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return 'Por favor, forneça uma descrição';
        }
        if (value.length < 10) {
          return 'A descrição deve ter pelo menos 10 caracteres';
        }
      }
    });
    
    if (!descricao) return;
    
    // Registrar emergência no Firebase
    await db.registrarEmergencia({
      motorista: appState.user.nome,
      matricula: appState.user.matricula,
      onibus: appState.onibusAtivo?.placa,
      rota: appState.rotaAtiva,
      tipo: tipo,
      descricao: descricao,
      status: 'pendente',
      timestamp: new Date()
    });
    
    // Ativar vibração se suportada
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
    
    showToast('success', 'Emergência registrada! A equipe foi notificada.');
    
  } catch (error) {
    console.error('Erro ao registrar emergência:', error);
    showToast('error', 'Erro ao registrar emergência');
  }
};

window.logout = async function() {
  try {
    const confirmado = await showConfirm(
      'Sair',
      'Deseja realmente sair do sistema?',
      'Sair',
      'Cancelar'
    );
    
    if (!confirmado) return;
    
    // Parar rastreamento se estiver ativo
    if (appState.watchId) {
      tracker.pararRastreamento();
    }
    
    // Limpar callbacks do Firebase
    appState.unsubscribeCallbacks.forEach(unsubscribe => unsubscribe());
    appState.unsubscribeCallbacks = [];
    
    // Limpar estado
    appState.user = null;
    appState.perfil = null;
    appState.onibusAtivo = null;
    appState.rotaAtiva = null;
    appState.watchId = null;
    appState.historicoRota = [];
    
    // Limpar localStorage
    localStorage.removeItem('perfil_ativo');
    localStorage.removeItem('motorista_matricula');
    localStorage.removeItem('motorista_nome');
    localStorage.removeItem('onibus_ativo');
    localStorage.removeItem('admin_logado');
    
    // Atualizar UI
    document.getElementById('userStatus').style.display = 'none';
    
    // Mostrar tela inicial
    mostrarTela('welcome');
    
    showToast('success', 'Logout realizado com sucesso');
    
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    showToast('error', 'Erro ao fazer logout');
  }
};

// ========== FUNÇÕES DE UTILIDADE ==========
function initPWA() {
  const installBtn = document.getElementById('installBtn');
  if (!installBtn) return;
  
  let deferredPrompt;
  
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'flex';
  });
  
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    
    if (choiceResult.outcome === 'accepted') {
      installBtn.style.display = 'none';
    }
    
    deferredPrompt = null;
  });
}

function initDarkMode() {
  const darkToggle = document.getElementById('darkToggle');
  if (!darkToggle) return;
  
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  const savedPreference = localStorage.getItem('ac_dark');
  
  if (savedPreference === '1' || (!savedPreference && prefersDark.matches)) {
    document.body.classList.add('dark');
    darkToggle.innerHTML = '<i class="fas fa-sun"></i>';
  }
  
  darkToggle.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('ac_dark', isDark ? '1' : '0');
    darkToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  });
}

function initConnectionMonitor() {
  const updateStatus = () => {
    appState.isOnline = navigator.onLine;
    const statusElement = document.getElementById('connectionStatus');
    const offlineBanner = document.getElementById('offlineBanner');
    
    if (statusElement) {
      statusElement.style.color = appState.isOnline ? '#4CAF50' : '#FF5722';
      statusElement.title = appState.isOnline ? 'Online' : 'Offline';
    }
    
    if (offlineBanner) {
      offlineBanner.style.display = appState.isOnline ? 'none' : 'block';
    }
    
    if (!appState.isOnline) {
      showToast('warning', 'Você está offline. Algumas funcionalidades podem estar limitadas.');
    }
  };
  
  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);
  updateStatus();
}

// Exportar funções globais
window.app = {
  logout,
  mostrarTela,
  selecionarPerfil,
  entrarNoPortal,
  iniciarRota,
  pararRota,
  verMapaRota,
  verHistoricoRota,
  ativarEmergencia
};

// Carregar tela inicial
window.onload = () => {
  mostrarTela('welcome');
};

console.log('✅ app.js carregado');
