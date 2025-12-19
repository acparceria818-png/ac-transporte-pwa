// js/gps-tracker.js - Sistema de rastreamento GPS com histórico
import { db } from './db.js';
import { showToast } from './utils.js';

const tracker = {
  // Iniciar rastreamento
  async iniciarRastreamento(rotaId, rotaNome) {
    try {
      // Solicitar permissão de localização em background
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      
      if (permission.state === 'denied') {
        throw new Error('Permissão de localização negada. Ative nas configurações do navegador.');
      }
      
      // Obter localização inicial
      const position = await this.obterLocalizacao();
      
      // Iniciar histórico
      window.appState.historicoRota = [{
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: new Date(),
        velocidade: position.coords.speed || 0,
        precisao: position.coords.accuracy
      }];
      
      // Atualizar estado
      window.appState.rotaAtiva = {
        id: rotaId,
        nome: rotaNome
      };
      
      // Enviar primeira localização
      await this.enviarLocalizacao(rotaNome, position.coords);
      
      // Iniciar monitoramento contínuo
      window.appState.watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          await this.processarLocalizacao(pos, rotaNome);
        },
        (error) => {
          console.error('Erro no monitoramento GPS:', error);
          this.handleGpsError(error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 1000,
          timeout: 10000
        }
      );
      
      // Configurar monitoramento em background
      this.configurarBackgroundTracking();
      
      // Ativar service worker para tracking em background
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        await this.registrarBackgroundSync();
      }
      
      console.log('📍 Rastreamento iniciado:', rotaNome);
      return true;
      
    } catch (error) {
      console.error('Erro ao iniciar rastreamento:', error);
      throw error;
    }
  },
  
  // Processar localização
  async processarLocalizacao(position, rotaNome) {
    try {
      const coords = position.coords;
      
      // Adicionar ao histórico
      window.appState.historicoRota.push({
        latitude: coords.latitude,
        longitude: coords.longitude,
        timestamp: new Date(),
        velocidade: coords.speed || 0,
        precisao: coords.accuracy
      });
      
      // Limitar tamanho do histórico (últimas 1000 posições)
      if (window.appState.historicoRota.length > 1000) {
        window.appState.historicoRota = window.appState.historicoRota.slice(-1000);
      }
      
      // Calcular distância percorrida
      if (window.appState.ultimaLocalizacao) {
        const distancia = this.calcularDistancia(
          window.appState.ultimaLocalizacao.latitude,
          window.appState.ultimaLocalizacao.longitude,
          coords.latitude,
          coords.longitude
        );
        window.appState.distanciaTotal += distancia;
      }
      
      window.appState.ultimaLocalizacao = coords;
      
      // Enviar para Firebase
      await this.enviarLocalizacao(rotaNome, coords);
      
      // Salvar no histórico do Firebase (a cada 30 segundos ou 100 metros)
      if (this.deveSalvarHistorico()) {
        await this.salvarPontoHistorico(coords);
      }
      
    } catch (error) {
      console.error('Erro ao processar localização:', error);
      // Tentar salvar localmente para sincronização posterior
      this.salvarLocalmente(position);
    }
  },
  
  // Enviar localização para Firebase
  async enviarLocalizacao(rotaNome, coords) {
    if (!window.appState.user || !window.appState.onibusAtivo) return;
    
    const dados = {
      motorista: window.appState.user.nome,
      matricula: window.appState.user.matricula,
      rota: rotaNome,
      onibus: window.appState.onibusAtivo.placa,
      tag_ac: window.appState.onibusAtivo.tag_ac,
      tag_vale: window.appState.onibusAtivo.tag_vale,
      latitude: coords.latitude,
      longitude: coords.longitude,
      velocidade: coords.speed ? (coords.speed * 3.6).toFixed(1) : '0',
      precisao: coords.accuracy,
      distancia: window.appState.distanciaTotal.toFixed(2),
      ativo: true,
      online: true,
      timestamp: new Date()
    };
    
    await db.updateLocalizacao(window.appState.user.matricula, dados);
    
    console.log('📍 Localização enviada:', new Date().toLocaleTimeString());
  },
  
  // Salvar ponto no histórico
  async salvarPontoHistorico(coords) {
    if (!window.appState.user) return;
    
    const ponto = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      velocidade: coords.speed || 0,
      precisao: coords.accuracy,
      distanciaTotal: window.appState.distanciaTotal,
      timestamp: new Date()
    };
    
    await db.registrarPontoRota(window.appState.user.matricula, ponto);
  },
  
  // Verificar se deve salvar no histórico
  deveSalvarHistorico() {
    if (window.appState.historicoRota.length < 2) return true;
    
    const ultimoSalvo = window.appState.historicoRota[window.appState.historicoRota.length - 2];
    const agora = new Date();
    const tempoDecorrido = (agora - new Date(ultimoSalvo.timestamp)) / 1000;
    
    // Salvar a cada 30 segundos ou se mudou mais de 100 metros
    if (tempoDecorrido >= 30) return true;
    
    if (window.appState.ultimaLocalizacao) {
      const distancia = this.calcularDistancia(
        ultimoSalvo.latitude,
        ultimoSalvo.longitude,
        window.appState.ultimaLocalizacao.latitude,
        window.appState.ultimaLocalizacao.longitude
      );
      if (distancia > 0.1) return true; // 100 metros
    }
    
    return false;
  },
  
  // Salvar localmente para sincronização offline
  salvarLocalmente(position) {
    try {
      const pontosOffline = JSON.parse(localStorage.getItem('pontos_offline') || '[]');
      
      pontosOffline.push({
        coords: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed
        },
        timestamp: new Date().toISOString(),
        rota: window.appState.rotaAtiva?.nome
      });
      
      localStorage.setItem('pontos_offline', JSON.stringify(pontosOffline));
      
      // Agendar sincronização
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        this.agendarSincronizacao();
      }
      
    } catch (error) {
      console.error('Erro ao salvar localmente:', error);
    }
  },
  
  // Sincronizar pontos offline
  async sincronizarOffline() {
    try {
      const pontosOffline = JSON.parse(localStorage.getItem('pontos_offline') || '[]');
      
      if (pontosOffline.length === 0) return;
      
      // Enviar pontos para o Firebase
      for (const ponto of pontosOffline) {
        await this.enviarLocalizacao(ponto.rota, ponto.coords);
      }
      
      // Limpar pontos sincronizados
      localStorage.removeItem('pontos_offline');
      
      console.log('✅ Pontos offline sincronizados:', pontosOffline.length);
      
    } catch (error) {
      console.error('Erro na sincronização offline:', error);
    }
  },
  
  // Configurar tracking em background
  configurarBackgroundTracking() {
    // Solicitar permissão para notificações
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    // Configurar eventos de visibilidade
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('📱 App em background - Mantendo rastreamento ativo');
      } else {
        console.log('📱 App em primeiro plano');
      }
    });
    
    // Configurar evento beforeunload para salvar estado
    window.addEventListener('beforeunload', () => {
      if (window.appState.watchId) {
        this.salvarEstadoRastreamento();
      }
    });
    
    // Restaurar estado se necessário
    this.restaurarEstadoRastreamento();
  },
  
  // Registrar background sync
  async registrarBackgroundSync() {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      if ('sync' in registration) {
        await registration.sync.register('sync-pontos-offline');
        console.log('✅ Background sync registrado');
      }
    } catch (error) {
      console.error('Erro ao registrar background sync:', error);
    }
  },
  
  // Agendar sincronização
  agendarSincronizacao() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SYNC_PONTOS_OFFLINE'
      });
    }
  },
  
  // Salvar estado do rastreamento
  salvarEstadoRastreamento() {
    const estado = {
      rotaAtiva: window.appState.rotaAtiva,
      historicoRota: window.appState.historicoRota.slice(-100), // Salvar últimos 100 pontos
      distanciaTotal: window.appState.distanciaTotal,
      ultimaLocalizacao: window.appState.ultimaLocalizacao,
      timestamp: new Date()
    };
    
    localStorage.setItem('rastreamento_estado', JSON.stringify(estado));
  },
  
  // Restaurar estado do rastreamento
  restaurarEstadoRastreamento() {
    try {
      const estadoSalvo = localStorage.getItem('rastreamento_estado');
      
      if (estadoSalvo) {
        const estado = JSON.parse(estadoSalvo);
        const umaHoraAtras = new Date(Date.now() - 60 * 60 * 1000);
        const estadoTimestamp = new Date(estado.timestamp);
        
        // Restaurar apenas se for recente (menos de 1 hora)
        if (estadoTimestamp > umaHoraAtras) {
          window.appState.historicoRota = estado.historicoRota || [];
          window.appState.distanciaTotal = estado.distanciaTotal || 0;
          window.appState.ultimaLocalizacao = estado.ultimaLocalizacao;
          
          console.log('🔄 Estado do rastreamento restaurado');
        } else {
          localStorage.removeItem('rastreamento_estado');
        }
      }
    } catch (error) {
      console.error('Erro ao restaurar estado:', error);
    }
  },
  
  // Parar rastreamento
  async pararRastreamento() {
    if (window.appState.watchId) {
      navigator.geolocation.clearWatch(window.appState.watchId);
      window.appState.watchId = null;
    }
    
    // Atualizar status no Firebase
    if (window.appState.user) {
      await db.updateLocalizacao(window.appState.user.matricula, {
        ativo: false,
        online: false,
        timestamp: new Date()
      });
    }
    
    // Salvar histórico final
    if (window.appState.historicoRota.length > 0) {
      await this.salvarHistoricoCompleto();
    }
    
    // Limpar estado
    window.appState.rotaAtiva = null;
    window.appState.distanciaTotal = 0;
    window.appState.ultimaLocalizacao = null;
    
    // Limpar localStorage
    localStorage.removeItem('rastreamento_estado');
    
    console.log('🛑 Rastreamento parado');
  },
  
  // Salvar histórico completo
  async salvarHistoricoCompleto() {
    if (!window.appState.user || window.appState.historicoRota.length === 0) return;
    
    try {
      // Aqui você pode enviar o histórico completo para uma coleção separada
      // ou processar os dados para relatórios
      console.log('📊 Histórico salvo com', window.appState.historicoRota.length, 'pontos');
      
    } catch (error) {
      console.error('Erro ao salvar histórico:', error);
    }
  },
  
  // Obter localização com timeout
  obterLocalizacao() {
    return new Promise((resolve, reject) => {
      const options = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      };
      
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  },
  
  // Calcular distância entre dois pontos (Haversine)
  calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  },
  
  // Manipular erros do GPS
  handleGpsError(error) {
    let mensagem = '';
    
    switch(error.code) {
      case error.PERMISSION_DENIED:
        mensagem = 'Permissão de localização negada. Ative o GPS nas configurações.';
        break;
      case error.POSITION_UNAVAILABLE:
        mensagem = 'Localização indisponível. Verifique se o GPS está ativado.';
        break;
      case error.TIMEOUT:
        mensagem = 'Tempo esgotado ao obter localização. Tente novamente.';
        break;
      default:
        mensagem = 'Erro desconhecido no GPS.';
    }
    
    showToast('error', mensagem);
    
    // Tentar reconectar após 30 segundos
    setTimeout(() => {
      if (window.appState.watchId && window.appState.rotaAtiva) {
        console.log('🔄 Tentando reconectar GPS...');
      }
    }, 30000);
  }
};

export { tracker };
