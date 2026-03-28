import { toast } from "react-hot-toast";
import type { Receipt, ReceiptItem } from "../types/domain";

/**
 * Utilitários de backup e exportação de dados.
 */

const getIsoDate = () => new Date().toISOString().split("T")[0];

const downloadFile = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
};

/**
 * Exporta uma lista de notas fiscais para o formato CSV.
 */
export const exportToCSV = (items: Receipt[]) => {
  if (items.length === 0) {
    toast.error("Não há dados para exportar");
    return;
  }

  const headers = [
    "Data",
    "Mercado",
    "Produto",
    "Quantidade",
    "Unidade",
    "Preço Unitário",
    "Total",
  ];

  const rows = items.flatMap((receipt) =>
    (receipt.items || []).map((item: ReceiptItem) => [
      receipt.date,
      receipt.establishment,
      item.name,
      item.qty || "1",
      item.unit || "un",
      item.unitPrice || "0,00",
      item.total || "0,00",
    ]),
  );

  const csvContent = [
    headers.join(";"),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(";")),
  ].join("\n");

  downloadFile(csvContent, `my_mercado_${getIsoDate()}.csv`, "text/csv;charset=utf-8;");
  toast.success(`Planilha exportada com ${rows.length} itens!`);
};

/**
 * Gera um backup JSON dos dados das notas fiscais.
 */
export const backupToJSON = (receipts: Receipt[]) => {
  if (receipts.length === 0) {
    toast.error("Não há dados para backup");
    return;
  }

  const backupData = {
    version: "1.0",
    exportDate: new Date().toISOString(),
    totalReceipts: receipts.length,
    receipts,
  };

  const jsonString = JSON.stringify(backupData, null, 2);
  downloadFile(jsonString, `my_mercado_backup_${getIsoDate()}.json`, "application/json");
  toast.success(`Backup criado com ${receipts.length} notas!`);
};
