import React, { useState } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function AdminPDF({ allRecords, calcDay, calcExtra, calcDelay, formatTime }) {
  const [mesSelecionado, setMesSelecionado] = useState("");

  const gerarPDF = () => {
    if (!mesSelecionado) return;

    const registrosFiltrados = allRecords.filter((r) => {
      const month = new Date(r.date).getMonth() + 1;
      return month === parseInt(mesSelecionado);
    });

    if (!registrosFiltrados.length) {
      alert("Não há registros para este mês!");
      return;
    }

    const doc = new jsPDF();
    doc.text(`Relatório - Mês ${mesSelecionado}`, 14, 20);

    const tabela = registrosFiltrados.map((r) => [
      r.email,
      r.date,
      formatTime(calcDay(r)),
      formatTime(calcExtra(r)),
      formatTime(calcDelay(r)),
    ]);

    doc.autoTable({
      head: [["Email", "Data", "Total", "Extra", "Atraso"]],
      body: tabela,
      startY: 30,
    });

    doc.save(`relatorio_mes_${mesSelecionado}.pdf`);
  };

  return (
    <div style={{ marginTop: 20 }}>
      <label>
        Selecione o mês:
        <select
          value={mesSelecionado}
          onChange={(e) => setMesSelecionado(e.target.value)}
          style={{ marginLeft: 10 }}
        >
          <option value="">--Selecione--</option>
          {[...Array(12).keys()].map((m) => (
            <option key={m + 1} value={m + 1}>
              {new Date(0, m).toLocaleString("pt-BR", { month: "long" })}
            </option>
          ))}
        </select>
      </label>

      <button
        onClick={gerarPDF}
        style={{ display: "block", marginTop: 10, padding: "8px 16px" }}
        disabled={!mesSelecionado || allRecords.length === 0}
      >
        Gerar PDF do mês
      </button>
    </div>
  );
}
