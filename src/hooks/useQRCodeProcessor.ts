import { useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { parseNFCeSP } from '../services/receiptParser';
import { useScannerStore } from '../stores/useScannerStore';
import type { Receipt } from '../types/domain';

type SaveReceiptResponse =
  | { duplicate: true; existingReceipt: Receipt }
  | { success: true; receipt: Receipt }
  | { success: false; error: unknown };

type SaveReceiptFn = (receipt: Receipt, forceReplace?: boolean) => Promise<SaveReceiptResponse>;

function isDuplicateResult(
  result: SaveReceiptResponse,
): result is { duplicate: true; existingReceipt: Receipt } {
  return 'duplicate' in result && result.duplicate === true;
}

function isSuccessResult(
  result: SaveReceiptResponse,
): result is { success: true; receipt: Receipt } {
  return 'success' in result && result.success === true;
}

/**
 * Hook para processamento de QR Code e URL de NFC-e
 */
export function useQRCodeProcessor(saveReceipt: SaveReceiptFn) {
  const setLoading = useScannerStore((state) => state.setLoading);
  const setCurrentReceipt = useScannerStore((state) => state.setCurrentReceipt);
  const setDuplicateReceipt = useScannerStore((state) => state.setDuplicateReceipt);
  const setError = useScannerStore((state) => state.setError);

  const processQRCode = useCallback(
    async (decodedText: string) => {
      if (import.meta.env.DEV) {
        console.log('📱 [QRProcessor] Processando QR Code:', decodedText.substring(0, 100) + '...');
      }

      setLoading(true);

      try {
        if (!decodedText || typeof decodedText !== 'string') {
          if (import.meta.env.DEV) {
            console.error('❌ [QRProcessor] Texto inválido:', decodedText);
          }
          throw new Error('Conteúdo do QR Code inválido.');
        }

        setError(null);

        // Verificar se é URL da NFC-e
        const isNfceUrl = decodedText.trim().includes('fazenda.sp.gov.br');

        if (import.meta.env.DEV) {
          console.log('📱 [QRProcessor] É URL NFC-e?', isNfceUrl);
        }

        if (isNfceUrl) {
          toast.loading('Buscando dados da NFC-e...', { duration: 2000 });
        }

        if (import.meta.env.DEV) {
          console.log('📱 [QRProcessor] Chamando parseNFCeSP...');
        }
        const extractedData = await parseNFCeSP(decodedText.trim());

        if (import.meta.env.DEV) {
          console.log('📱 [QRProcessor] Parse completado!', extractedData);
          console.log('📱 [QRProcessor] Itens extraídos:', extractedData.items.length);
          console.log('📱 [QRProcessor] Estabelecimento:', extractedData.establishment);
        }

        if (!extractedData || !extractedData.items || extractedData.items.length === 0) {
          if (import.meta.env.DEV) {
            console.error('❌ [QRProcessor] Nenhum item extraído');
          }
          const errorMsg = isNfceUrl
            ? 'Não foi possível ler os itens desta NFC-e.\n\nPossíveis causas:\n• NFC-e de outro estado (só SP suportado)\n• Proxy CORS indisponível\n• Nota muito antiga ou cancelada\n\nTente entrada manual.'
            : 'Não conseguimos ler os itens dessa nota. Verifique se o QR Code é de uma NFC-e válida.';

          toast.error(errorMsg, { duration: 10000 });
          setError('Falha ao extrair itens da nota.');
          return;
        }

        if (import.meta.env.DEV) {
          console.log('📱 [QRProcessor] Salvando receipt...');
        }

        const result = await saveReceipt(extractedData);

        if (import.meta.env.DEV) {
          console.log('📱 [QRProcessor] Result do save:', result);
        }

        if (isDuplicateResult(result)) {
          if (import.meta.env.DEV) {
            console.log('⚠️ [QRProcessor] Nota duplicada detectada');
          }
          setDuplicateReceipt(extractedData);
          toast(
            `Esta nota já está no seu histórico desde ${result.existingReceipt.date.split(' ')[0]}`,
            { icon: '⚠️' },
          );
        } else if (isSuccessResult(result)) {
          if (import.meta.env.DEV) {
            console.log('✅ [QRProcessor] Nota salva com sucesso!', result.receipt.id);
          }
          setCurrentReceipt(result.receipt);
          toast.success('Nota fiscal processada com sucesso!');
        }
      } catch (err: unknown) {
        if (import.meta.env.DEV) {
          console.error('❌ [QRProcessor] Erro:', err);
        }
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        toast.error(`Erro ao processar QR Code: ${errorMessage}`);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [saveReceipt, setLoading, setCurrentReceipt, setDuplicateReceipt, setError],
  );

  return {
    processQRCode,
  };
}
