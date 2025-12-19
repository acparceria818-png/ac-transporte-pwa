// js/utils.js - Funções utilitárias
export function showLoading(message = 'Carregando...') {
  const overlay = document.getElementById('loadingOverlay');
  const text = document.getElementById('loadingText');
  
  if (overlay) {
    overlay.style.display = 'flex';
    if (text) text.textContent = message;
  }
}

export function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.style.display = 'none';
}

export function showToast(type, message, duration = 3000) {
  // Usar Toastify.js para notificações bonitas
  Toastify({
    text: message,
    duration: duration,
    gravity: "top",
    position: "right",
    backgroundColor: type === 'success' ? '#4CAF50' : 
                    type === 'error' ? '#F44336' : 
                    type === 'warning' ? '#FF9800' : '#2196F3',
    stopOnFocus: true
  }).showToast();
}

export async function showConfirm(title, text, confirmText = 'Confirmar', cancelText = 'Cancelar') {
  return Swal.fire({
    title: title,
    text: text,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: '#b00000',
    cancelButtonColor: '#6c757d'
  }).then((result) => result.isConfirmed);
}

// Formatar data
export function formatDate(date, includeTime = true) {
  const d = new Date(date);
  const formatted = d.toLocaleDateString('pt-BR');
  
  if (includeTime) {
    return `${formatted} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  return formatted;
}

// Calcular tempo decorrido
export function timeAgo(date) {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Agora mesmo';
  if (diffMins < 60) return `${diffMins} min atrás`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h atrás`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d atrás`;
}

// Validar e-mail
export function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Debounce function
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle function
export function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Armazenamento offline
export class OfflineStorage {
  constructor(key) {
    this.key = key;
  }
  
  save(data) {
    try {
      localStorage.setItem(this.key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Erro ao salvar offline:', error);
      return false;
    }
  }
  
  load() {
    try {
      const data = localStorage.getItem(this.key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Erro ao carregar offline:', error);
      return null;
    }
  }
  
  clear() {
    localStorage.removeItem(this.key);
  }
}

// Formatar número
export function formatNumber(num, decimals = 2) {
  return Number(num).toFixed(decimals).replace('.', ',');
}

// Gerar ID único
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
