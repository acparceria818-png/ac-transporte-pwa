// js/db.js - Comunicação com Firebase
import { 
  db,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp
} from '../firebase.js';

const database = {
  // ========== COLETORES ==========
  async getColaborador(matricula) {
    const docRef = doc(db, 'colaboradores', matricula);
    const snap = await getDoc(docRef);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },
  
  async getAdminByEmail(email) {
    const q = query(collection(db, 'administradores'), where("email", "==", email));
    const snapshot = await getDocs(q);
    return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  },
  
  // ========== ROTAS E ÔNIBUS DINÂMICOS ==========
  async getRotas() {
    const snapshot = await getDocs(collection(db, 'rotas_config'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  
  async getOnibus() {
    const snapshot = await getDocs(collection(db, 'onibus_config'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  
  async getRota(rotaId) {
    const docRef = doc(db, 'rotas_config', rotaId);
    const snap = await getDoc(docRef);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },
  
  // ========== LOCALIZAÇÃO EM TEMPO REAL ==========
  async updateLocalizacao(matricula, dados) {
    const docRef = doc(db, 'rotas_em_andamento', matricula);
    return await setDoc(docRef, {
      ...dados,
      ultimaAtualizacao: serverTimestamp(),
      timestamp: new Date()
    }, { merge: true });
  },
  
  async getMotoristasAtivos() {
    const q = query(
      collection(db, 'rotas_em_andamento'),
      where("ativo", "==", true),
      where("online", "==", true)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  
  async getMotoristasAtivosPorRota(nomeRota) {
    const q = query(
      collection(db, 'rotas_em_andamento'),
      where("rota", "==", nomeRota),
      where("ativo", "==", true),
      where("online", "==", true)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  
  // ========== HISTÓRICO DE ROTAS ==========
  async registrarPontoRota(matricula, ponto) {
    const historicoRef = collection(db, 'historico_rotas');
    return await addDoc(historicoRef, {
      matricula,
      ...ponto,
      timestamp: serverTimestamp()
    });
  },
  
  async getHistoricoRota(matricula, data) {
    const startDate = new Date(data);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(data);
    endDate.setHours(23, 59, 59, 999);
    
    const q = query(
      collection(db, 'historico_rotas'),
      where("matricula", "==", matricula),
      where("timestamp", ">=", startDate),
      where("timestamp", "<=", endDate),
      orderBy("timestamp", "asc")
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  
  // ========== EMERGÊNCIAS ==========
  async registrarEmergencia(dados) {
    return await addDoc(collection(db, 'emergencias'), {
      ...dados,
      timestamp: serverTimestamp()
    });
  },
  
  // ========== AVISOS ==========
  monitorarAvisos(callback) {
    const q = query(collection(db, 'avisos'), where("ativo", "==", true));
    return onSnapshot(q, (snapshot) => {
      const dados = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(dados);
    });
  },
  
  // ========== ESCALAS ==========
  async getEscalas() {
    const snapshot = await getDocs(collection(db, 'escalas'));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  
  async getEscalaPorMatricula(matricula) {
    const q = query(collection(db, 'escalas'), where("matricula", "==", matricula));
    const snapshot = await getDocs(q);
    return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  },
  
  // ========== ADMIN - CRUD ROTAS ==========
  async criarRota(dados) {
    return await addDoc(collection(db, 'rotas_config'), {
      ...dados,
      criadoEm: serverTimestamp()
    });
  },
  
  async atualizarRota(rotaId, dados) {
    const docRef = doc(db, 'rotas_config', rotaId);
    return await updateDoc(docRef, {
      ...dados,
      atualizadoEm: serverTimestamp()
    });
  },
  
  async excluirRota(rotaId) {
    const docRef = doc(db, 'rotas_config', rotaId);
    return await deleteDoc(docRef);
  },
  
  // ========== ADMIN - CRUD ÔNIBUS ==========
  async criarOnibus(dados) {
    return await addDoc(collection(db, 'onibus_config'), {
      ...dados,
      criadoEm: serverTimestamp()
    });
  },
  
  async atualizarOnibus(onibusId, dados) {
    const docRef = doc(db, 'onibus_config', onibusId);
    return await updateDoc(docRef, {
      ...dados,
      atualizadoEm: serverTimestamp()
    });
  },
  
  async excluirOnibus(onibusId) {
    const docRef = doc(db, 'onibus_config', onibusId);
    return await deleteDoc(docRef);
  },
  
  // ========== MONITORAMENTO ==========
  monitorarRotas(callback) {
    return onSnapshot(collection(db, 'rotas_em_andamento'), (snapshot) => {
      const rotas = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(r => r.ativo !== false);
      callback(rotas);
    });
  },
  
  monitorarEmergencias(callback) {
    const q = query(collection(db, 'emergencias'), where("status", "==", "pendente"));
    return onSnapshot(q, (snapshot) => {
      const dados = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(dados);
    });
  },
  
  // ========== ESTATÍSTICAS ==========
  async getEstatisticas() {
    const [
      rotasSnapshot,
      emergenciasSnapshot,
      motoristasSnapshot
    ] = await Promise.all([
      getDocs(collection(db, 'rotas_em_andamento')),
      getDocs(query(collection(db, 'emergencias'), where('status', '==', 'pendente'))),
      getDocs(collection(db, 'colaboradores'))
    ]);
    
    return {
      totalRotasAtivas: rotasSnapshot.docs.filter(d => d.data().ativo !== false).length,
      totalEmergencias: emergenciasSnapshot.docs.length,
      totalMotoristas: motoristasSnapshot.docs.length,
      motoristasOnline: rotasSnapshot.docs.filter(d => d.data().online === true).length
    };
  }
};

export { database as db };
