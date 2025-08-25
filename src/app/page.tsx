"use client";

import { useState, ClipboardEvent, Fragment, useEffect } from "react";

type Cell = 
  | string
  | { value: string; correct: boolean; rate?: number; unit?: number };


export default function Home() {
  const [rows, setRows] = useState<Cell[][]>([]);

const mainTypesCols = {
  PTFT: [4, 5],       // PTFT FEE NO. & AMOUNT
  "RRTF 1": [7, 8],   // 2-3 WHEELS NO. & AMOUNT
  "RRTF 2": [11, 12], // 4 WHEELS NO. & AMOUNT
  "RRTF 3": [14, 15], // 6 WHEELS NO. & AMOUNT
  "RRTF 4": [17, 18], // 8-10 WHEELS NO. & AMOUNT
} as const;


  const rates: Record<string, number> = {
    PTFT: 30,
    "RRTF 1": 65,
    "RRTF 2": 129,
    "RRTF 3": 258,
    "RRTF 4": 516,
  };

  const handlePaste = (e: ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text/plain").trim();
    if (!pasteData) return;

    const lines = pasteData
      .split(/\r?\n/)
      .map((line) => line.split("\t").map((v) => v.trim()))
      .filter((line) => line.length >= 7);

    const newRows: Cell[][] = [];

    lines.forEach((line) => {
      const service = line[0];
      const rateRaw = line[1].replace(/[^\d.]/g, "");
      const rate = parseFloat(rateRaw) || rates[service] || 0;
      const unit = parseFloat(line[2]) || 0;
      const amountRaw = line[3].replace(/[^\d.]/g, "") || "";
      const amount = parseFloat(amountRaw) || 0;
      const from = line[5] || "";
      const to = line[6] || "";

      if (amount <= 0) return;

      const noValue = from && to ? `${from}-${to}` : from || to;

   const isCorrect = Math.abs(rate * unit - amount) < 0.01;
const formattedAmount: Cell = {
  value: `PHP ${amount.toLocaleString()}`,
  correct: isCorrect,
  rate,
  unit,
};


      if (service in mainTypesCols) {
        const [colNo, colAmount] = mainTypesCols[service as keyof typeof mainTypesCols];

        let row = newRows.find((r) => !r[colNo]);
        if (!row) {
          row = Array(19).fill("") as Cell[];
          newRows.push(row);
        }
        row[colNo] = noValue;
        row[colAmount] = formattedAmount;
      } else {
        const newRow = Array(19).fill("") as Cell[];
        newRow[0] = service;
        newRow[1] = noValue;
        newRow[2] = formattedAmount;
        newRows.push(newRow);
      }
    });

    setRows(newRows);
  };

  const copyValues = () => {
  const totalCols = 19;
  let output = "";

  rows.forEach((row) => {
    const fullRow = Array.from({ length: totalCols }, (_, i) => {
      const cell = row[i] || "";

      if (typeof cell === "string") return cell;

      if (typeof cell === "object" && "value" in cell) {
        // If rate & unit exist, generate formula
        if (cell.rate !== undefined && cell.unit !== undefined) {
          return `=${cell.rate}*${cell.unit}`;
        }
        // Otherwise just remove "PHP "
        return cell.value.replace(/^PHP\s*/i, "");
      }

      return "";
    });

    output += fullRow.join("\t") + "\n";
  });

  if (typeof navigator !== "undefined" && navigator.clipboard) {
    navigator.clipboard.writeText(output).then(() => alert("Values copied!"));
  } else {
    alert("Clipboard API not available. Here's the data:\n\n" + output);
  }
};


  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.altKey && e.key === "Tab") {
        setRows([]);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gray-100 text-black p-4 gap-4">
  
    <div className="text-sm text-gray-700 bg-gray-200 p-2 text-center rounded w-full max-w-5xl mb-2">
    📋 Instructions: Paste your tab-separated data directly into the table below. Amounts will be checked automatically against their rate × units. Correct amounts are highlighted green, incorrect amounts red. Use Alt + R to reset the table. Click &quot;Copy Values&quot; to copy all table data.
      </div>
      <div className="overflow-x-auto border border-black" onPaste={handlePaste}>
        <table className="border-collapse border border-black text-sm w-full">
          <thead>
            <tr>
              <th rowSpan={2} className="border border-black px-4 py-2 bg-gray-200">
                TYPE
              </th>
              <th colSpan={2} className="border border-black px-4 py-2 bg-gray-200">
                SALES INVOICE
              </th>
              <th rowSpan={2} className="border border-black bg-orange-300 px-1 py-1"></th>
              <th colSpan={2} className="border border-black px-4 py-2 bg-gray-200">
                PTFT FEE
              </th>
              <th rowSpan={2} className="border border-black bg-orange-300 px-1 py-1"></th>
              <th colSpan={2} className="border border-black px-4 py-2 bg-gray-200">
                2-3 WHEELS
              </th>
              <th rowSpan={2} className="border border-black bg-orange-300 px-1 py-1"></th>
              <th rowSpan={2} className="border border-black bg-orange-300 px-1 py-1"></th>
              <th colSpan={2} className="border border-black px-4 py-2 bg-gray-200">
                4 WHEELS
              </th>
              <th rowSpan={2} className="border border-black bg-orange-300 px-1 py-1"></th>
              <th colSpan={2} className="border border-black px-4 py-2 bg-gray-200">
                6 WHEELS
              </th>
              <th rowSpan={2} className="border border-black bg-orange-300 px-1 py-1"></th>
              <th colSpan={2} className="border border-black px-4 py-2 bg-gray-200">
                8-10 WHEELS
              </th>
            </tr>
            <tr>
              {Array(6)
                .fill(0)
                .map((_, i) => (
                  <Fragment key={i}>
                    <th className="border border-black px-4 py-2">NO.</th>
                    <th className="border border-black px-4 py-2">AMOUNT</th>
                  </Fragment>
                ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => {
                  let display = "";
                  let bgClass = "";
                  if (typeof cell === "string") {
                    display = cell;
                  } else if (typeof cell === "object" && "value" in cell && "correct" in cell) {
                    display = cell.value;
                    bgClass = cell.correct ? "bg-green-200" : "bg-red-200";
                  }

                  return (
                    <td
                      key={j}
                      className={`border border-black px-4 py-2 ${bgClass}`}
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        const newRows = [...rows];
                        newRows[i][j] = e.currentTarget.textContent || "";
                        setRows(newRows);
                      }}
                    >
                      {display}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        onClick={copyValues}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Copy Values
      </button>
    </div>
  );
}
