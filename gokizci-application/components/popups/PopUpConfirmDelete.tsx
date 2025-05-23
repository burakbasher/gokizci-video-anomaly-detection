// components/popups/PopUpConfirmDelete.tsx
"use client";

import { AlertTriangle, X } from "lucide-react";

interface PopUpConfirmDeleteProps {
  itemType: string; // "kullanıcıyı" veya "cihazı" gibi
  itemName: string; // Silinecek öğenin adı
  onClose: () => void;
  onConfirm: () => Promise<void>; // Silme işlemini yapacak async fonksiyon
  isLoading?: boolean;
}

export function PopUpConfirmDelete({
  itemType,
  itemName,
  onClose,
  onConfirm,
  isLoading = false,
}: PopUpConfirmDeleteProps) {
  const handleConfirm = async () => {
    await onConfirm();
    // onClose(); // Silme işlemi başarılı olursa pop-up'ı kapatma işini onConfirm'e bırakabiliriz veya burada da çağırabiliriz.
                // Genellikle onConfirm içinde liste yenileme ve sonra onClose çağrılır.
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
      <div className="bg-background-surface p-6 rounded-lg shadow-xl w-full max-w-md transform transition-all">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-primary flex items-center">
            <AlertTriangle className="w-6 h-6 text-red-500 mr-2" />
            Silme Onayı
          </h3>
          <button
            onClick={onClose}
            className="text-primary-light hover:text-primary transition-colors"
            aria-label="Kapat"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <p className="text-primary mb-6">
          <span className="font-semibold">{itemName}</span> adlı {itemType} kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-primary bg-gray-200 hover:bg-gray-300 rounded-md transition-colors disabled:opacity-50"
          >
            İptal
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 disabled:bg-red-400 flex items-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Siliniyor...
              </>
            ) : (
              "Evet, Sil"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}