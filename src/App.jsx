import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs
} from "firebase/firestore";
import * as XLSX from "xlsx";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCF7_bp96i5TkvQEcuQ90aB0GUwBnzG3bU",
  authDomain: "ponto-das-haus.firebaseapp.com",
  projectId: "ponto-das-haus",
  storageBucket: "ponto-das-haus.firebasestorage.app",
  messagingSenderId: "834005685410",
  appId: "1:834005685410:web:230bef03092a4c2b9b73fb"
};

// ADMIN EMAIL (troque se precisar)
const ADMIN_EMAIL = "admin@dashaus.com";

// Init Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);

  const [records, setRecords] = useState([]);
  const [allRecords, setAllRecords] = useState([]);

  const [in1, setIn1] = useState("");
  const [out1, setOut1] = useState("");
  const [in2, setIn2] = useState("");
  const [out2, setOut2] = useState("");

  useEffect(() => {
    onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);

      if (u) {
        loadRecords(u.uid);
        if (u.email === ADMIN_EMAIL) loadAllRecords();
      }
    });
  }, []);

  // AUTH
  const login = async () => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async () => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  // SAVE POINT
  const saveRecord = async () => {
    if (!user) return;

    if (!in1 || !out1 || !in2 || !out2) {
      alert("Preencha todos os horários antes de salvar.");
      return;
    }

    try {
      const today = new Date().toISOString().slice(0, 10);

      await addDoc(collection(db, "records"), {
        uid: user.uid,
        email: user.email,
        date: today,
        in1,
        out1,
        in2,
        out2,
        created: new Date()
      });

      alert("Ponto salvo com sucesso! ✅");

      setIn1("");
      setOut1("");
      setIn2("");
      setOut2("");

      loadRecords(user.uid);

      if (user.email === ADMIN_EMAIL) loadAllRecords();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar. Verifique a internet.");
    }
  };

  // LOAD USER RECORDS
  const loadRecords = async (uid) => {
    const q = query(collection(db, "records"), where("uid", "==", uid));
    const snap = await getDocs(q);

    const data = snap.docs.map((d) => ({
      id: d.id,
      ...d.data()
    }));

    setRecords(data);
  };

  // LOAD ALL (ADMIN)
  const loadAllRecords = async () => {
    const snap = await getDocs(collection(db, "records"));

    const data = snap.docs.map((d) => ({
      id: d.id,
      ...d.data()
    }));

    setAllRecords(data);
  };

  // UTILS
  const parseTime = (t) => {
    if (!t) return 0;
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const calcDay = (r) => {
    return (
      (parseTime(r.out1) - parseTime(r.in1)) +
      (parseTime(r.out2) - parseTime(r.in2))
    );
  };

  // CALC EXTRA (acima de 8h = 480min)
  // CALC EXTRA (acima de 8h48 = 528min)
  // CALC EXTRA (acima de 8h48 = 528min)
  const formatTime = (min) => {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);

  return `${h}h${String(m).padStart(2, "0")}`;
};

  // TOTAL EXTRA DO MÊS (CORRIGIDO)
const calcMonthExtra = (data) => {
  const now = new Date();
  const ym =
    now.getFullYear() +
    "-" +
    String(now.getMonth() + 1).padStart(2, "0");

  return data
    .filter((r) => r.date.startsWith(ym))
    .reduce((sum, r) => sum + calcExtra(r), 0);
};


  // EXPORT EXCEL
  const exportExcel = (data, name) => {
    const sheet = data.map((r) => ({
      Email: r.email,
      Data: r.date,
      Entrada1: r.in1,
      Saida1: r.out1,
      Entrada2: r.in2,
      Saida2: r.out2,
      TotalHoras: (calcDay(r) / 60).toFixed(2)
    }));

    const ws = XLSX.utils.json_to_sheet(sheet);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Ponto");
    XLSX.writeFile(wb, name);
  };

  if (loading) return <p>Carregando...</p>;

  // LOGIN
  if (!user) {
    return (
      <div style={{ padding: 30, fontFamily: "Arial" }}>
        <h2>Ponto Das Haus Marcenaria</h2>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <br /><br />

        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <br /><br />

        <button onClick={login}>Entrar</button>
        <button onClick={register} style={{ marginLeft: 10 }}>
          Cadastrar
        </button>
      </div>
    );
  }

  const isAdmin = user.email === ADMIN_EMAIL;

  // SISTEMA
  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h2>Ponto Das Haus Marcenaria</h2>
      <p>Usuário: {user.email}</p>

      {isAdmin && <p style={{ color: "green" }}>Administrador</p>}

      <button onClick={logout}>Sair</button>

      <hr />

      <h3>Bater Ponto</h3>

      <input type="time" value={in1} onChange={(e) => setIn1(e.target.value)} />
      Entrada 1

      <br /><br />

      <input type="time" value={out1} onChange={(e) => setOut1(e.target.value)} />
      Saída 1

      <br /><br />

      <input type="time" value={in2} onChange={(e) => setIn2(e.target.value)} />
      Entrada 2

      <br /><br />

      <input type="time" value={out2} onChange={(e) => setOut2(e.target.value)} />
      Saída 2

      <br /><br />

      <button onClick={saveRecord}>Salvar Ponto</button>

      <hr />

      <h3>Meus Registros</h3>

      <p>
        Hora extra do mês: <strong>{formatTime(calcMonthExtra(records))}</strong>
      </p>

      {records.map((r) => (
        <div key={r.id}>
          {r.date} → {(calcDay(r)/60).toFixed(2)}h | Extra: {formatTime(calcExtra(r))}

        </div>
      ))}

      <br />

      <button onClick={() => exportExcel(records, "meu_ponto.xlsx")}>
        Exportar Meu Excel
      </button>

      {/* ADMIN PANEL */}
      {isAdmin && (
        <>
          <hr />

          <h2>Painel do Administrador</h2>

          <p>Total de registros: {allRecords.length}</p>

          <button
            onClick={() => exportExcel(allRecords, "ponto_geral_empresa.xlsx")}
            style={{ background: "#4CAF50", color: "white", padding: 10 }}
          >
            Exportar Excel Geral
          </button>

          <hr />

          <h3>Todos os Funcionários</h3>

          {allRecords.map((r) => (
            <div
              key={r.id}
              style={{ borderBottom: "1px solid #ccc", padding: 5 }}
            >
              <strong>{r.email}</strong> | {r.date} → {(calcDay(r)/60).toFixed(2)}h | Extra: {(calcExtra(r)/60).toFixed(2)}h
            </div>
          ))}
        </>
      )}
    </div>
  );
}
