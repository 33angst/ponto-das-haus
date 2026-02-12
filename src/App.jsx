// App.jsx
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

// Import para gerar PDF
import jsPDF from "jspdf";
import "jspdf-autotable";

// Import do novo componente PDF
import AdminPDF from "./AdminPDF"; // ajuste se estiver em outra pasta

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCF7_bp96i5TkvQEcuQ90aB0GUwBnzG3bU",
  authDomain: "ponto-das-haus.firebaseapp.com",
  projectId: "ponto-das-haus",
  storageBucket: "ponto-das-haus.firebasestorage.app",
  messagingSenderId: "834005685410",
  appId: "1:834005685410:web:230bef03092a4c2b9b73fb"
};

// ADMIN
const ADMIN_EMAIL = "erickangst1234@gmail.com";

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
      alert("Preencha todos os horários");
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

      alert("Ponto salvo! ✅");

      setIn1("");
      setOut1("");
      setIn2("");
      setOut2("");

      loadRecords(user.uid);
      if (user.email === ADMIN_EMAIL) loadAllRecords();

    } catch (err) {
      console.error(err);
      alert("Erro ao salvar. Verifique internet.");
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
  const EXPECTED_IN = "07:00"; // Horário padrão de entrada
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

  // CALC ATRASO
  const calcDelay = (r) => {
    const expected = parseTime(EXPECTED_IN);
    const real = parseTime(r.in1);

    if (!real || real <= expected) return 0;

    return real - expected;
  };

  // EXTRA (8h48 = 528min)
  const calcExtra = (r) => {
    const total = calcDay(r);
    const normal = 528;
    return total > normal ? total - normal : 0;
  };

  // FORMAT MINUTES
  const formatTime = (min) => {
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return `${h}h${String(m).padStart(2, "0")}`;
  };

  // MONTH EXTRA
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

  // MONTH DELAY (ATRASO DO MÊS)
  const calcMonthDelay = (data) => {
    const now = new Date();
    const ym =
      now.getFullYear() +
      "-" +
      String(now.getMonth() + 1).padStart(2, "0");

    return data
      .filter((r) => r.date.startsWith(ym))
      .reduce((sum, r) => sum + calcDelay(r), 0);
  };

  // EXTRA LÍQUIDO (EXTRA - ATRASO)
  const calcNetExtra = (data) => {
    const extra = calcMonthExtra(data);
    const delay = calcMonthDelay(data);

    const net = extra - delay;
    return net > 0 ? net : 0;
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
      Total: formatTime(calcDay(r)),
      Extra: formatTime(calcExtra(r))
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
      <div style={{ padding: 30 }}>
        <h2>Ponto Das Haus</h2>

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

  // APP
  return (
    <div style={{ padding: 20 }}>
      <h2>Ponto Das Haus</h2>
      <p>{user.email}</p>

      {isAdmin && <p style={{ color: "green" }}>Administrador</p>}

      <button onClick={logout}>Sair</button>

      <hr />

      <h3>Bater Ponto</h3>

      <input type="time" value={in1} onChange={(e) => setIn1(e.target.value)} /> Entrada 1
      <br /><br />

      <input type="time" value={out1} onChange={(e) => setOut1(e.target.value)} /> Saída 1
      <br /><br />

      <input type="time" value={in2} onChange={(e) => setIn2(e.target.value)} /> Entrada 2
      <br /><br />

      <input type="time" value={out2} onChange={(e) => setOut2(e.target.value)} /> Saída 2
      <br /><br />

      <button onClick={saveRecord}>Salvar Ponto</button>

      <hr />

      <h3>Meus Registros</h3>

      <p>
        Hora extra do mês: <strong>{formatTime(calcMonthExtra(records))}</strong><br />
        Atraso do mês: <strong>{formatTime(calcMonthDelay(records))}</strong><br />
        Serão final: <strong>{formatTime(calcNetExtra(records))}</strong>
      </p>

      {records.map((r) => (
        <div key={r.id}>
          {r.date} → {formatTime(calcDay(r))} | Extra: {formatTime(calcExtra(r))} | Atraso: {formatTime(calcDelay(r))}
        </div>
      ))}

      <br />

      <button onClick={() => exportExcel(records, "meu_ponto.xlsx")}>
        Exportar Meu Excel
      </button>

      {isAdmin && (
        <>
          <hr />

          <h2>Painel Admin</h2>

          <button
            onClick={() => exportExcel(allRecords, "ponto_empresa.xlsx")}
            style={{ marginTop: 10, padding: "8px 16px" }}
          >
            Exportar Geral Excel
          </button>

          {/* Componente AdminPDF para gerar PDF por mês */}
          <AdminPDF
            allRecords={allRecords}
            calcDay={calcDay}
            calcExtra={calcExtra}
            calcDelay={calcDelay}
            formatTime={formatTime}
          />

          <hr />

          {allRecords.map((r) => (
            <div key={r.id}>
              <strong>{r.email}</strong> | {r.date} → {formatTime(calcDay(r))} | Extra: {formatTime(calcExtra(r))} | Atraso: {formatTime(calcDelay(r))}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
