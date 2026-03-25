import { useCallback, useRef } from "react";
import type { Receipt } from "../types/domain";

interface ParseResult {
    success: boolean;
    receipt?: Receipt;
    error?: string;
}

export function useReceiptParserWorker() {
    const workerRef = useRef<Worker | null>(null);

    // Inicializar worker sob demanda
    const getWorker = useCallback(() => {
        if (!workerRef.current) {
            workerRef.current = new Worker(
                new URL("../workers/receiptParser.worker.ts", import.meta.url),
                { type: "module" }
            );
        }
        return workerRef.current;
    }, []);

    // Parse de nota fiscal usando Web Worker
    const parse = useCallback((html: string, url: string): Promise<Receipt> => {
        return new Promise((resolve, reject) => {
            const worker = getWorker();

            const handleMessage = (e: MessageEvent<ParseResult>) => {
                worker.removeEventListener("message", handleMessage);
                worker.removeEventListener("error", handleError);

                if (e.data.success && e.data.receipt) {
                    resolve(e.data.receipt);
                } else {
                    reject(new Error(e.data.error || "Erro ao processar nota"));
                }
            };

            const handleError = (error: ErrorEvent) => {
                worker.removeEventListener("message", handleMessage);
                worker.removeEventListener("error", handleError);
                reject(new Error(error.message || "Erro no worker"));
            };

            worker.addEventListener("message", handleMessage);
            worker.addEventListener("error", handleError);

            worker.postMessage({ type: "parse", html, url });
        });
    }, [getWorker]);

    // Cleanup do worker
    const terminate = useCallback(() => {
        if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
        }
    }, []);

    return { parse, terminate };
}