// js/auth.js - Sistema de autenticação
import { db } from './db.js';
import { showLoading, hideLoading, showToast } from './utils.js';

const auth = {
  // Verificar sessão existente
  async verificarSessao() {
    try {
      const perfil = localStorage.getItem('perfil_ativo');
      const matricula = localStorage.getItem('motorista_matricula');
      const nome = localStorage.getItem('motorista_nome');
      const adminLogado = localStorage.getItem('admin_logado');
      
      if (perfil === 'motorista' && matricula && nome) {
        window.appState.user = { matricula, nome };
        window.appState.perfil = 'motorista';
        
        // Carregar ônibus salvo
        const onibusSalvo = localStorage.getItem('onibus_ativo');
        if (onibusSalvo) {
          window.appState.onibusAtivo = JSON.parse(onibusSalvo);
        }
        
        // Atualizar UI
        this.updateUserStatus(nome, matricula);
        
        // Iniciar monitoramento de avisos
        this.iniciarMonitoramentoAvisos();
        
        return { perfil: 'motorista', user: window.appState.user };
        
      } else if (perfil === 'passageiro') {
        window.appState.perfil = 'passageiro';
        window.appState.user = { nome: 'Passageiro' };
        return { perfil: 'passageiro' };
        
      } else if (perfil === 'admin' && adminLogado) {
        window.appState.perfil = 'admin';
        window.appState.user = { 
          nome: 'Administrador',
          email: localStorage.getItem('admin_email')
        };
        return { perfil: 'admin', user: window.appState.user };
      }
      
      return null;
      
    } catch (error) {
      console.error('Erro ao verificar sessão:', error);
      return null;
    }
  },
  
  // Login do motorista
  async loginMotorista(matricula) {
    try {
      showLoading('Validando matrícula...');
      
      const colaborador = await db.getColaborador(matricula);
      
      if (!colaborador) {
        throw new Error('Matrícula não encontrada');
      }
      
      if (!colaborador.ativo) {
        throw new Error('Colaborador inativo. Contate a administração.');
      }
      
      if (colaborador.perfil !== 'motorista') {
        throw new Error('Este acesso é exclusivo para motoristas');
      }
      
      // Salvar dados no localStorage
      localStorage.setItem('motorista_matricula', matricula);
      localStorage.setItem('motorista_nome', colaborador.nome);
      localStorage.setItem('motorista_email', colaborador.email || '');
      localStorage.setItem('perfil_ativo', 'motorista');
      
      // Atualizar estado
      window.appState.user = { 
        matricula, 
        nome: colaborador.nome,
        email: colaborador.email || ''
      };
      window.appState.perfil = 'motorista';
      
      // Atualizar UI
      this.updateUserStatus(colaborador.nome, matricula);
      
      showToast('success', `Bem-vindo, ${colaborador.nome}!`);
      
      return colaborador;
      
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    } finally {
      hideLoading();
    }
  },
  
  // Login do administrador
  async loginAdmin(email, senha) {
    try {
      showLoading('Validando credenciais...');
      
      // Buscar administrador no Firebase
      const admin = await db.getAdminByEmail(email);
      
      if (!admin) {
        throw new Error('Administrador não encontrado');
      }
      
      // Verificar senha (em produção, usar Firebase Auth)
      if (admin.senha !== senha) {
        throw new Error('Senha incorreta');
      }
      
      // Salvar dados
      localStorage.setItem('admin_logado', 'true');
      localStorage.setItem('admin_email', email);
      localStorage.setItem('perfil_ativo', 'admin');
      
      // Atualizar estado
      window.appState.user = { 
        nome: admin.nome || 'Administrador',
        email: email,
        isAdmin: true
      };
      window.appState.perfil = 'admin';
      
      showToast('success', 'Login administrativo realizado!');
      
      return admin;
      
    } catch (error) {
      console.error('Erro no login admin:', error);
      throw error;
    } finally {
      hideLoading();
    }
  },
  
  // Atualizar status do usuário na UI
  updateUserStatus(nome, matricula) {
    const userStatus = document.getElementById('userStatus');
    const userName = document.getElementById('userName');
    
    if (userStatus) userStatus.style.display = 'flex';
    if (userName) userName.textContent = nome;
    
    // Atualizar tags do ônibus se estiver selecionado
    if (window.appState.onibusAtivo) {
      this.atualizarInfoOnibus();
    }
  },
  
  // Atualizar informações do ônibus
  atualizarInfoOnibus() {
    if (!window.appState.user || !window.appState.onibusAtivo) return;
    
    const userTags = document.querySelector('.user-tags');
    if (!userTags) return;
    
    userTags.innerHTML = `
      <span class="user-tag"><i class="fas fa-bus"></i> ${window.appState.onibusAtivo.placa}</span>
      <span class="user-tag"><i class="fas fa-tag"></i> ${window.appState.onibusAtivo.tag_ac}</span>
      <span class="user-tag"><i class="fas fa-id-card"></i> ${window.appState.onibusAtivo.tag_vale}</span>
    `;
  },
  
  // Iniciar monitoramento de avisos
  iniciarMonitoramentoAvisos() {
    const unsubscribe = db.monitorarAvisos((avisos) => {
      window.appState.avisosAtivos = avisos;
      
      const avisosCount = document.getElementById('avisosCount');
      if (avisosCount) {
        avisosCount.textContent = avisos.length;
        avisosCount.style.display = avisos.length > 0 ? 'inline' : 'none';
      }
    });
    
    window.appState.unsubscribeCallbacks.push(unsubscribe);
  },
  
  // Solicitar permissão de localização
  async solicitarPermissaoGPS() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalização não suportada'));
        return;
      }
      
      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      };
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve(position);
        },
        (error) => {
          reject(error);
        },
        options
      );
    });
  }
};

export { auth };
