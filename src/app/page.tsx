"use client";

import { useState, ClipboardEvent, Fragment, useEffect } from "react";
import Image from "next/image";
type Cell =
  | string
  | { value: string; correct: boolean; rate?: number; unit?: number };

export default function Home() {
  const [rows, setRows] = useState<Cell[][]>([]);
  const [showModal, setShowModal] = useState(false);
  const [fingerprint, setFingerprint] = useState<string>("");
  const [toast, setToast] = useState<{ message: string; id: number } | null>(null);
  const [subscription, setSubscription] = useState<{ validUntil?: string } | null>(null);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);


useEffect(() => {
  if (!fingerprint) return;

  fetch(`/api/subscription?fingerprint=${fingerprint}`)
    .then((res) => res.json())
    .then(setSubscription)
    .catch(() => {});
}, [fingerprint]);

  const mainTypesCols = {
    PTFT: [4, 5],
    "RRTF 1": [7, 8],
    "RRTF 2": [11, 12],
    "RRTF 3": [14, 15],
    "RRTF 4": [17, 18],
  } as const;

  const rates: Record<string, number> = {
    PTFT: 30,
    "RRTF 1": 65,
    "RRTF 2": 129,
    "RRTF 3": 258,
    "RRTF 4": 516,
  };

  const showToast = (message: string) => {
    const id = Date.now();
    setToast({ message, id });
    setTimeout(() => setToast((prev) => (prev?.id === id ? null : prev)), 2500);
  };

  useEffect(() => {
  (async () => {
    try {
      const res = await fetch("/api/device/register");
      if (!res.ok) throw new Error("Failed to fetch fingerprint");
      const { fingerprint } = await res.json();
      setFingerprint(fingerprint);
    } catch {
      showToast("Failed to initialize device ID");
    }
  })();
}, []);


  const handlePaste = (e: ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text/plain").trim();
    if (!pasteData) return;

    const lines = pasteData
      .split(/\r?\n/)
      .map((line) => line.split("\t").map((v) => v.trim()))
      .filter((line) => line.some((cell) => cell !== ""));

    const newRows: Cell[][] = [];

    lines.forEach((line) => {
      const service = line[0] ?? "";
      const rateRaw = (line[1] ?? "").replace(/[^\d.]/g, "");
      const rate = parseFloat(rateRaw) || rates[service] || 0;
      const unit = parseFloat(line[2] ?? "") || 0;
      const amountRaw = (line[3] ?? "").replace(/[^\d.]/g, "");
      const amount = parseFloat(amountRaw) || 0;
      const from = line[5] ?? "";
      const to = line[6] ?? "";

      if (amount <= 0) return;

      const noValue = from && to ? `${from}-${to}` : from || to;

      const formattedAmount: Cell = {
        value: `PHP ${amount.toLocaleString()}`,
        correct:
          service !== "Mooring" && service in mainTypesCols
            ? Math.abs(rate * unit - amount) < 0.01
            : true,
        rate: service !== "Mooring" ? rate : undefined,
        unit: service !== "Mooring" ? unit : undefined,
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

  const copyValues = async () => {
    if (!fingerprint) return;

    const hasValues = rows.some(row =>
      row.some(cell => {
        if (typeof cell === "string" && cell.trim() !== "") return true;
        if (typeof cell === "object" && cell?.value?.trim() !== "") return true;
        return false;
      })
    );

    if (!hasValues) {
      showToast("Nothing to copy!");
      return;
    }

    const response = await fetch("/api/transform", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fingerprint, rows }),
    });

    if (response.status === 403) {
      setShowModal(true);
      return;
    }

    if (response.status === 429) {
      showToast(
        "Whoa, slow down ☕! Too many requests. Try again in a minute."
      );
      return;
    }

    const { tsv } = await response.json();
    await navigator.clipboard.writeText(tsv);
    showToast("Copied!");
    setRows([]);
  };


  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center text-black p-4 gap-4">
      <div className="fixed inset-0 -z-10 bg-modern-grid"></div>
      <img
        src="/logo.png"
        alt="Logo"
        className="absolute top-0 left-1/2 -translate-x-1/2 w-150 h-auto"
      />

      <div className="text-gray-800 bg-yellow-50 border border-yellow-300 rounded-xl shadow p-4 text-center max-w-3xl w-full mb-3 mx-auto font-sans">
        {/* Title */}
        <h2 className="text-lg font-bold mb-3 text-yellow-600">
          📋 Instructions
        </h2>

        {/* Content */}
        <p className="text-sm leading-relaxed">
          <span className="font-semibold">1️⃣ Paste</span> your tab-separated data using <kbd className="bg-gray-200 px-1 py-0.5 rounded text-xs">Ctrl + V</kbd>. <br /><br />
          <span className="font-semibold">2️⃣ Amounts</span> auto-check <span className="text-yellow-600 font-semibold">rate × units</span>. Correct = <span className="text-green-500 font-semibold">green</span>, Incorrect = <span className="text-red-500 font-semibold">red</span>. <br /><br />
          <span className="font-semibold">3️⃣ Click</span> <span className="bg-yellow-400 px-2 py-1 rounded font-bold text-xs">Copy</span> to copy all data. <br /><br />
          Enjoy your workflow! ☕
        </p>
        
      </div>

      <div className="overflow-x-auto border border-black" onPaste={handlePaste}>
        <table className="border-collapse border border-black text-sm w-full">
          <thead>
            <tr>
              <th rowSpan={2} className="border border-black px-4 py-2 bg-gray-200">TYPE</th>
              <th colSpan={2} className="border border-black px-4 py-2 bg-gray-200">SALES INVOICE</th>
              <th rowSpan={2} className="border border-black bg-orange-300 px-1 py-1"></th>
              <th colSpan={2} className="border border-black px-4 py-2 bg-gray-200">PTFT FEE</th>
              <th rowSpan={2} className="border border-black bg-orange-300 px-1 py-1"></th>
              <th colSpan={2} className="border border-black px-4 py-2 bg-gray-200">2-3 WHEELS</th>
              <th rowSpan={2} className="border border-black bg-orange-300 px-1 py-1"></th>
              <th rowSpan={2} className="border border-black bg-orange-300 px-1 py-1"></th>
              <th colSpan={2} className="border border-black px-4 py-2 bg-gray-200">4 WHEELS</th>
              <th rowSpan={2} className="border border-black bg-orange-300 px-1 py-1"></th>
              <th colSpan={2} className="border border-black px-4 py-2 bg-gray-200">6 WHEELS</th>
              <th rowSpan={2} className="border border-black bg-orange-300 px-1 py-1"></th>
              <th colSpan={2} className="border border-black px-4 py-2 bg-gray-200">8-10 WHEELS</th>
            </tr>
            <tr>
              {Array(6).fill(0).map((_, i) => (
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
                  if (typeof cell === "string") display = cell;
                  else if (typeof cell === "object" && "value" in cell && "correct" in cell) {
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
                        const updatedValue = e.currentTarget.textContent?.trim() || "";
                        const newRows = rows.map((r, rowIdx) =>
                          rowIdx === i ? r.map((c, colIdx) => (colIdx === j ? updatedValue : c)) : r
                        );
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
        className="inline-block bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 px-6 rounded-lg shadow-lg cursor-pointer"
      >
        Copy
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-opacity-40 backdrop-blur-sm z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl relative">
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <img
                src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg"
                alt="Buy Me a Coffee"
                className="w-16 h-16"
              />
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold mb-3 text-gray-800">
              Subscription Required
            </h2>

            {/* Description */}
            <p className="text-gray-600 mb-6">
              You&apos;ve reached <span className="font-semibold text-yellow-500">100 copies</span> on this machine!
              Get <span className="font-semibold">unlimited access for 1 month</span> by subscribing below.
            </p>

            {/* Buttons */}
            <a
              href="https://buymeacoffee.com/kendrake"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 px-6 rounded-full shadow-lg transition-transform transform hover:scale-105 cursor-pointer"
            >
              ☕ Get 1-Month Subscription
            </a>
      {/* Close Button */}
      <button
        onClick={() => setShowModal(false)}
        className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 font-bold cursor-pointer"
      >
        ✕
      </button>

            {/* Small Note */}
            <p className="mt-4 text-xs text-gray-500">
              Your support keeps this service running ❤️
            </p>
          </div>
        </div>
      )}

      {toast && (
        <div
          key={toast.id}
          className="fixed top-6 left-1/2 -translate-x-1/2 bg-yellow-500 text-white font-semibold px-6 py-3 rounded-full shadow-xl flex items-center gap-2 z-50 transition-all duration-300 ease-in-out"
        >
          <Image
            src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg"
            alt="Coffee Icon"
            width={24}
            height={24}
            className="w-6 h-6"
          />
          <span>{toast.message}</span>
        </div>
      )}
<div className="fixed bottom-4 right-4 z-50">
  {subscription?.validUntil && new Date(subscription.validUntil) > new Date() ? (
    <div className="bg-green-200 text-green-800 px-4 py-2 rounded shadow-lg">
      ✅ Subscribed until {new Date(subscription.validUntil).toLocaleDateString()}
    </div>
  ) : (
    <button
      onClick={() => setShowSubscribeModal(true)}
      className="bg-yellow-200 text-yellow-800 px-4 py-2 rounded shadow-lg hover:bg-yellow-300 transition-colors cursor-pointer"
    >
      ⚠️ Free mode – subscribe to unlock unlimited copies
    </button>
  )}
</div>
{showSubscribeModal && (
  <div className="fixed inset-0 flex items-center justify-center bg-opacity-40 backdrop-blur-sm z-50">
    <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl relative">
      {/* Icon */}
      <div className="flex justify-center mb-4">
        <img
          src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg"
          alt="Buy Me a Coffee"
          className="w-16 h-16"
        />
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold mb-3 text-gray-800">
        Unlock Unlimited Copies
      </h2>

      {/* Description */}
      <p className="text-gray-600 mb-6">
        You are currently in <span className="font-semibold text-yellow-500">Free mode</span>.
        Get <span className="font-semibold">unlimited access for 1 month</span> by subscribing!
      </p>

      {/* Buttons */}
      <a
        href="https://buymeacoffee.com/kendrake"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 px-6 rounded-full shadow-lg transition-transform transform hover:scale-105 cursor-pointer"
      >
        ☕ Subscribe Now
      </a>

      {/* Close Button */}
      <button
        onClick={() => setShowSubscribeModal(false)}
        className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 font-bold cursor-pointer"
      >
        ✕
      </button>

      {/* Small Note */}
      <p className="mt-4 text-xs text-gray-500">
        Your support keeps this service running ❤️
      </p>
    </div>
  </div>
)}


    </div>
  );
}