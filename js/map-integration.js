// js/map-integration.js - Integração com Leaflet para mapas embutidos
import { db } from './db.js';
import { showLoading, hideLoading, showToast } from './utils.js';

const mapIntegration = {
  // Mapa principal
  mapa: null,
  marcadores: {},
  polylines: {},
  
  // Inicializar mapa
  initMap(containerId, options = {}) {
    const defaultOptions = {
      center: [-5.09, -42.80], // Centro de Teresina
      zoom: 13,
      minZoom: 10,
      maxZoom: 18,
      zoomControl: true,
      attributionControl: true
    };
    
    const mapOptions = { ...defaultOptions, ...options };
    
    this.mapa = L.map(containerId, mapOptions);
    
    // Adicionar tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(this.mapa);
    
    return this.mapa;
  },
  
  // Renderizar tela de mapa integrado
  async renderMapaIntegrado(params) {
    showLoading('Carregando mapa...');
    
    try {
      const { rota, motoristas, modo = 'visualizacao' } = params;
      
      let html = `
        <div class="section-header">
          <h2><i class="fas fa-map"></i> ${rota.nome}</h2>
          <p>Visualização em tempo real</p>
          <button class="btn btn-secondary btn-voltar">
            <i class="fas fa-arrow-left"></i> Voltar
          </button>
        </div>
        
        <div class="mapa-container">
          <div id="mapaPrincipal" style="height: 500px; border-radius: 12px;"></div>
        </div>
        
        <div class="mapa-controles">
          <div class="controles-grid">
            <button class="btn btn-small" onclick="map.centralizarMapa()">
              <i class="fas fa-crosshairs"></i> Centralizar
            </button>
            <button class="btn btn-small" onclick="map.limparMarcadores()">
              <i class="fas fa-trash"></i> Limpar
            </button>
            <button class="btn btn-small" onclick="map.alternarSatelite()">
              <i class="fas fa-satellite"></i> Satélite
            </button>
            ${modo === 'admin' ? `
            <button class="btn btn-small btn-danger" onclick="map.definirGeofence()">
              <i class="fas fa-draw-polygon"></i> Geofence
            </button>
            ` : ''}
          </div>
        </div>
        
        <div class="mapa-info-panel">
          <h3><i class="fas fa-info-circle"></i> Informações da Rota</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Nome:</span>
              <span class="info-value">${rota.nome}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Tipo:</span>
              <span class="info-value">${rota.tipo || 'Operacional'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Motoristas ativos:</span>
              <span class="info-value">${motoristas?.length || 0}</span>
            </div>
          </div>
        </div>
      `;
      
      setTimeout(() => {
        this.carregarMapaComRota(rota, motoristas);
      }, 100);
      
      return html;
      
    } catch (error) {
      console.error('Erro ao renderizar mapa:', error);
      return '<div class="error-state">Erro ao carregar mapa</div>';
    } finally {
      hideLoading();
    }
  },
  
  // Carregar mapa com rota e motoristas
  async carregarMapaComRota(rota, motoristas) {
    try {
      // Inicializar mapa
      this.initMap('mapaPrincipal');
      
      // Carregar trajeto da rota (se existir)
      if (rota.coordenadas) {
        this.desenharTrajetoRota(rota.coordenadas, rota.nome);
      } else if (rota.mapsUrl) {
        // Tentar extrair coordenadas do URL do Google Maps
        await this.carregarTrajetoDeUrl(rota.mapsUrl, rota.nome);
      }
      
      // Adicionar motoristas ativos
      if (motoristas && motoristas.length > 0) {
        motoristas.forEach(motorista => {
          this.adicionarMarcadorMotorista(motorista);
        });
        
        // Centralizar no primeiro motorista
        if (motoristas[0].latitude && motoristas[0].longitude) {
          this.mapa.setView([motoristas[0].latitude, motoristas[0].longitude], 14);
        }
      }
      
      // Iniciar monitoramento em tempo real
      this.iniciarMonitoramentoTempoReal(rota.nome);
      
    } catch (error) {
      console.error('Erro ao carregar mapa:', error);
      showToast('error', 'Erro ao carregar mapa');
    }
  },
  
  // Desenhar trajeto da rota
  desenharTrajetoRota(coordenadas, nomeRota) {
    if (!coordenadas || coordenadas.length < 2) return;
    
    // Converter coordenadas para formato Leaflet
    const latLngs = coordenadas.map(coord => [coord.lat, coord.lng]);
    
    // Criar polyline
    const polyline = L.polyline(latLngs, {
      color: '#b00000',
      weight: 4,
      opacity: 0.7,
      smoothFactor: 1
    }).addTo(this.mapa);
    
    this.polylines[nomeRota] = polyline;
    
    // Ajustar view para mostrar toda a rota
    this.mapa.fitBounds(polyline.getBounds());
    
    // Adicionar marcadores de início e fim
    if (latLngs.length > 0) {
      L.marker(latLngs[0], {
        icon: L.divIcon({
          className: 'marker-inicio',
          html: '<i class="fas fa-play-circle"></i>',
          iconSize: [30, 30]
        })
      }).addTo(this.mapa).bindPopup('Início da rota');
      
      L.marker(latLngs[latLngs.length - 1], {
        icon: L.divIcon({
          className: 'marker-fim',
          html: '<i class="fas fa-flag-checkered"></i>',
          iconSize: [30, 30]
        })
      }).addTo(this.mapa).bindPopup('Fim da rota');
    }
  },
  
  // Carregar trajeto de URL do Google Maps
  async carregarTrajetoDeUrl(url, nomeRota) {
    try {
      // Extrair coordenadas do URL (simplificado)
      // Em produção, usar API do Google Maps ou converter KML
      const coordenadas = await this.extrairCoordenadas(url);
      
      if (coordenadas && coordenadas.length > 0) {
        this.desenharTrajetoRota(coordenadas, nomeRota);
      } else {
        // Fallback: usar coordenadas padrão
        this.desenharTrajetoRota([
          { lat: -5.09, lng: -42.80 },
          { lat: -5.10, lng: -42.82 },
          { lat: -5.12, lng: -42.84 }
        ], nomeRota);
      }
      
    } catch (error) {
      console.error('Erro ao carregar trajeto:', error);
    }
  },
  
  // Extrair coordenadas de URL (simplificado)
  async extrairCoordenadas(url) {
    // Implementação básica - em produção usar API adequada
    return null;
  },
  
  // Adicionar marcador do motorista
  adicionarMarcadorMotorista(motorista) {
    if (!motorista.latitude || !motorista.longitude) return;
    
    const latLng = [motorista.latitude, motorista.longitude];
    
    // Criar ícone personalizado
    const icon = L.divIcon({
      className: 'marker-motorista',
      html: `
        <div class="motorista-marker">
          <i class="fas fa-bus"></i>
          <div class="marker-info">${motorista.onibus}</div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 40]
    });
    
    // Criar marcador
    const marker = L.marker(latLng, { icon }).addTo(this.mapa);
    
    // Popup com informações
    const popupContent = `
      <div class="motorista-popup">
        <h4>${motorista.motorista}</h4>
        <p><strong>Ônibus:</strong> ${motorista.onibus}</p>
        <p><strong>Rota:</strong> ${motorista.rota}</p>
        <p><strong>Velocidade:</strong> ${motorista.velocidade || '0'} km/h</p>
        <p><strong>Última atualização:</strong> ${new Date().toLocaleTimeString()}</p>
        <button class="btn btn-small" onclick="map.verDetalhesMotorista('${motorista.matricula}')">
          Ver detalhes
        </button>
      </div>
    `;
    
    marker.bindPopup(popupContent);
    
    // Salvar referência
    this.marcadores[motorista.matricula] = marker;
    
    return marker;
  },
  
  // Atualizar posição do motorista
  atualizarMarcadorMotorista(motorista) {
    if (!motorista.latitude || !motorista.longitude) return;
    
    const marker = this.marcadores[motorista.matricula];
    
    if (marker) {
      // Atualizar posição
      marker.setLatLng([motorista.latitude, motorista.longitude]);
      
      // Atualizar popup
      const popupContent = `
        <div class="motorista-popup">
          <h4>${motorista.motorista}</h4>
          <p><strong>Ônibus:</strong> ${motorista.onibus}</p>
          <p><strong>Rota:</strong> ${motorista.rota}</p>
          <p><strong>Velocidade:</strong> ${motorista.velocidade || '0'} km/h</p>
          <p><strong>Distância:</strong> ${motorista.distancia || '0'} km</p>
          <p><strong>Última atualização:</strong> ${new Date().toLocaleTimeString()}</p>
        </div>
      `;
      
      marker.getPopup().setContent(popupContent);
      
      // Adicionar ao histórico de movimento
      this.adicionarTrajetoMotorista(motorista);
    } else {
      // Criar novo marcador
      this.adicionarMarcadorMotorista(motorista);
    }
  },
  
  // Adicionar trajeto do motorista
  adicionarTrajetoMotorista(motorista) {
    const trajetoId = `trajeto_${motorista.matricula}`;
    
    if (!this.polylines[trajetoId]) {
      this.polylines[trajetoId] = L.polyline([], {
        color: '#3498db',
        weight: 2,
        opacity: 0.5,
        smoothFactor: 1
      }).addTo(this.mapa);
    }
    
    const trajeto = this.polylines[trajetoId];
    const latLngs = trajeto.getLatLngs();
    latLngs.push([motorista.latitude, motorista.longitude]);
    trajeto.setLatLngs(latLngs);
  },
  
  // Iniciar monitoramento em tempo real
  iniciarMonitoramentoTempoReal(nomeRota) {
    const unsubscribe = db.monitorarRotas((rotas) => {
      const motoristasRota = rotas.filter(r => r.rota === nomeRota);
      
      motoristasRota.forEach(motorista => {
        this.atualizarMarcadorMotorista(motorista);
      });
      
      // Remover marcadores de motoristas que não estão mais ativos
      Object.keys(this.marcadores).forEach(matricula => {
        const aindaAtivo = motoristasRota.some(m => m.matricula === matricula);
        if (!aindaAtivo) {
          this.mapa.removeLayer(this.marcadores[matricula]);
          delete this.marcadores[matricula];
        }
      });
    });
    
    // Salvar callback para limpar depois
    window.appState.unsubscribeCallbacks.push(unsubscribe);
  },
  
  // Renderizar histórico de rota
  async renderHistoricoRota(params) {
    showLoading('Carregando histórico...');
    
    try {
      const { motoristaId, data, historico } = params;
      
      let html = `
        <div class="section-header">
          <h2><i class="fas fa-history"></i> Histórico de Rota</h2>
          <p>${new Date(data).toLocaleDateString('pt-BR')}</p>
          <button class="btn btn-secondary btn-voltar">
            <i class="fas fa-arrow-left"></i> Voltar
          </button>
        </div>
        
        <div class="historico-container">
          <div class="historico-mapa">
            <div id="mapaHistorico" style="height: 400px; border-radius: 12px;"></div>
          </div>
          
          <div class="historico-controles">
            <div class="controle-group">
              <label>Velocidade de reprodução:</label>
              <select id="playbackSpeed" class="form-input">
                <option value="1">1x</option>
                <option value="2">2x</option>
                <option value="5">5x</option>
                <option value="10">10x</option>
              </select>
            </div>
            
            <div class="controle-group">
              <button class="btn btn-success" id="btnPlay">
                <i class="fas fa-play"></i> Reproduzir
              </button>
              <button class="btn btn-secondary" id="btnPause" disabled>
                <i class="fas fa-pause"></i> Pausar
              </button>
              <button class="btn btn-warning" id="btnReset">
                <i class="fas fa-redo"></i> Reiniciar
              </button>
            </div>
            
            <div class="controle-group">
              <input type="range" id="timelineSlider" min="0" max="100" value="0" class="timeline-slider">
              <div class="timeline-info">
                <span id="currentTime">00:00</span>
                <span id="totalTime">00:00</span>
              </div>
            </div>
          </div>
          
          <div class="historico-detalhes">
            <h3><i class="fas fa-chart-line"></i> Estatísticas</h3>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-icon">
                  <i class="fas fa-road"></i>
                </div>
                <div class="stat-content">
                  <h4 id="totalDistance">0 km</h4>
                  <p>Distância total</p>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon">
                  <i class="fas fa-clock"></i>
                </div>
                <div class="stat-content">
                  <h4 id="totalTime">0 min</h4>
                  <p>Tempo total</p>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon">
                  <i class="fas fa-tachometer-alt"></i>
                </div>
                <div class="stat-content">
                  <h4 id="avgSpeed">0 km/h</h4>
                  <p>Velocidade média</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      setTimeout(() => {
        this.carregarHistoricoNoMapa(historico);
      }, 100);
      
      return html;
      
    } catch (error) {
      console.error('Erro ao renderizar histórico:', error);
      return '<div class="error-state">Erro ao carregar histórico</div>';
    } finally {
      hideLoading();
    }
  },
  
  // Carregar histórico no mapa
  carregarHistoricoNoMapa(historico) {
    if (!historico || historico.length === 0) {
      showToast('info', 'Nenhum dado histórico disponível');
      return;
    }
    
    // Inicializar mapa
    this.initMap('mapaHistorico', { zoom: 14 });
    
    // Converter pontos para array de coordenadas
    const coordenadas = historico.map(p => [p.latitude, p.longitude]);
    
    // Desenhar trajeto completo
    const trajetoCompleto = L.polyline(coordenadas, {
      color: '#95a5a6',
      weight: 3,
      opacity: 0.3,
      smoothFactor: 1
    }).addTo(this.mapa);
    
    // Marcador para reprodução
    const playbackMarker = L.marker(coordenadas[0], {
      icon: L.divIcon({
        className: 'playback-marker',
        html: '<i class="fas fa-bus"></i>',
        iconSize: [30, 30]
      })
    }).addTo(this.mapa);
    
    // Configurar controles de reprodução
    this.configurarPlayback(historico, playbackMarker, trajetoCompleto);
    
    // Centralizar no trajeto
    this.mapa.fitBounds(trajetoCompleto.getBounds());
  },
  
  // Configurar reprodução do histórico
  configurarPlayback(historico, marker, trajeto) {
    let currentIndex = 0;
    let isPlaying = false;
    let playbackInterval;
    let speed = 1;
    
    // Elementos UI
    const btnPlay = document.getElementById('btnPlay');
    const btnPause = document.getElementById('btnPause');
    const btnReset = document.getElementById('btnReset');
    const slider = document.getElementById('timelineSlider');
    const speedSelect = document.getElementById('playbackSpeed');
    const currentTime = document.getElementById('currentTime');
    const totalTime = document.getElementById('totalTime');
    
    if (!btnPlay || !slider) return;
    
    // Calcular tempo total
    const startTime = new Date(historico[0].timestamp);
    const endTime = new Date(historico[historico.length - 1].timestamp);
    const totalDuration = endTime - startTime;
    
    // Atualizar UI
    totalTime.textContent = this.formatarTempo(totalDuration / 1000);
    slider.max = historico.length - 1;
    
    // Função para atualizar posição
    const updatePosition = (index) => {
      if (index >= historico.length) {
        this.pararPlayback();
        return;
      }
      
      const ponto = historico[index];
      marker.setLatLng([ponto.latitude, ponto.longitude]);
      
      // Atualizar slider e tempo
      slider.value = index;
      const elapsed = new Date(ponto.timestamp) - startTime;
      currentTime.textContent = this.formatarTempo(elapsed / 1000);
      
      // Atualizar estatísticas
      this.atualizarEstatisticas(historico.slice(0, index + 1));
      
      currentIndex = index;
    };
    
    // Função de playback
    const play = () => {
      if (isPlaying) return;
      
      isPlaying = true;
      btnPlay.disabled = true;
      btnPause.disabled = false;
      
      playbackInterval = setInterval(() => {
        if (currentIndex >= historico.length - 1) {
          this.pararPlayback();
          return;
        }
        
        currentIndex++;
        updatePosition(currentIndex);
      }, 1000 / speed);
    };
    
    // Função para pausar
    const pause = () => {
      isPlaying = false;
      clearInterval(playbackInterval);
      btnPlay.disabled = false;
      btnPause.disabled = true;
    };
    
    // Função para reiniciar
    const reset = () => {
      pause();
      currentIndex = 0;
      updatePosition(0);
    };
    
    // Event listeners
    btnPlay.addEventListener('click', play);
    btnPause.addEventListener('click', pause);
    btnReset.addEventListener('click', reset);
    
    slider.addEventListener('input', (e) => {
      const newIndex = parseInt(e.target.value);
      if (!isPlaying) {
        updatePosition(newIndex);
      }
    });
    
    speedSelect.addEventListener('change', (e) => {
      speed = parseInt(e.target.value);
      if (isPlaying) {
        pause();
        play();
      }
    });
    
    // Inicializar
    updatePosition(0);
    
    // Salvar funções para limpeza
    window.playbackControls = { play, pause, reset };
  },
  
  // Parar playback
  pararPlayback() {
    if (window.playbackControls) {
      window.playbackControls.pause();
    }
    
    const btnPlay = document.getElementById('btnPlay');
    const btnPause = document.getElementById('btnPause');
    
    if (btnPlay) btnPlay.disabled = false;
    if (btnPause) btnPause.disabled = true;
  },
  
  // Atualizar estatísticas
  atualizarEstatisticas(pontos) {
    if (pontos.length < 2) return;
    
    // Calcular distância total
    let distanciaTotal = 0;
    for (let i = 1; i < pontos.length; i++) {
      const dist = this.calcularDistancia(
        pontos[i-1].latitude,
        pontos[i-1].longitude,
        pontos[i].latitude,
        pontos[i].longitude
      );
      distanciaTotal += dist;
    }
    
    // Calcular tempo total
    const startTime = new Date(pontos[0].timestamp);
    const endTime = new Date(pontos[pontos.length - 1].timestamp);
    const tempoTotal = (endTime - startTime) / 1000 / 60; // em minutos
    
    // Calcular velocidade média
    const velocidadeMedia = distanciaTotal / (tempoTotal / 60); // km/h
    
    // Atualizar UI
    const totalDistance = document.getElementById('totalDistance');
    const totalTime = document.getElementById('totalTime');
    const avgSpeed = document.getElementById('avgSpeed');
    
    if (totalDistance) totalDistance.textContent = distanciaTotal.toFixed(2) + ' km';
    if (totalTime) totalTime.textContent = Math.round(tempoTotal) + ' min';
    if (avgSpeed) avgSpeed.textContent = velocidadeMedia.toFixed(1) + ' km/h';
  },
  
  // Formatar tempo (segundos para MM:SS)
  formatarTempo(segundos) {
    const mins = Math.floor(segundos / 60);
    const secs = Math.floor(segundos % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },
  
  // Funções públicas para o HTML
  centralizarMapa() {
    if (this.mapa) {
      this.mapa.setView([-5.09, -42.80], 13);
    }
  },
  
  limparMarcadores() {
    Object.values(this.marcadores).forEach(marker => {
      this.mapa.removeLayer(marker);
    });
    this.marcadores = {};
  },
  
  alternarSatelite() {
    // Implementar alternância entre mapas
    showToast('info', 'Funcionalidade em desenvolvimento');
  },
  
  definirGeofence() {
    showToast('info', 'Funcionalidade Geofence em desenvolvimento');
  },
  
  verDetalhesMotorista(matricula) {
    // Implementar modal de detalhes
    showToast('info', `Detalhes do motorista ${matricula}`);
  }
};

// Exportar funções globais
window.map = mapIntegration;

export { mapIntegration as map };
