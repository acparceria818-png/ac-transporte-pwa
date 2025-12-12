// app.js - SISTEMA COMPLETO AC TRANSPORTE

// =============================================
// CONFIGURAÇÃO E INICIALIZAÇÃO
// =============================================

// Verificar se Firebase está configurado
let firebaseInitialized = false;
try {
  if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
    firebaseInitialized = true;
    console.log('Firebase inicializado com sucesso');
  }
} catch (error) {
  console.warn('Firebase não configurado, usando modo offline');
}

// Estado global da aplicação
const AppState = {
  currentUser: null,
  userProfile: null,
  locationEnabled: false,
  currentLocation: null,
  trackingInterval: null,
  notifications: [],
  emergencyMode: false
};

// =============================================
// FUNÇÕES DE UTILIDADE
// =============================================

/**
 * Mostrar notificação na tela
 */
function showNotification(type, message, duration = 5000) {
  const types = {
    success: { icon: '✓', color: '#4CAF50', title: 'Sucesso' },
    error: { icon: '✗', color: '#f44336', title: 'Erro' },
    warning: { icon: '⚠', icon: '⚠', color: '#ff9800', title: 'Aviso' },
    info: { icon: 'ℹ', color: '#2196F3', title: 'Informação' }
  };

  const config = types[type] || types.info;
  
  // Criar elemento da notificação
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <div class="notification-icon">${config.icon}</div>
    <div class="notification-content">
      <div class="notification-title">${config.title}</div>
      <div class="notification-message">${message}</div>
    </div>
    <button class="notification-close" onclick="this.parentElement.remove()">×</button>
  `;
  
  // Adicionar ao container de notificações
  let container = document.querySelector('.notification-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'notification-container';
    document.body.appendChild(container);
  }
  
  container.appendChild(notification);
  
  // Remover automaticamente após o tempo
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }
  }, duration);
  
  // Animar entrada
  setTimeout(() => {
    notification.style.animation = 'slideInRight 0.3s ease';
  }, 10);
}

/**
 * Abrir modal
 */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    // Adicionar animação
    modal.style.animation = 'fadeIn 0.3s ease';
    
    // Focar no primeiro elemento focável
    setTimeout(() => {
      const focusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable) focusable.focus();
    }, 100);
  }
}

/**
 * Fechar modal
 */
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => {
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = 'auto';
    }, 300);
  }
}

/**
 * Fechar todos os modais
 */
function closeAllModals() {
  document.querySelectorAll('.modal-back').forEach(modal => {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  });
  document.body.style.overflow = 'auto';
}

/**
 * Inicializar tema escuro
 */
function initDarkMode() {
  const darkToggle = document.getElementById('darkToggle');
  if (!darkToggle) return;
  
  // Verificar preferência salva
  const isDark = localStorage.getItem('darkMode') === 'true' ||
                 (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  if (isDark) {
    document.body.classList.add('dark');
    darkToggle.innerHTML = '<i class="fas fa-sun"></i>';
    darkToggle.setAttribute('title', 'Modo claro');
  } else {
    darkToggle.innerHTML = '<i class="fas fa-moon"></i>';
    darkToggle.setAttribute('title', 'Modo escuro');
  }
  
  // Adicionar evento de clique
  darkToggle.addEventListener('click', () => {
    const isDarkMode = document.body.classList.toggle('dark');
    localStorage.setItem('darkMode', isDarkMode);
    
    if (isDarkMode) {
      darkToggle.innerHTML = '<i class="fas fa-sun"></i>';
      darkToggle.setAttribute('title', 'Modo claro');
    } else {
      darkToggle.innerHTML = '<i class="fas fa-moon"></i>';
      darkToggle.setAttribute('title', 'Modo escuro');
    }
  });
}

/**
 * Verificar permissão de localização
 */
function checkLocationPermission() {
  if (!navigator.geolocation) {
    showNotification('warning', 'Seu navegador não suporta geolocalização');
    return false;
  }
  
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve(true),
      () => resolve(false),
      { timeout: 5000 }
    );
  });
}

/**
 * Obter localização atual
 */
function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalização não suportada'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        };
        
        AppState.currentLocation = location;
        resolve(location);
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
}

// =============================================
// FUNÇÕES DE LOCALIZAÇÃO EM TEMPO REAL
// =============================================

/**
 * Iniciar compartilhamento de localização
 */
function startLocationSharing() {
  if (AppState.trackingInterval) {
    clearInterval(AppState.trackingInterval);
  }
  
  AppState.trackingInterval = setInterval(async () => {
    try {
      const location = await getCurrentLocation();
      
      // Atualizar UI
      updateLocationUI(location);
      
      // Salvar no Firebase (se configurado)
      if (firebaseInitialized) {
        saveLocationToFirebase(location);
      }
      
      // Atualizar status
      document.getElementById('sharingStatus').textContent = 'Ativo';
      document.getElementById('locationIndicator').className = 'indicator active';
      
      const now = new Date();
      document.getElementById('lastUpdate').textContent = 
        `Última atualização: ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      
    } catch (error) {
      console.error('Erro ao obter localização:', error);
      showNotification('warning', 'Não foi possível obter a localização');
    }
  }, 30000); // Atualizar a cada 30 segundos
  
  // Primeira atualização imediata
  setTimeout(() => {
    if (AppState.trackingInterval) {
      clearInterval(AppState.trackingInterval);
      AppState.trackingInterval = setInterval(() => {
        // Mantém o intervalo
      }, 30000);
    }
  }, 100);
  
  showNotification('success', 'Localização sendo compartilhada');
}

/**
 * Parar compartilhamento de localização
 */
function stopLocationSharing() {
  if (AppState.trackingInterval) {
    clearInterval(AppState.trackingInterval);
    AppState.trackingInterval = null;
  }
  
  document.getElementById('sharingStatus').textContent = 'Desativado';
  document.getElementById('locationIndicator').className = 'indicator';
  
  showNotification('info', 'Localização não está mais sendo compartilhada');
}

/**
 * Atualizar UI da localização
 */
function updateLocationUI(location) {
  // Implementar conforme necessário
  console.log('Localização atualizada:', location);
}

/**
 * Salvar localização no Firebase
 */
async function saveLocationToFirebase(location) {
  if (!firebaseInitialized || !AppState.currentUser) return;
  
  try {
    const userProfile = localStorage.getItem('user_profile');
    const userId = localStorage.getItem('driver_matricula') || 'anonymous';
    
    const locationData = {
      userId: userId,
      userType: userProfile,
      latitude: location.lat,
      longitude: location.lng,
      accuracy: location.accuracy,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      route: localStorage.getItem('selected_route') || null
    };
    
    await db.collection('locations').add(locationData);
    console.log('Localização salva no Firebase');
  } catch (error) {
    console.error('Erro ao salvar localização:', error);
  }
}

// =============================================
// FUNÇÕES DE NOTIFICAÇÕES PUSH
// =============================================

/**
 * Solicitar permissão para notificações
 */
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    showNotification('warning', 'Seu navegador não suporta notificações');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission === 'denied') {
    showNotification('warning', 'Permissão para notificações foi negada');
    return false;
  }
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

/**
 * Enviar notificação push
 */
function sendPushNotification(title, message, options = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    console.warn('Notificações não disponíveis ou não permitidas');
    return;
  }
  
  const notificationOptions = {
    body: message,
    icon: 'assets/logo.jpg',
    badge: 'assets/logo.jpg',
    tag: 'ac-transporte',
    ...options
  };
  
  // Notificação para navegador
  const notification = new Notification(title, notificationOptions);
  
  // Adicionar clique para focar na janela
  notification.onclick = function() {
    window.focus();
    notification.close();
  };
  
  // Fechar automaticamente após 10 segundos
  setTimeout(() => notification.close(), 10000);
}

/**
 * Configurar Service Worker para notificações
 */
async function setupServiceWorker() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications não suportados');
    return;
  }
  
  try {
    const registration = await navigator.serviceWorker.register('service-worker.js');
    console.log('Service Worker registrado:', registration);
    
    // Solicitar permissão
    const permission = await requestNotificationPermission();
    if (permission) {
      // Aqui você configuraria o Firebase Cloud Messaging
      console.log('Pronto para receber notificações push');
    }
  } catch (error) {
    console.error('Erro ao registrar Service Worker:', error);
  }
}

// =============================================
// FUNÇÕES DE CLIMA
// =============================================

/**
 * Obter dados do clima
 */
async function getWeatherData(latitude, longitude) {
  try {
    // Usando OpenWeatherMap API (necessário criar conta gratuita)
    const apiKey = 'SUA_API_KEY_AQUI'; // Substitua pela sua chave
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric&lang=pt_br`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Erro ao obter dados do clima');
    
    const data = await response.json();
    
    return {
      temperature: Math.round(data.main.temp),
      description: data.weather[0].description,
      icon: getWeatherIcon(data.weather[0].icon),
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      city: data.name
    };
  } catch (error) {
    console.warn('Não foi possível obter dados do clima:', error);
    
    // Dados simulados para desenvolvimento
    return {
      temperature: 28,
      description: 'Parcialmente nublado',
      icon: 'fas fa-cloud-sun',
      humidity: 65,
      windSpeed: 12,
      city: 'Santarém, PA'
    };
  }
}

/**
 * Converter código do ícone do clima
 */
function getWeatherIcon(iconCode) {
  const icons = {
    '01d': 'fas fa-sun',
    '01n': 'fas fa-moon',
    '02d': 'fas fa-cloud-sun',
    '02n': 'fas fa-cloud-moon',
    '03d': 'fas fa-cloud',
    '03n': 'fas fa-cloud',
    '04d': 'fas fa-cloud',
    '04n': 'fas fa-cloud',
    '09d': 'fas fa-cloud-rain',
    '09n': 'fas fa-cloud-rain',
    '10d': 'fas fa-cloud-showers-heavy',
    '10n': 'fas fa-cloud-showers-heavy',
    '11d': 'fas fa-bolt',
    '11n': 'fas fa-bolt',
    '13d': 'fas fa-snowflake',
    '13n': 'fas fa-snowflake',
    '50d': 'fas fa-smog',
    '50n': 'fas fa-smog'
  };
  
  return icons[iconCode] || 'fas fa-cloud';
}

/**
 * Atualizar display do clima
 */
async function updateWeatherDisplay() {
  try {
    const location = await getCurrentLocation();
    const weather = await getWeatherData(location.lat, location.lng);
    
    // Atualizar elementos da UI
    const elements = {
      currentTemp: document.getElementById('currentTemp'),
      weatherDesc: document.getElementById('weatherDesc'),
      weatherIcon: document.getElementById('weatherIcon'),
      weatherLocation: document.getElementById('weatherLocation')
    };
    
    if (elements.currentTemp) {
      elements.currentTemp.textContent = `${weather.temperature}°C`;
    }
    
    if (elements.weatherDesc) {
      elements.weatherDesc.textContent = weather.description;
    }
    
    if (elements.weatherIcon) {
      elements.weatherIcon.innerHTML = `<i class="${weather.icon}"></i>`;
    }
    
    if (elements.weatherLocation) {
      elements.weatherLocation.textContent = weather.city;
    }
    
  } catch (error) {
    console.warn('Não foi possível atualizar o clima:', error);
  }
}

// =============================================
// FUNÇÕES DE EMERGÊNCIA
// =============================================

/**
 * Reportar emergência
 */
async function reportEmergency(type, details = {}) {
  try {
    const userProfile = localStorage.getItem('user_profile');
    const userId = localStorage.getItem('driver_matricula') || 'anonymous';
    const location = await getCurrentLocation();
    
    const emergencyData = {
      type: type,
      userId: userId,
      userType: userProfile,
      details: details.message || '',
      location: {
        lat: location.lat,
        lng: location.lng
      },
      status: 'pending',
      timestamp: new Date().toISOString(),
      route: localStorage.getItem('selected_route') || null
    };
    
    // Salvar no Firebase
    if (firebaseInitialized) {
      await db.collection('emergencies').add({
        ...emergencyData,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // Salvar localmente
      const emergencies = JSON.parse(localStorage.getItem('emergencies') || '[]');
      emergencies.push(emergencyData);
      localStorage.setItem('emergencies', JSON.stringify(emergencies));
    }
    
    // Enviar notificação para admin
    sendEmergencyNotification(emergencyData);
    
    // Mostrar confirmação
    showNotification('success', 'Emergência reportada! A equipe foi notificada.');
    
    // Ligar automaticamente para emergência se for grave
    if (type === 'accident' || type === 'health') {
      setTimeout(() => {
        if (confirm('Deseja ligar para a central de emergência?')) {
          callEmergency('559392059914');
        }
      }, 1000);
    }
    
    return emergencyData;
  } catch (error) {
    console.error('Erro ao reportar emergência:', error);
    showNotification('error', 'Erro ao reportar emergência. Tente novamente.');
    throw error;
  }
}

/**
 * Enviar notificação de emergência
 */
function sendEmergencyNotification(emergencyData) {
  const emergencyTypes = {
    accident: '🚨 ACIDENTE',
    breakdown: '🛠️ AVARIA NO VEÍCULO',
    health: '🏥 PROBLEMA DE SAÚDE',
    security: '🛡️ PROBLEMA DE SEGURANÇA'
  };
  
  const title = emergencyTypes[emergencyData.type] || '🚨 EMERGÊNCIA';
  const message = `${emergencyData.userId} - ${emergencyData.details || 'Sem detalhes'}`;
  
  // Enviar notificação push
  sendPushNotification(title, message, {
    tag: 'emergency',
    requireInteraction: true,
    actions: [
      { action: 'view', title: 'Ver Detalhes' },
      { action: 'call', title: 'Ligar' }
    ]
  });
  
  // Aqui você também enviaria para o WhatsApp/SMS
  sendWhatsAppEmergency(emergencyData);
}

/**
 * Enviar emergência para WhatsApp
 */
function sendWhatsAppEmergency(emergencyData) {
  const phone = '559392059914'; // Seu número
  const message = encodeURIComponent(
    `🚨 *EMERGÊNCIA REPORTADA* 🚨\n\n` +
    `*Tipo:* ${emergencyData.type}\n` +
    `*Usuário:* ${emergencyData.userId}\n` +
    `*Detalhes:* ${emergencyData.details || 'Não informado'}\n` +
    `*Localização:* https://maps.google.com/?q=${emergencyData.location.lat},${emergencyData.location.lng}\n` +
    `*Horário:* ${new Date(emergencyData.timestamp).toLocaleString('pt-BR')}`
  );
  
  const url = `https://wa.me/${phone}?text=${message}`;
  
  // Abrir em nova aba (opcional)
  setTimeout(() => {
    window.open(url, '_blank');
  }, 2000);
}

/**
 * Ligar para emergência
 */
function callEmergency(phoneNumber) {
  window.location.href = `tel:${phoneNumber}`;
}

// =============================================
// FUNÇÕES DE FEEDBACK
// =============================================

/**
 * Enviar feedback
 */
async function submitFeedback(feedbackData) {
  try {
    const userProfile = localStorage.getItem('user_profile');
    const userId = localStorage.getItem('driver_matricula') || 'anonymous';
    
    const feedback = {
      ...feedbackData,
      userId: userId,
      userType: userProfile,
      status: 'pending',
      timestamp: new Date().toISOString(),
      read: false
    };
    
    // Salvar no Firebase
    if (firebaseInitialized) {
      await db.collection('feedbacks').add({
        ...feedback,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // Salvar localmente
      const feedbacks = JSON.parse(localStorage.getItem('feedbacks') || '[]');
      feedbacks.push(feedback);
      localStorage.setItem('feedbacks', JSON.stringify(feedbacks));
    }
    
    showNotification('success', 'Feedback enviado com sucesso!');
    return feedback;
  } catch (error) {
    console.error('Erro ao enviar feedback:', error);
    showNotification('error', 'Erro ao enviar feedback. Tente novamente.');
    throw error;
  }
}

/**
 * Carregar feedbacks
 */
async function loadFeedbacks(filters = {}) {
  try {
    let feedbacks = [];
    
    if (firebaseInitialized) {
      let query = db.collection('feedbacks');
      
      // Aplicar filtros
      if (filters.type) {
        query = query.where('type', '==', filters.type);
      }
      
      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }
      
      const snapshot = await query.orderBy('timestamp', 'desc').limit(50).get();
      feedbacks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      // Carregar do localStorage
      feedbacks = JSON.parse(localStorage.getItem('feedbacks') || '[]');
      
      // Aplicar filtros localmente
      if (filters.type) {
        feedbacks = feedbacks.filter(f => f.type === filters.type);
      }
      
      if (filters.status) {
        feedbacks = feedbacks.filter(f => f.status === filters.status);
      }
      
      // Ordenar por timestamp
      feedbacks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
    
    return feedbacks;
  } catch (error) {
    console.error('Erro ao carregar feedbacks:', error);
    return [];
  }
}

// =============================================
// FUNÇÕES DE ESCALA
// =============================================

/**
 * Carregar escala do motorista
 */
async function loadDriverSchedule(driverId) {
  try {
    let schedule = null;
    
    if (firebaseInitialized) {
      const doc = await db.collection('schedules').doc(driverId).get();
      if (doc.exists) {
        schedule = doc.data();
      }
    } else {
      // Carregar do localStorage
      const schedules = JSON.parse(localStorage.getItem('schedules') || '{}');
      schedule = schedules[driverId] || null;
    }
    
    // Se não houver escala, criar uma padrão
    if (!schedule) {
      schedule = createDefaultSchedule(driverId);
    }
    
    return schedule;
  } catch (error) {
    console.error('Erro ao carregar escala:', error);
    return createDefaultSchedule(driverId);
  }
}

/**
 * Criar escala padrão
 */
function createDefaultSchedule(driverId) {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  const schedule = {
    driverId: driverId,
    month: currentMonth,
    year: currentYear,
    days: {},
    createdAt: new Date().toISOString()
  };
  
  // Criar escala padrão (5 dias trabalhando, 2 folgas)
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentYear, currentMonth, day);
    const dayOfWeek = date.getDay();
    
    // Folgas aos domingos e uma aleatória durante a semana
    const isDayOff = dayOfWeek === 0 || (day % 7 === 3); // Folga aos domingos e toda quarta
    
    schedule.days[day] = {
      working: !isDayOff,
      shift: isDayOff ? null : '08:00 - 17:00',
      type: isDayOff ? 'off' : 'work',
      notes: isDayOff ? 'Folga' : 'Turno normal'
    };
  }
  
  // Salvar localmente
  const schedules = JSON.parse(localStorage.getItem('schedules') || '{}');
  schedules[driverId] = schedule;
  localStorage.setItem('schedules', JSON.stringify(schedules));
  
  return schedule;
}

/**
 * Salvar escala
 */
async function saveSchedule(driverId, schedule) {
  try {
    if (firebaseInitialized) {
      await db.collection('schedules').doc(driverId).set(schedule, { merge: true });
    } else {
      // Salvar localmente
      const schedules = JSON.parse(localStorage.getItem('schedules') || '{}');
      schedules[driverId] = schedule;
      localStorage.setItem('schedules', JSON.stringify(schedules));
    }
    
    showNotification('success', 'Escala salva com sucesso!');
    return true;
  } catch (error) {
    console.error('Erro ao salvar escala:', error);
    showNotification('error', 'Erro ao salvar escala.');
    return false;
  }
}

// =============================================
// FUNÇÕES DE GEOFENCING
// =============================================

/**
 * Configurar geofencing para uma rota
 */
function setupGeofencing(routeId, coordinates, radius = 500) {
  const geofence = {
    routeId: routeId,
    center: coordinates,
    radius: radius, // em metros
    active: true,
    lastCheck: null,
    violations: []
  };
  
  // Salvar configuração
  const geofences = JSON.parse(localStorage.getItem('geofences') || '{}');
  geofences[routeId] = geofence;
  localStorage.setItem('geofences', JSON.stringify(geofences));
  
  // Iniciar monitoramento
  startGeofenceMonitoring(routeId, geofence);
  
  return geofence;
}

/**
 * Monitorar geofencing
 */
function startGeofenceMonitoring(routeId, geofence) {
  if (AppState.geofenceInterval) {
    clearInterval(AppState.geofenceInterval);
  }
  
  AppState.geofenceInterval = setInterval(async () => {
    try {
      const location = await getCurrentLocation();
      const isInside = checkIfInsideGeofence(location, geofence);
      
      if (!isInside && AppState.userProfile === 'motorista') {
        // Motorista saiu da rota
        const violation = {
          routeId: routeId,
          location: location,
          timestamp: new Date().toISOString(),
          distance: calculateDistance(location, geofence.center)
        };
        
        geofence.violations.push(violation);
        
        // Atualizar localStorage
        const geofences = JSON.parse(localStorage.getItem('geofences') || '{}');
        geofences[routeId] = geofence;
        localStorage.setItem('geofences', JSON.stringify(geofences));
        
        // Notificar admin
        notifyGeofenceViolation(violation);
      }
      
      geofence.lastCheck = new Date().toISOString();
    } catch (error) {
      console.error('Erro no monitoramento de geofencing:', error);
    }
  }, 60000); // Verificar a cada minuto
}

/**
 * Verificar se está dentro do geofence
 */
function checkIfInsideGeofence(location, geofence) {
  const distance = calculateDistance(location, geofence.center);
  return distance <= geofence.radius;
}

/**
 * Calcular distância entre dois pontos (Haversine)
 */
function calculateDistance(point1, point2) {
  const R = 6371e3; // Raio da Terra em metros
  const φ1 = point1.lat * Math.PI / 180;
  const φ2 = point2.lat * Math.PI / 180;
  const Δφ = (point2.lat - point1.lat) * Math.PI / 180;
  const Δλ = (point2.lng - point1.lng) * Math.PI / 180;
  
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c; // Distância em metros
}

/**
 * Notificar violação de geofence
 */
function notifyGeofenceViolation(violation) {
  const message = `🚨 Motorista saiu da rota!\n` +
                  `Rota: ${violation.routeId}\n` +
                  `Distância: ${Math.round(violation.distance)}m\n` +
                  `Horário: ${new Date(violation.timestamp).toLocaleTimeString('pt-BR')}`;
  
  // Enviar notificação push para admin
  sendPushNotification('🚨 Desvio de Rota', message, {
    tag: 'geofence-violation',
    requireInteraction: true
  });
  
  // Aqui você também poderia enviar para WhatsApp/SMS
  console.warn('Violação de geofence:', violation);
}

// =============================================
// FUNÇÕES DE SINCRONIZAÇÃO
// =============================================

/**
 * Sincronizar dados offline
 */
async function syncOfflineData() {
  try {
    // Verificar conexão
    if (!navigator.onLine) {
      console.log('Sem conexão, mantendo dados offline');
      return;
    }
    
    // Sincronizar emergências
    const emergencies = JSON.parse(localStorage.getItem('emergencies') || '[]');
    if (emergencies.length > 0 && firebaseInitialized) {
      for (const emergency of emergencies) {
        await db.collection('emergencies').add({
          ...emergency,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          synced: true
        });
      }
      localStorage.removeItem('emergencies');
    }
    
    // Sincronizar feedbacks
    const feedbacks = JSON.parse(localStorage.getItem('feedbacks') || '[]');
    if (feedbacks.length > 0 && firebaseInitialized) {
      for (const feedback of feedbacks) {
        await db.collection('feedbacks').add({
          ...feedback,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          synced: true
        });
      }
      localStorage.removeItem('feedbacks');
    }
    
    // Sincronizar controles de veículo
    const controls = JSON.parse(localStorage.getItem('vehicle_controls') || '[]');
    if (controls.length > 0 && firebaseInitialized) {
      for (const control of controls) {
        await db.collection('vehicle_controls').add({
          ...control,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          synced: true
        });
      }
      localStorage.removeItem('vehicle_controls');
    }
    
    showNotification('success', 'Dados sincronizados com sucesso!');
  } catch (error) {
    console.error('Erro na sincronização:', error);
    showNotification('warning', 'Alguns dados não foram sincronizados');
  }
}

// =============================================
// FUNÇÕES DE INICIALIZAÇÃO POR PÁGINA
// =============================================

/**
 * Inicializar página do motorista
 */
function initDriverPage() {
  // Verificar se usuário está logado como motorista
  const userProfile = localStorage.getItem('user_profile');
  const matricula = localStorage.getItem('driver_matricula');
  
  if (userProfile !== 'motorista' || !matricula) {
    window.location.href = 'index.html';
    return;
  }
  
  // Configurar Service Worker para notificações
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
      .then(() => console.log('Service Worker registrado'))
      .catch(err => console.warn('Service Worker não registrado:', err));
  }
  
  // Solicitar permissão para notificações
  requestNotificationPermission();
  
  // Configurar geofencing se tiver rota selecionada
  const selectedRoute = localStorage.getItem('selected_route');
  if (selectedRoute) {
    // Aqui você carregaria as coordenadas da rota do banco de dados
    // Por enquanto, usaremos coordenadas simuladas
    const routeCoordinates = {
      lat: -2.442, // Santarém
      lng: -54.708
    };
    
    setupGeofencing(selectedRoute, routeCoordinates, 1000);
  }
  
  // Iniciar sincronização periódica
  setInterval(syncOfflineData, 300000); // A cada 5 minutos
  
  // Atualizar clima periodicamente
  setInterval(updateWeatherDisplay, 1800000); // A cada 30 minutos
  
  console.log('Página do motorista inicializada');
}

/**
 * Inicializar página do passageiro
 */
function initPassengerPage() {
  const userProfile = localStorage.getItem('user_profile');
  
  if (userProfile !== 'passageiro') {
    window.location.href = 'index.html';
    return;
  }
  
  // Configurar Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js');
  }
  
  // Solicitar permissão para notificações
  requestNotificationPermission();
  
  console.log('Página do passageiro inicializada');
}

/**
 * Inicializar página do admin
 */
function initAdminPage() {
  const userProfile = localStorage.getItem('user_profile');
  
  if (userProfile !== 'admin') {
    window.location.href = 'index.html';
    return;
  }
  
  // Configurar Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js');
  }
  
  // Carregar dados iniciais
  loadAdminData();
  
  console.log('Página do admin inicializada');
}

/**
 * Carregar dados do admin
 */
async function loadAdminData() {
  try {
    // Carregar estatísticas
    const stats = await getAdminStats();
    updateAdminStats(stats);
    
    // Carregar emergências pendentes
    const emergencies = await loadEmergencies('pending');
    updateEmergenciesList(emergencies);
    
    // Carregar feedbacks recentes
    const feedbacks = await loadFeedbacks({ status: 'pending' });
    updateFeedbacksList(feedbacks);
    
  } catch (error) {
    console.error('Erro ao carregar dados do admin:', error);
  }
}

/**
 * Obter estatísticas do admin
 */
async function getAdminStats() {
  try {
    let stats = {
      activeDrivers: 0,
      activeRoutes: 0,
      pendingEmergencies: 0,
      newFeedbacks: 0
    };
    
    if (firebaseInitialized) {
      // Contar motoristas ativos (últimas 2 horas)
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const driversSnapshot = await db.collection('locations')
        .where('timestamp', '>', twoHoursAgo)
        .where('userType', '==', 'motorista')
        .get();
      
      const uniqueDrivers = new Set();
      driversSnapshot.forEach(doc => {
        uniqueDrivers.add(doc.data().userId);
      });
      
      stats.activeDrivers = uniqueDrivers.size;
      
      // Contar rotas ativas
      const routesSnapshot = await db.collection('locations')
        .where('timestamp', '>', twoHoursAgo)
        .where('route', '!=', null)
        .get();
      
      const activeRoutes = new Set();
      routesSnapshot.forEach(doc => {
        const route = doc.data().route;
        if (route) activeRoutes.add(route);
      });
      
      stats.activeRoutes = activeRoutes.size;
      
      // Contar emergências pendentes
      const emergenciesSnapshot = await db.collection('emergencies')
        .where('status', '==', 'pending')
        .get();
      
      stats.pendingEmergencies = emergenciesSnapshot.size;
      
      // Contar feedbacks não lidos
      const feedbacksSnapshot = await db.collection('feedbacks')
        .where('read', '==', false)
        .get();
      
      stats.newFeedbacks = feedbacksSnapshot.size;
    } else {
      // Dados simulados para desenvolvimento
      stats = {
        activeDrivers: 6,
        activeRoutes: 4,
        pendingEmergencies: 0,
        newFeedbacks: 3
      };
    }
    
    return stats;
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    return {
      activeDrivers: 0,
      activeRoutes: 0,
      pendingEmergencies: 0,
      newFeedbacks: 0
    };
  }
}

// =============================================
// FUNÇÕES DE CONTROLE DE VEÍCULO
// =============================================

/**
 * Registrar entrada/saída
 */
async function recordVehicleControl(type) {
  try {
    const userProfile = localStorage.getItem('user_profile');
    const userId = localStorage.getItem('driver_matricula');
    
    if (userProfile !== 'motorista' || !userId) {
      throw new Error('Apenas motoristas podem registrar controles');
    }
    
    const now = new Date();
    const controlData = {
      userId: userId,
      type: type, // 'entry' ou 'exit'
      timestamp: now.toISOString(),
      date: now.toLocaleDateString('pt-BR'),
      time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      location: AppState.currentLocation,
      route: localStorage.getItem('selected_route') || null,
      synced: false
    };
    
    // Salvar localmente primeiro
    const controls = JSON.parse(localStorage.getItem('vehicle_controls') || '[]');
    controls.push(controlData);
    localStorage.setItem('vehicle_controls', JSON.stringify(controls));
    
    // Atualizar último controle
    localStorage.setItem('last_control', `${type === 'entry' ? 'Entrada' : 'Saída'} ${controlData.time}`);
    
    // Tentar sincronizar com Firebase
    if (firebaseInitialized) {
      await db.collection('vehicle_controls').add({
        ...controlData,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        synced: true
      });
      
      // Remover do localStorage após sincronização bem-sucedida
      const updatedControls = controls.filter(c => c.timestamp !== controlData.timestamp);
      localStorage.setItem('vehicle_controls', JSON.stringify(updatedControls));
    }
    
    // Mostrar confirmação
    const message = type === 'entry' 
      ? `Entrada registrada às ${controlData.time}`
      : `Saída registrada às ${controlData.time}`;
    
    showNotification('success', message);
    
    // Atualizar UI
    updateControlHistory();
    
    return controlData;
  } catch (error) {
    console.error('Erro ao registrar controle:', error);
    showNotification('error', 'Erro ao registrar. Os dados foram salvos offline.');
    throw error;
  }
}

/**
 * Atualizar histórico de controles
 */
function updateControlHistory() {
  const controls = JSON.parse(localStorage.getItem('vehicle_controls') || '[]');
  const historyElement = document.getElementById('controlHistory');
  
  if (!historyElement) return;
  
  if (controls.length === 0) {
    historyElement.innerHTML = '<p class="empty-history">Nenhum registro encontrado</p>';
    return;
  }
  
  // Ordenar por data mais recente
  controls.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  // Limitar aos últimos 10 registros
  const recentControls = controls.slice(0, 10);
  
  historyElement.innerHTML = recentControls.map(control => `
    <div class="control-record">
      <div class="control-type ${control.type}">
        <i class="fas fa-${control.type === 'entry' ? 'sign-in-alt' : 'sign-out-alt'}"></i>
        <span>${control.type === 'entry' ? 'Entrada' : 'Saída'}</span>
      </div>
      <div class="control-details">
        <span>${control.date} às ${control.time}</span>
        ${control.route ? `<small>Rota: ${control.route}</small>` : ''}
      </div>
      <div class="control-status ${control.synced ? 'synced' : 'pending'}">
        <i class="fas fa-${control.synced ? 'cloud' : 'wifi-slash'}"></i>
      </div>
    </div>
  `).join('');
}

// =============================================
// FUNÇÕES DE AVISOS
// =============================================

/**
 * Carregar avisos
 */
async function loadNotices(audience = null) {
  try {
    let notices = [];
    
    if (firebaseInitialized) {
      let query = db.collection('notices')
        .where('active', '==', true);
      
      if (audience) {
        query = query.where('audience', 'array-contains', audience);
      }
      
      const snapshot = await query.orderBy('createdAt', 'desc').limit(20).get();
      notices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      // Carregar avisos padrão
      notices = getDefaultNotices(audience);
    }
    
    // Marcar avisos não lidos
    const readNotices = JSON.parse(localStorage.getItem('read_notices') || '[]');
    notices.forEach(notice => {
      notice.read = readNotices.includes(notice.id);
    });
    
    return notices;
  } catch (error) {
    console.error('Erro ao carregar avisos:', error);
    return getDefaultNotices(audience);
  }
}

/**
 * Obter avisos padrão
 */
function getDefaultNotices(audience = null) {
  const allNotices = [
    {
      id: '1',
      title: 'Manutenção Rota 02',
      content: 'A Rota 02 está com desvio devido a obras na Av. Principal. Use rota alternativa.',
      type: 'urgent',
      audience: ['motorista', 'passageiro'],
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      active: true
    },
    {
      id: '2',
      title: 'Nova Escala Disponível',
      content: 'A escala de setembro já está disponível na área do motorista.',
      type: 'info',
      audience: ['motorista'],
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      active: true
    },
    {
      id: '3',
      title: 'Horários Alterados',
      content: 'A partir de segunda-feira, os horários das rotas 01 e 03 serão ajustados.',
      type: 'warning',
      audience: ['passageiro'],
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      active: true
    }
  ];
  
  if (!audience) return allNotices;
  
  return allNotices.filter(notice => 
    notice.audience.includes(audience) && notice.active
  );
}

/**
 * Marcar aviso como lido
 */
function markNoticeAsRead(noticeId) {
  const readNotices = JSON.parse(localStorage.getItem('read_notices') || '[]');
  if (!readNotices.includes(noticeId)) {
    readNotices.push(noticeId);
    localStorage.setItem('read_notices', JSON.stringify(readNotices));
  }
}

/**
 * Criar novo aviso (admin)
 */
async function createNotice(noticeData) {
  try {
    if (!firebaseInitialized) {
      throw new Error('Firebase não configurado');
    }
    
    const notice = {
      ...noticeData,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      active: true,
      readBy: []
    };
    
    await db.collection('notices').add(notice);
    
    // Enviar notificação push para os destinatários
    sendNoticeNotification(notice);
    
    showNotification('success', 'Aviso publicado com sucesso!');
    return notice;
  } catch (error) {
    console.error('Erro ao criar aviso:', error);
    showNotification('error', 'Erro ao publicar aviso.');
    throw error;
  }
}

/**
 * Enviar notificação do aviso
 */
function sendNoticeNotification(notice) {
  const audienceText = notice.audience.includes('motorista') && notice.audience.includes('passageiro')
    ? 'Todos os usuários'
    : notice.audience.includes('motorista')
    ? 'Motoristas'
    : 'Passageiros';
  
  sendPushNotification(`📢 ${notice.title}`, notice.content, {
    tag: `notice-${notice.id}`,
    data: { noticeId: notice.id }
  });
}

// =============================================
// FUNÇÕES DE EXPORTAÇÃO
// =============================================

/**
 * Exportar dados para Excel
 */
function exportToExcel(data, filename = 'dados.xlsx') {
  // Implementação simplificada - em produção, use uma biblioteca como SheetJS
  let csv = '';
  
  // Cabeçalhos
  const headers = Object.keys(data[0] || {});
  csv += headers.join(';') + '\n';
  
  // Dados
  data.forEach(item => {
    const row = headers.map(header => {
      const value = item[header];
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      return value || '';
    });
    csv += row.join(';') + '\n';
  });
  
  // Criar e baixar arquivo
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (navigator.msSaveBlob) {
    // Para IE
    navigator.msSaveBlob(blob, filename);
  } else {
    // Para outros navegadores
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  showNotification('success', `Arquivo ${filename} baixado com sucesso!`);
}

// =============================================
// EVENT LISTENERS GLOBAIS
// =============================================

// Detectar mudança de conexão
window.addEventListener('online', () => {
  showNotification('success', 'Conexão restabelecida. Sincronizando dados...');
  syncOfflineData();
});

window.addEventListener('offline', () => {
  showNotification('warning', 'Você está offline. Os dados serão salvos localmente.');
});

// Fechar modais com ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeAllModals();
  }
});

// Fechar modal ao clicar fora
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-back')) {
    closeModal(e.target.id);
  }
});

// =============================================
// INICIALIZAÇÃO DA APLICAÇÃO
// =============================================

// Quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
  console.log('AC Transporte - Sistema inicializado');
  
  // Inicializar tema escuro
  initDarkMode();
  
  // Verificar Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js')
        .then(registration => {
          console.log('ServiceWorker registrado com sucesso:', registration.scope);
        })
        .catch(error => {
          console.log('ServiceWorker falhou:', error);
        });
    });
  }
  
  // Configurar Firebase se disponível
  if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
    firebaseInitialized = true;
    console.log('Firebase configurado');
    
    // Configurar auth state listener
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        AppState.currentUser = user;
        console.log('Usuário autenticado:', user.uid);
      } else {
        console.log('Nenhum usuário autenticado');
      }
    });
  }
  
  // Detectar página atual e inicializar funcionalidades específicas
  const path = window.location.pathname;
  const page = path.split('/').pop();
  
  switch(page) {
    case 'motorista.html':
      initDriverPage();
      break;
    case 'passageiro.html':
      initPassengerPage();
      break;
    case 'admin.html':
      initAdminPage();
      break;
    case 'index.html':
      // Página inicial já inicializada
      break;
    default:
      console.log('Página não reconhecida:', page);
  }
});

// =============================================
// FUNÇÕES GLOBAIS DISPONÍVEIS
// =============================================

// Tornar funções importantes disponíveis globalmente
window.AppState = AppState;
window.showNotification = showNotification;
window.openModal = openModal;
window.closeModal = closeModal;
window.closeAllModals = closeAllModals;
window.getCurrentLocation = getCurrentLocation;
window.startLocationSharing = startLocationSharing;
window.stopLocationSharing = stopLocationSharing;
window.reportEmergency = reportEmergency;
window.submitFeedback = submitFeedback;
window.recordVehicleControl = recordVehicleControl;
window.updateControlHistory = updateControlHistory;
window.loadNotices = loadNotices;
window.markNoticeAsRead = markNoticeAsRead;
window.exportToExcel = exportToExcel;
window.syncOfflineData = syncOfflineData;
